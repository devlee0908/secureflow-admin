import { Worker } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateGitEvent as evaluateGitEventInline } from '../engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_SCRIPT = path.join(__dirname, 'scanWorker.js');

/**
 * SecureFlow Enterprise Scanner Worker Pool
 * Isolates heavy static analysis scans from the Node.js event loop.
 */
export class ScannerWorkerPool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || Math.max(2, Math.min(os.cpus().length, 4));
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map(); // jobId -> { workerEntry, resolve, reject, timer }
    this.isDegraded = false;

    this.stats = {
      totalDispatched: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      poolSize: this.poolSize,
    };

    this.init();
  }

  init() {
    try {
      for (let i = 0; i < this.poolSize; i++) {
        this.spawnWorker(i + 1);
      }
    } catch (err) {
      console.warn('[ScannerWorkerPool] Worker threads initialization failed, switching to inline fallback:', err);
      this.isDegraded = true;
    }
  }

  spawnWorker(id) {
    try {
      const worker = new Worker(WORKER_SCRIPT);
      const workerEntry = {
        id,
        worker,
        isBusy: false,
        currentJobId: null,
      };

      worker.on('message', (result) => {
        this.handleWorkerResult(workerEntry, result);
      });

      worker.on('error', (err) => {
        console.error(`[ScannerWorkerPool] Worker #${id} runtime error:`, err);
        this.handleWorkerCrash(workerEntry, err);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !workerEntry.isExiting) {
          console.warn(`[ScannerWorkerPool] Worker #${id} exited unexpectedly with code ${code}, respawning...`);
          this.removeWorker(workerEntry);
          this.spawnWorker(id);
        }
      });

      this.workers.push(workerEntry);
    } catch (err) {
      console.warn(`[ScannerWorkerPool] Failed to spawn worker #${id}:`, err);
      this.isDegraded = true;
    }
  }

  handleWorkerResult(workerEntry, result) {
    const { jobId, success, run, metrics, error } = result;
    const active = this.activeJobs.get(jobId);
    if (!active) return;

    clearTimeout(active.timer);
    this.activeJobs.delete(jobId);

    workerEntry.isBusy = false;
    workerEntry.currentJobId = null;

    if (success) {
      this.stats.totalCompleted += 1;
      const duration = metrics?.executionDurationMs || 0;
      this.stats.totalDurationMs += duration;
      this.stats.avgDurationMs = Math.round(this.stats.totalDurationMs / this.stats.totalCompleted);
      active.resolve({ run, metrics });
    } else {
      this.stats.totalFailed += 1;
      active.reject(new Error(error || 'Worker scan failed'));
    }

    this.processQueue();
  }

  handleWorkerCrash(workerEntry, err) {
    if (workerEntry.currentJobId) {
      const active = this.activeJobs.get(workerEntry.currentJobId);
      if (active) {
        clearTimeout(active.timer);
        this.activeJobs.delete(workerEntry.currentJobId);
        this.stats.totalFailed += 1;
        active.reject(new Error(`Worker thread crashed: ${err.message}`));
      }
    }
    workerEntry.isBusy = false;
    workerEntry.currentJobId = null;
    this.processQueue();
  }

  removeWorker(workerEntry) {
    workerEntry.isExiting = true;
    try {
      workerEntry.worker.terminate();
    } catch {}
    this.workers = this.workers.filter((w) => w !== workerEntry);
  }

  /**
   * Dispatch a security scan task to the worker pool.
   * Returns a Promise that resolves with the evaluated run and execution metrics.
   */
  dispatch(eventData, timeoutMs = 15000) {
    this.stats.totalDispatched += 1;

    // Fallback to inline sync execution if pool is degraded or unavailable
    if (this.isDegraded || this.workers.length === 0) {
      const t0 = performance.now();
      const run = evaluateGitEventInline(eventData);
      const executionDurationMs = Math.round(performance.now() - t0);
      this.stats.totalCompleted += 1;
      return Promise.resolve({
        run,
        metrics: {
          workerId: 'inline-main',
          executionDurationMs,
          filesScannedCount: eventData.filesChanged?.length || 1,
          rulesEvaluatedCount: 42,
        },
      });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return new Promise((resolve, reject) => {
      this.queue.push({
        jobId,
        eventData,
        timeoutMs,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });

      this.processQueue();
    });
  }

  processQueue() {
    if (this.queue.length === 0) return;

    // Find first idle worker
    const idleWorker = this.workers.find((w) => !w.isBusy);
    if (!idleWorker) return;

    const task = this.queue.shift();
    if (!task) return;

    const { jobId, eventData, timeoutMs, resolve, reject } = task;

    idleWorker.isBusy = true;
    idleWorker.currentJobId = jobId;

    // Guard against runaway worker hangs
    const timer = setTimeout(() => {
      console.warn(`[ScannerWorkerPool] Task ${jobId} timed out after ${timeoutMs}ms, terminating worker #${idleWorker.id}`);
      this.activeJobs.delete(jobId);
      this.removeWorker(idleWorker);
      this.spawnWorker(idleWorker.id);
      this.stats.totalFailed += 1;
      reject(new Error(`Security scan timed out after ${timeoutMs}ms`));
      this.processQueue();
    }, timeoutMs);

    this.activeJobs.set(jobId, { workerEntry: idleWorker, resolve, reject, timer });

    idleWorker.worker.postMessage({
      jobId,
      eventData,
    });
  }

  getStats() {
    const activeWorkers = this.workers.filter((w) => w.isBusy).length;
    const idleWorkers = this.workers.length - activeWorkers;

    return {
      poolSize: this.workers.length,
      activeWorkers,
      idleWorkers,
      queueDepth: this.queue.length,
      totalDispatched: this.stats.totalDispatched,
      totalCompleted: this.stats.totalCompleted,
      totalFailed: this.stats.totalFailed,
      avgDurationMs: this.stats.avgDurationMs,
      isDegraded: this.isDegraded,
      architecture: 'Isolated node:worker_threads Pool',
    };
  }

  terminate() {
    for (const entry of this.workers) {
      entry.isExiting = true;
      try {
        entry.worker.terminate();
      } catch {}
    }
    this.workers = [];
  }
}

// Export singleton instance
export const scannerPool = new ScannerWorkerPool();
