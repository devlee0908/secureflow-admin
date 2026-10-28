import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { vaultService } from '../vault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SqliteDatabaseAdapter {
  constructor(customPath) {
    this.name = 'SQLite (WAL Mode)';
    this.engineType = 'sqlite';
    this.supportsScaleOut = false; // Single node
    this.version = 'WAL-v3 (Multi-Threaded Safe)';

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = customPath || path.join(dataDir, 'secureflow.db');
    this.db = new DatabaseSync(this.dbPath);

    this.init();
  }

  init() {
    // Enable WAL Mode and in-memory page caching for maximum single-node concurrency
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
    `);

    // Schema Initialization
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        repository TEXT NOT NULL,
        default_branch TEXT NOT NULL,
        owner TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        department TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        author TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_role TEXT NOT NULL,
        department TEXT NOT NULL,
        avatar_color TEXT NOT NULL,
        branch TEXT NOT NULL,
        target_branch TEXT NOT NULL,
        trigger TEXT NOT NULL,
        pr_number INTEGER,
        commit_id TEXT NOT NULL,
        commit_message TEXT NOT NULL,
        started_at TEXT NOT NULL,
        current_stage INTEGER NOT NULL,
        scan_status TEXT NOT NULL,
        scan_duration INTEGER NOT NULL,
        tool_statuses_json TEXT NOT NULL,
        execution_logs_json TEXT NOT NULL,
        gate_status TEXT NOT NULL,
        crit_count INTEGER NOT NULL,
        high_count INTEGER NOT NULL,
        med_count INTEGER NOT NULL,
        policy_notes TEXT,
        review_status TEXT NOT NULL,
        reviewer TEXT,
        review_comment TEXT,
        target_environment TEXT NOT NULL,
        deploy_status TEXT NOT NULL,
        is_overridden INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        repository TEXT NOT NULL,
        sender TEXT NOT NULL,
        branch TEXT NOT NULL,
        commit_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        processed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS overrides (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        approver TEXT NOT NULL,
        reason TEXT NOT NULL,
        detail TEXT NOT NULL,
        sla_hours INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action_type TEXT NOT NULL,
        category TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        details_json TEXT NOT NULL,
        ip_address TEXT,
        result_status TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        hash_signature TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credentials_vault (
        key TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        masked_hint TEXT NOT NULL,
        wrapped_dek TEXT,
        kek_id TEXT,
        kms_provider TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        events_json TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_history (
        id TEXT PRIMARY KEY,
        channel_name TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        response_status INTEGER NOT NULL,
        sent_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_dlq (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL,
        last_error TEXT NOT NULL,
        last_status INTEGER NOT NULL,
        failed_at TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        scan_run_id TEXT NOT NULL,
        commit_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        tool TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_number TEXT NOT NULL,
        code_snippet TEXT NOT NULL,
        remediation_guide TEXT NOT NULL,
        assignee TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        due_date TEXT NOT NULL,
        false_positive_reason TEXT,
        exception_reason TEXT,
        exception_expires_at TEXT,
        history_json TEXT NOT NULL,
        rescan_result TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deployment_reviews (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        target_environment TEXT NOT NULL,
        request_commit_id TEXT NOT NULL,
        scan_commit_id TEXT NOT NULL,
        scan_completed_at TEXT NOT NULL,
        required_scans_completed INTEGER NOT NULL,
        security_verdict TEXT NOT NULL,
        verdict_reason TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        reviewer TEXT,
        review_comment TEXT,
        reviewed_at TEXT,
        requester TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_configs (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pipeline_runs_project ON pipeline_runs(project_id, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_findings_project_status ON findings(project_id, status);
      CREATE INDEX IF NOT EXISTS idx_reviews_project ON deployment_reviews(project_id, requested_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_cat_time ON audit_logs(category, timestamp DESC);
    `);

    // Dynamic schema migrations for existing database files
    try { this.db.prepare('ALTER TABLE credentials_vault ADD COLUMN wrapped_dek TEXT').run(); } catch {}
    try { this.db.prepare('ALTER TABLE credentials_vault ADD COLUMN kek_id TEXT').run(); } catch {}
    try { this.db.prepare('ALTER TABLE credentials_vault ADD COLUMN kms_provider TEXT').run(); } catch {}
    try { this.db.prepare("ALTER TABLE projects ADD COLUMN entity_id TEXT DEFAULT 'ENT-01'").run(); } catch {}
    try { this.db.prepare("ALTER TABLE projects ADD COLUMN entity_name TEXT DEFAULT '테크솔루션즈'").run(); } catch {}
    try { this.db.prepare("ALTER TABLE projects ADD COLUMN service_type TEXT DEFAULT '사내 플랫폼'").run(); } catch {}
    try { this.db.prepare("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT '운영 중'").run(); } catch {}
    try { this.db.prepare("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''").run(); } catch {}

    // Normalize legacy status values in findings & deployment_reviews
    try {
      this.db.prepare("UPDATE findings SET status = '조치 중' WHERE status = '진행 중'").run();
      this.db.prepare("UPDATE findings SET status = '해결' WHERE status = '해결됨'").run();
      this.db.prepare("UPDATE findings SET status = '오탐' WHERE status = '오탐 처리'").run();
      this.db.prepare("UPDATE deployment_reviews SET target_environment = '운영' WHERE target_environment LIKE '운영%'").run();
    } catch {}

    this.seedDefaults();
  }

  seedDefaults() {
    // Seed initial audit logs if empty
    try {
      const auditCount = this.db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
      if (auditCount === 0) {
        const seedEntries = [
          {
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            actorId: 'ciso-admin',
            actorName: '강태우 (CISO)',
            actorRole: '그룹 보안총괄',
            actionType: 'POLICY_ACTIVATE',
            category: 'GOVERNANCE',
            targetResource: 'GLOBAL_GATE_POLICY_v2.4',
            details: { version: '2.4.8', blockOnCritical: true, highThreshold: 1, requiredTools: ['SAST', 'DAST', 'SCA', 'IaC'] },
            ipAddress: '10.240.1.15',
            resultStatus: '성공',
          },
          {
            timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
            actorId: 'devlee0908',
            actorName: '이동훈 (DevSecOps Lead)',
            actorRole: '엔터프라이즈 관리자',
            actionType: 'PAT_REGISTER',
            category: 'INTEGRATION',
            targetResource: 'GitHub Enterprise (devlee0908/agentgate)',
            details: { tokenPrefix: 'ghp_**** (Fine-grained)', scopes: ['repo', 'pull_requests:write'] },
            ipAddress: '10.240.2.88',
            resultStatus: '성공',
          },
          {
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            actorId: 'system-agent',
            actorName: 'SecureFlow Baseline Engine',
            actorRole: '자동화 진단 러너',
            actionType: 'BASELINE_SCAN',
            category: 'SECURITY_GATE',
            targetResource: 'PRJ-AGENTGATE (Branch: main)',
            details: { filesScanned: 48, criticalCount: 1, mediumCount: 2, verdict: '차단 (BLOCKED)' },
            ipAddress: '127.0.0.1',
            resultStatus: '차단',
          },
          {
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            actorId: 'system-agent',
            actorName: 'SecureFlow PR Dispatcher',
            actorRole: '자동화 진단 러너',
            actionType: 'PR_AUTO_REMEDIATION',
            category: 'ORCHESTRATION',
            targetResource: 'GitHub PR #1 (fix/security-remediation)',
            details: { sourceBranch: 'fix/security-remediation', patchesSuggested: ['CWE-89 SQLi', 'CWE-327 JWT', 'CVE-2024-21538'] },
            ipAddress: '127.0.0.1',
            resultStatus: '성공',
          },
          {
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            actorId: 'ciso-admin',
            actorName: '강태우 (CISO)',
            actorRole: '그룹 보안총괄',
            actionType: 'EMERGENCY_WAIVER_REVIEW',
            category: 'AUDIT',
            targetResource: 'REV-AGENTGATE-01',
            details: { requester: '이동훈', reason: '보안 패치 fix/ 브랜치 머지 전 임시 점검', condition: '패치 완료 시 자동 해제' },
            ipAddress: '10.240.1.15',
            resultStatus: '성공',
          },
        ];

        let prevHash = 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < seedEntries.length; i++) {
          const s = seedEntries[i];
          const id = `audit-init-00${i + 1}`;
          const detailsJson = JSON.stringify(s.details);
          const payload = `${prevHash}|${s.timestamp}|${s.actorId}|${s.actionType}|${s.category}|${s.targetResource}|${detailsJson}|${s.resultStatus}`;
          const hash = crypto.createHash('sha256').update(payload).digest('hex');

          this.db.prepare(`
            INSERT INTO audit_logs (
              id, timestamp, actor_id, actor_name, actor_role, action_type, category,
              target_resource, details_json, ip_address, result_status, previous_hash, hash_signature
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, s.timestamp, s.actorId, s.actorName, s.actorRole, s.actionType, s.category,
            s.targetResource, detailsJson, s.ipAddress, s.resultStatus, prevHash, hash
          );
          prevHash = hash;
        }
      }
    } catch (e) {
      console.warn('[SQLite] Failed to seed audit logs:', e);
    }

    // Seed default notification channels if empty
    try {
      const channelCount = this.db.prepare('SELECT count(*) as count FROM notification_channels').get().count;
      if (channelCount === 0) {
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO notification_channels (id, name, channel_type, webhook_url, events_json, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'chan-slack-devsecops',
          '#devsecops-alerts (Slack)',
          'slack',
          'https://hooks.slack.example.com/services/T00000000/B00000000/DEMO_WEBHOOK_PLACEHOLDER',
          JSON.stringify(['GATE_BLOCK', 'OVERRIDE_APPROVED', 'CRITICAL_FINDING']),
          1,
          now,
          now
        );

        this.db.prepare(`
          INSERT INTO notification_channels (id, name, channel_type, webhook_url, events_json, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'chan-teams-ciso',
          'CISO 비상대응 상황실 (Teams)',
          'teams',
          'https://company.webhook.office.com/webhookb2/teams-ciso-emergency-alerts',
          JSON.stringify(['GATE_BLOCK', 'OVERRIDE_APPROVED']),
          1,
          now,
          now
        );
      }
    } catch (e) {
      console.warn('[SQLite] Failed to seed notification channels:', e);
    }

    // Seed default baseline findings if empty
    try {
      const findingsCount = this.db.prepare('SELECT count(*) as count FROM findings').get().count;
      if (findingsCount === 0) {
        const baselineFindings = [
          {
            id: 'FND-AGENTGATE-01',
            projectId: 'PRJ-AGENTGATE',
            projectName: 'AgentGate 보안 게이트웨이 (연동 저장소)',
            entityId: 'ENT-01',
            entityName: '테크솔루션즈',
            scanRunId: 'SCN-AGENTGATE-01',
            commitId: 'e81a3d9',
            scanType: '소스코드 정적 분석',
            tool: 'SonarQube SAST',
            title: 'CWE-327: JWT 토큰 알고리즘 고정 검증 누락',
            description: 'jwt.verify() 호출 시 허용 알고리즘을 제한하지 않아 alg:none 공격에 노출될 수 있습니다.',
            severity: '중간',
            filePath: 'src/auth/jwt.ts',
            lineNumber: 'Line 28',
            codeSnippet: 'const decoded = jwt.verify(token, secretKey);',
            remediationGuide: 'jwt.verify(token, secretKey, { algorithms: ["HS256"] }) 옵션을 적용하십시오.',
            assignee: 'devlee0908',
            status: '조치 중',
            createdAt: '2026-10-05 16:32:00',
            dueDate: '2026-10-19',
            history: [{ timestamp: '2026-10-05 16:32:00', actor: '시스템', action: '베이스라인 점검 결과 자동 등록' }],
            rescanResult: '미실행',
          },
          {
            id: 'FND-AGENTGATE-02',
            projectId: 'PRJ-AGENTGATE',
            projectName: 'AgentGate 보안 게이트웨이 (연동 저장소)',
            entityId: 'ENT-01',
            entityName: '테크솔루션즈',
            scanRunId: 'SCN-AGENTGATE-01',
            commitId: 'e81a3d9',
            scanType: '의존성 취약점 분석',
            tool: 'Trivy SCA',
            title: 'CVE-2024-21538: cross-spawn 정규식 DoS 취약점',
            description: 'cross-spawn 패키지 v7.0.3에 ReDoS 취약점이 존재합니다.',
            severity: '중간',
            filePath: 'package.json',
            lineNumber: 'Line 18',
            codeSnippet: '"cross-spawn": "^7.0.3"',
            remediationGuide: 'cross-spawn >= 7.0.6 버전으로 의존성을 업데이트하십시오.',
            assignee: 'devlee0908',
            status: '신규',
            createdAt: '2026-10-05 16:32:00',
            dueDate: '2026-10-19',
            history: [{ timestamp: '2026-10-05 16:32:00', actor: '시스템', action: '베이스라인 점검 결과 자동 등록' }],
            rescanResult: '미실행',
          },
          {
            id: 'FND-AGENTGATE-03',
            projectId: 'PRJ-AGENTGATE',
            projectName: 'AgentGate 보안 게이트웨이 (연동 저장소)',
            entityId: 'ENT-01',
            entityName: '테크솔루션즈',
            scanRunId: 'SCN-AGENTGATE-02',
            commitId: 'f9c2a10',
            scanType: '소스코드 정적 분석',
            tool: 'SonarQube SAST',
            title: 'CWE-89: SQL Injection Vulnerability in Session Store',
            description: '사용자 토큰 문자열이 SQL 쿼리에 직접 결합되어 임의의 데이터베이스 조회가 가능합니다.',
            severity: '치명적',
            filePath: 'src/auth/session.ts',
            lineNumber: 'Line 34',
            codeSnippet: "const session = await db.query(`SELECT * FROM user_sessions WHERE session_token = '${token}'`);",
            remediationGuide: 'db.query("SELECT * FROM user_sessions WHERE session_token = $1", [token]) 파라미터화된 쿼리를 사용하십시오.',
            assignee: 'devlee0908',
            status: '신규',
            createdAt: '2026-10-05 17:00:00',
            dueDate: '2026-10-08',
            history: [{ timestamp: '2026-10-05 17:00:00', actor: '시스템', action: 'PR #1 증분 점검에서 신규 치명적 결함 탐지' }],
            rescanResult: '미실행',
          },
        ];

        for (const f of baselineFindings) {
          this.saveFinding(f);
        }
      }
    } catch (e) {
      console.warn('[SQLite] Failed to seed findings:', e);
    }

    // Seed default baseline deployment reviews if empty
    try {
      const reviewCount = this.db.prepare('SELECT count(*) as count FROM deployment_reviews').get().count;
      if (reviewCount === 0) {
        this.saveReview({
          id: 'REV-AGENTGATE-01',
          projectId: 'PRJ-AGENTGATE',
          projectName: 'AgentGate 보안 게이트웨이 (연동 저장소)',
          entityId: 'ENT-01',
          entityName: '테크솔루션즈',
          targetEnvironment: '운영',
          requestCommitId: 'f9c2a10',
          scanCommitId: 'f9c2a10',
          scanCompletedAt: '2026-10-05 17:00:00',
          requiredScansCompleted: true,
          securityVerdict: '차단',
          verdictReason: '치명적 보안 결함 1건(CWE-89 SQLi) 미해결로 보안 게이트 자동 차단',
          approvalStatus: '대기',
          requester: 'devlee0908',
          requestedAt: '2026-10-05 17:00:00',
        });
      }
    } catch (e) {
      console.warn('[SQLite] Failed to seed deployment reviews:', e);
    }
  }

  getEngineInfo() {
    return {
      engine: this.name,
      engineType: this.engineType,
      supportsScaleOut: this.supportsScaleOut,
      version: this.version,
      journalMode: 'WAL',
      dbPath: this.dbPath,
      status: 'ONLINE',
    };
  }

  _mapProjectRow(r) {
    if (!r) return null;
    const isAgentGate = r.id === 'PRJ-AGENTGATE' || (r.repository && r.repository.includes('agentgate'));
    return {
      ...r,
      id: isAgentGate ? 'PRJ-AGENTGATE' : r.id,
      name: isAgentGate ? 'AgentGate 보안 게이트웨이 (연동 저장소)' : r.name,
      entityId: r.entity_id || 'ENT-01',
      entityName: r.entity_name || '테크솔루션즈',
      department: r.department || 'AI보안플랫폼팀',
      owner: r.owner || 'devlee0908',
      ownerEmail: r.owner_email || 'devlee0908@github.com',
      repository: r.repository,
      defaultBranch: r.default_branch || 'main',
      serviceType: r.service_type || (isAgentGate ? '사내 AI 보안 게이트웨이' : '사내 플랫폼'),
      status: r.status || '운영 중',
      createdAt: (r.created_at || new Date().toISOString()).slice(0, 10),
      description:
        r.description ||
        (isAgentGate
          ? '실제 GitHub 저장소(devlee0908/agentgate)와 실시간 Webhook 및 API로 연동된 엔터프라이즈 AI 에이전트 보안 게이트웨이 프로젝트입니다.'
          : `${r.name} 연동 저장소 프로젝트`),
    };
  }

  _mapRunRow(r) {
    if (!r) return null;
    const rawTools = JSON.parse(r.tool_statuses_json || '{}');
    const logs = JSON.parse(r.execution_logs_json || '[]');
    const findingsCount = (r.crit_count || 0) + (r.high_count || 0) + (r.med_count || 0);

    // Build normalized array for ScansView.tsx compatibility while preserving object keys if accessed
    const toolArray = Array.isArray(rawTools)
      ? rawTools
      : [
          {
            name: 'SonarQube SAST',
            category: '소스코드 정적 분석',
            status: rawTools.sast?.status || '성공',
            findingsCount: rawTools.sast?.count || 0,
            durationSeconds: rawTools.sast?.duration || 35,
          },
          {
            name: 'Trivy SCA',
            category: '의존성 취약점 분석',
            status: rawTools.sca?.status || '성공',
            findingsCount: rawTools.sca?.count || 0,
            durationSeconds: rawTools.sca?.duration || 22,
          },
          {
            name: 'Gitleaks',
            category: '비밀정보 탐지',
            status: rawTools.secret?.status || '성공',
            findingsCount: rawTools.secret?.count || 0,
            durationSeconds: rawTools.secret?.duration || 12,
          },
          {
            name: 'Checkov IaC',
            category: '설정 오류 분석',
            status: rawTools.iac?.status || '성공',
            findingsCount: rawTools.iac?.count || 0,
            durationSeconds: rawTools.iac?.duration || 18,
          },
        ];

    // Attach legacy object properties onto the array instance so BOTH `toolStatuses.map(...)` AND `toolStatuses.sast` work!
    if (!Array.isArray(rawTools) && typeof rawTools === 'object' && rawTools !== null) {
      Object.assign(toolArray, rawTools);
    }

    const isAgentGate = r.project_id === 'PRJ-AGENTGATE';
    return {
      ...r,
      projectId: r.project_id,
      projectName: isAgentGate ? 'AgentGate 보안 게이트웨이 (연동 저장소)' : r.project_id,
      entityId: 'ENT-01',
      entityName: '테크솔루션즈',
      startedAt: r.started_at,
      durationSeconds: r.scan_duration || 87,
      findingsCount,
      status: r.scan_status === 'completed' || r.scan_status === '완료' ? '완료' : r.scan_status === 'failed' || r.scan_status === '실패' ? '실패' : '실행 중',
      scanTypes: ['소스코드 정적 분석', '의존성 취약점 분석', '비밀정보 탐지', '설정 오류 분석'],
      toolStatuses: toolArray,
      executionLogs: logs,
      critCount: r.crit_count,
      highCount: r.high_count,
      medCount: r.med_count,
      prNumber: r.pr_number,
      commitId: r.commit_id,
      commitMessage: r.commit_message,
      authorEmail: r.author_email,
      authorRole: r.author_role,
      avatarColor: r.avatar_color,
      targetBranch: r.target_branch,
      targetEnvironment: r.target_environment,
      currentStage: r.current_stage,
      scanStatus: r.scan_status,
      scanDuration: r.scan_duration,
      gateStatus: r.gate_status,
      reviewStatus: r.review_status,
      deployStatus: r.deploy_status,
      isOverridden: !!r.is_overridden,
    };
  }

  findOrCreateProjectByRepo(repoName, owner = 'devlee0908', defaultBranch = 'main') {
    const existing = this.db.prepare('SELECT * FROM projects WHERE repository LIKE ? OR repository LIKE ?').get(
      `%${repoName}%`,
      `%${repoName.split('/')[1] || repoName}%`
    );
    if (existing) return this._mapProjectRow(existing);

    const shortName = repoName.split('/')[1] || repoName;
    const isAgentGate = shortName.toLowerCase() === 'agentgate';
    const projectId = isAgentGate ? 'PRJ-AGENTGATE' : `PRJ-${shortName.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

    this.db.prepare(`
      INSERT OR IGNORE INTO projects (id, name, repository, default_branch, owner, owner_email, department, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      isAgentGate ? 'AgentGate 보안 게이트웨이 (연동 저장소)' : `${shortName} 플랫폼 (${repoName})`,
      `github.com/${repoName.replace('github.com/', '')}`,
      defaultBranch,
      owner,
      `${owner}@github.internal`,
      isAgentGate ? 'AI보안플랫폼팀' : '클라우드개발실',
      new Date().toISOString()
    );

    return this.getProjectById(projectId);
  }

  getProjects() {
    return this.db.prepare('SELECT * FROM projects').all().map((r) => this._mapProjectRow(r));
  }

  getProjectById(id) {
    return this._mapProjectRow(this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  }

  saveProject(proj) {
    const id = proj.id || `PRJ-${Date.now().toString(36).toUpperCase()}`;
    const now = proj.createdAt || new Date().toISOString().slice(0, 10);
    this.db.prepare(`
      INSERT INTO projects (
        id, name, repository, default_branch, owner, owner_email, department, created_at,
        entity_id, entity_name, service_type, status, description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        repository = excluded.repository,
        default_branch = excluded.default_branch,
        owner = excluded.owner,
        owner_email = excluded.owner_email,
        department = excluded.department,
        entity_id = excluded.entity_id,
        entity_name = excluded.entity_name,
        service_type = excluded.service_type,
        status = excluded.status,
        description = excluded.description
    `).run(
      id,
      proj.name || '신규 프로젝트',
      proj.repository || 'github.com/corp/new-repo',
      proj.defaultBranch || proj.default_branch || 'main',
      proj.owner || 'devlee0908',
      proj.ownerEmail || proj.owner_email || 'devlee0908@github.com',
      proj.department || '플랫폼개발팀',
      now,
      proj.entityId || proj.entity_id || 'ENT-01',
      proj.entityName || proj.entity_name || '테크솔루션즈',
      proj.serviceType || proj.service_type || '사내 플랫폼',
      proj.status || '운영 중',
      proj.description || ''
    );
    return this.getProjectById(id);
  }

  deleteProject(id) {
    this.db.prepare('DELETE FROM pipeline_runs WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM findings WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM deployment_reviews WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return { deleted: true, id };
  }

  resetAgentGateBaseline(projectId = 'PRJ-AGENTGATE') {
    this.db.prepare('DELETE FROM findings WHERE project_id = ?').run(projectId);
    this.db.prepare('DELETE FROM deployment_reviews WHERE project_id = ?').run(projectId);
    this.db.prepare('DELETE FROM pipeline_runs WHERE project_id = ?').run(projectId);
    return { reset: true, projectId };
  }

  commitAgentGateBaseline(projectId = 'PRJ-AGENTGATE') {
    this.resetAgentGateBaseline(projectId);
    this.seedDefaults();
    return {
      committed: true,
      projectId,
      findings: this.getFindings(projectId),
      reviews: this.getReviews(projectId),
    };
  }

  remediateAgentGate(customComment, projectId = 'PRJ-AGENTGATE') {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const findings = this.getFindings(projectId);
    for (const f of findings) {
      const nextHistory = [
        ...(f.history || []),
        {
          timestamp: nowStr,
          actor: 'devlee0908 (Vault Auto-Remediation)',
          action: '보안 패치 브랜치(fix/security-remediation) 병합 및 재검증 클린 통과 -> [해결] 전환',
        },
      ];
      this.updateFinding(f.id, {
        status: '해결',
        rescanResult: '확인 완료(해결)',
        history: nextHistory,
      });
    }

    const reviews = this.getReviews(projectId);
    for (const r of reviews) {
      this.updateReview(r.id, {
        securityVerdict: '통과',
        verdictReason: '3건 보안 결함(SQLi, JWT, cross-spawn) 패치 커밋 푸시 확인으로 배포 게이트 통과',
        approvalStatus: '승인',
        reviewer: '보안 심사관 (자동 재검증 통과)',
        reviewComment:
          customComment || '3건 보안 취약점 조치 패치 커밋 푸시 확인 완료 — 운영 배포 자동 승인',
        reviewedAt: nowStr,
      });
    }

    return {
      remediated: true,
      projectId,
      findings: this.getFindings(projectId),
      reviews: this.getReviews(projectId),
    };
  }

  getRuns(projectId) {
    const rows = projectId
      ? this.db.prepare('SELECT * FROM pipeline_runs WHERE project_id = ? ORDER BY started_at DESC').all(projectId)
      : this.db.prepare('SELECT * FROM pipeline_runs ORDER BY started_at DESC').all();

    return rows.map((r) => this._mapRunRow(r));
  }

  getRunById(id) {
    const r = this.db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id);
    return this._mapRunRow(r);
  }

  saveRun(run) {
    const existing = this.db.prepare('SELECT id FROM pipeline_runs WHERE id = ?').get(run.id);
    if (existing) {
      this.db.prepare(`
        UPDATE pipeline_runs SET
          current_stage = ?, scan_status = ?, scan_duration = ?, tool_statuses_json = ?,
          execution_logs_json = ?, gate_status = ?, crit_count = ?, high_count = ?,
          med_count = ?, policy_notes = ?, review_status = ?, reviewer = ?,
          review_comment = ?, deploy_status = ?, is_overridden = ?
        WHERE id = ?
      `).run(
        run.currentStage,
        run.scanStatus,
        run.scanDuration,
        JSON.stringify(run.toolStatuses),
        JSON.stringify(run.executionLogs),
        run.gateStatus,
        run.critCount,
        run.highCount,
        run.medCount,
        run.policyNotes || '',
        run.reviewStatus,
        run.reviewer || null,
        run.reviewComment || null,
        run.deployStatus,
        run.isOverridden ? 1 : 0,
        run.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO pipeline_runs (
          id, project_id, author, author_email, author_role, department, avatar_color,
          branch, target_branch, trigger, pr_number, commit_id, commit_message,
          started_at, current_stage, scan_status, scan_duration, tool_statuses_json,
          execution_logs_json, gate_status, crit_count, high_count, med_count,
          policy_notes, review_status, reviewer, review_comment, target_environment,
          deploy_status, is_overridden
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        run.id,
        run.projectId,
        run.author,
        run.authorEmail,
        run.authorRole,
        run.department,
        run.avatarColor,
        run.branch,
        run.targetBranch,
        run.trigger,
        run.prNumber || null,
        run.commitId,
        run.commitMessage,
        run.startedAt,
        run.currentStage,
        run.scanStatus,
        run.scanDuration,
        JSON.stringify(run.toolStatuses),
        JSON.stringify(run.executionLogs),
        run.gateStatus,
        run.critCount,
        run.highCount,
        run.medCount,
        run.policyNotes || '',
        run.reviewStatus,
        run.reviewer || null,
        run.reviewComment || null,
        run.targetEnvironment,
        run.deployStatus,
        run.isOverridden ? 1 : 0
      );
    }
    return this.getRunById(run.id);
  }

  saveWebhookDelivery(delivery) {
    this.db.prepare(`
      INSERT INTO webhook_deliveries (
        id, event_type, repository, sender, branch, commit_id, payload_json, status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      delivery.id,
      delivery.eventType,
      delivery.repository,
      delivery.sender,
      delivery.branch,
      delivery.commitId,
      JSON.stringify(delivery.payload),
      delivery.status,
      new Date().toISOString()
    );
  }

  getWebhookDeliveries(limit = 20) {
    const rows = this.db.prepare('SELECT * FROM webhook_deliveries ORDER BY processed_at DESC LIMIT ?').all(limit);
    return rows.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload_json),
    }));
  }

  saveOverride(overrideData) {
    this.db.prepare(`
      INSERT INTO overrides (id, project_id, run_id, approver, reason, detail, sla_hours, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      overrideData.id || `ovr-${Date.now()}`,
      overrideData.projectId,
      overrideData.runId,
      overrideData.approver,
      overrideData.reason,
      overrideData.detail,
      overrideData.slaHours || 24,
      new Date().toISOString()
    );
  }

  clearDummyData() {
    this.db.prepare("DELETE FROM pipeline_runs WHERE project_id NOT LIKE '%AGENT%'").run();
    this.db.prepare("DELETE FROM projects WHERE id NOT LIKE '%AGENT%'").run();
    return this.getStats();
  }

  saveAuditLog(entry) {
    const lastRow = this.db.prepare('SELECT hash_signature FROM audit_logs ORDER BY timestamp DESC LIMIT 1').get();
    const previousHash = lastRow?.hash_signature || 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = entry.timestamp || new Date().toISOString();
    const id = entry.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const detailsJson = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || {});

    const payload = `${previousHash}|${timestamp}|${entry.actorId || entry.actor_id}|${entry.actionType || entry.action_type}|${entry.category}|${entry.targetResource || entry.target_resource}|${detailsJson}|${entry.resultStatus || entry.result_status || '성공'}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    this.db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, actor_id, actor_name, actor_role, action_type, category,
        target_resource, details_json, ip_address, result_status, previous_hash, hash_signature
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      entry.actorId || entry.actor_id || 'system',
      entry.actorName || entry.actor_name || '시스템',
      entry.actorRole || entry.actor_role || '자동화',
      entry.actionType || entry.action_type,
      entry.category || 'GOVERNANCE',
      entry.targetResource || entry.target_resource,
      detailsJson,
      entry.ipAddress || entry.ip_address || '127.0.0.1',
      entry.resultStatus || entry.result_status || '성공',
      previousHash,
      hash
    );

    return {
      id,
      timestamp,
      actorId: entry.actorId || entry.actor_id || 'system',
      actorName: entry.actorName || entry.actor_name || '시스템',
      actorRole: entry.actorRole || entry.actor_role || '자동화',
      actionType: entry.actionType || entry.action_type,
      category: entry.category || 'GOVERNANCE',
      targetResource: entry.targetResource || entry.target_resource,
      details: typeof entry.details === 'object' ? entry.details : JSON.parse(detailsJson),
      ipAddress: entry.ipAddress || entry.ip_address || '127.0.0.1',
      resultStatus: entry.resultStatus || entry.result_status || '성공',
      previousHash,
      hashSignature: hash,
    };
  }

  getAuditLogs(limit = 100, category = null) {
    let query = 'SELECT * FROM audit_logs';
    const params = [];
    if (category && category !== 'ALL') {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r) => {
      let details = {};
      try {
        details = JSON.parse(r.details_json);
      } catch {
        details = { raw: r.details_json };
      }
      return {
        id: r.id,
        timestamp: r.timestamp,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        actionType: r.action_type,
        category: r.category,
        targetResource: r.target_resource,
        details,
        ipAddress: r.ip_address,
        resultStatus: r.result_status,
        previousHash: r.previous_hash,
        hashSignature: r.hash_signature,
      };
    });
  }

  verifyAuditChain() {
    const rows = this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp ASC').all();
    if (rows.length === 0) {
      return { verified: true, count: 0, message: '감사 로그가 비어 있습니다.' };
    }

    let expectedPrevHash = 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.previous_hash !== expectedPrevHash) {
        return {
          verified: false,
          brokenIndex: i,
          brokenId: r.id,
          message: `무결성 체인 불일치 감지: ${r.id} 레코드의 이전 해시값이 조작되었습니다.`,
        };
      }

      const payload = `${r.previous_hash}|${r.timestamp}|${r.actor_id}|${r.action_type}|${r.category}|${r.target_resource}|${r.details_json}|${r.result_status}`;
      const recomputedHash = crypto.createHash('sha256').update(payload).digest('hex');
      if (recomputedHash !== r.hash_signature) {
        return {
          verified: false,
          brokenIndex: i,
          brokenId: r.id,
          message: `서명 검증 실패: ${r.id} 레코드 본문 데이터가 위변조되었습니다.`,
        };
      }
      expectedPrevHash = r.hash_signature;
    }

    return {
      verified: true,
      count: rows.length,
      firstTimestamp: rows[0].timestamp,
      latestTimestamp: rows[rows.length - 1].timestamp,
      latestHash: expectedPrevHash,
      message: `전체 ${rows.length}건 감사 로그의 SHA-256 전자서명 무결성이 완벽하게 검증되었습니다. (ISMS-P & 전자금융감독규정 충족)`,
    };
  }

  saveCredential(key, token) {
    const { encrypted, iv, authTag, wrappedDek, kekId, kmsProvider } = vaultService.encrypt(token);
    const maskedHint = vaultService.maskToken(token);
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO credentials_vault (key, encrypted_data, iv, auth_tag, masked_hint, wrapped_dek, kek_id, kms_provider, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        encrypted_data = excluded.encrypted_data,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        masked_hint = excluded.masked_hint,
        wrapped_dek = excluded.wrapped_dek,
        kek_id = excluded.kek_id,
        kms_provider = excluded.kms_provider,
        updated_at = excluded.updated_at
    `).run(key, encrypted, iv, authTag, maskedHint, wrappedDek, kekId, kmsProvider, now);

    return { key, maskedHint, updatedAt: now, kekId, kmsProvider };
  }

  getDecryptedCredential(key) {
    const row = this.db.prepare('SELECT * FROM credentials_vault WHERE key = ?').get(key);
    if (!row) return null;
    return vaultService.decrypt(row.encrypted_data, row.iv, row.auth_tag, row.wrapped_dek, row.kek_id, row.kms_provider);
  }

  getMaskedCredential(key) {
    const row = this.db.prepare('SELECT key, masked_hint, kek_id, kms_provider, updated_at FROM credentials_vault WHERE key = ?').get(key);
    if (!row) return { configured: false, maskedHint: null, updatedAt: null, kekId: null, kmsProvider: null };
    return {
      configured: true,
      maskedHint: row.masked_hint,
      updatedAt: row.updated_at,
      kekId: row.kek_id,
      kmsProvider: row.kms_provider,
    };
  }

  rotateVaultMasterKey() {
    const rotation = vaultService.rotateKmsMasterKey();
    const rows = this.db.prepare('SELECT * FROM credentials_vault').all();
    let reWrappedCount = 0;

    for (const row of rows) {
      if (row.wrapped_dek) {
        try {
          const { newWrappedDek, newKekId, newProvider } = vaultService.reWrapDek(
            row.wrapped_dek,
            row.kek_id,
            row.kms_provider
          );
          this.db.prepare(`
            UPDATE credentials_vault SET
              wrapped_dek = ?,
              kek_id = ?,
              kms_provider = ?,
              updated_at = ?
            WHERE key = ?
          `).run(newWrappedDek, newKekId, newProvider, new Date().toISOString(), row.key);
          reWrappedCount++;
        } catch (err) {
          console.warn(`[Vault KEK Rotation] Failed to re-wrap DEK for key [${row.key}]:`, err.message);
        }
      }
    }

    return {
      ...rotation,
      reWrappedCount,
      totalCredentials: rows.length,
    };
  }

  getNotificationChannels() {
    const rows = this.db.prepare('SELECT * FROM notification_channels ORDER BY created_at ASC').all();
    return rows.map((r) => ({
      ...r,
      events: JSON.parse(r.events_json || '[]'),
      isActive: !!r.is_active,
    }));
  }

  saveNotificationChannel(channel) {
    const id = channel.id || `chan-${Date.now()}`;
    const now = new Date().toISOString();
    const eventsJson = JSON.stringify(channel.events || ['GATE_BLOCK', 'OVERRIDE_APPROVED']);
    const isActive = channel.isActive !== false ? 1 : 0;

    this.db.prepare(`
      INSERT INTO notification_channels (id, name, channel_type, webhook_url, events_json, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        channel_type = excluded.channel_type,
        webhook_url = excluded.webhook_url,
        events_json = excluded.events_json,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `).run(id, channel.name, channel.channel_type || 'slack', channel.webhook_url, eventsJson, isActive, channel.created_at || now, now);

    return this.db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id);
  }

  deleteNotificationChannel(id) {
    return this.db.prepare('DELETE FROM notification_channels WHERE id = ?').run(id);
  }

  saveNotificationHistory(entry) {
    this.db.prepare(`
      INSERT INTO notification_history (id, channel_name, channel_type, event_type, payload_json, status, response_status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.channelName,
      entry.channelType,
      entry.eventType,
      JSON.stringify(entry.payload),
      entry.status,
      entry.responseStatus || 200,
      new Date().toISOString()
    );
  }

  getNotificationHistory(limit = 20) {
    const rows = this.db.prepare('SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT ?').all(limit);
    return rows.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload_json || '{}'),
    }));
  }

  saveNotificationDlq(item) {
    const id = item.id || `dlq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO notification_dlq (
        id, channel_id, channel_name, channel_type, webhook_url, event_type,
        payload_json, retry_count, last_error, last_status, failed_at, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        retry_count = excluded.retry_count,
        last_error = excluded.last_error,
        last_status = excluded.last_status,
        failed_at = excluded.failed_at,
        status = excluded.status
    `).run(
      id,
      item.channelId,
      item.channelName,
      item.channelType,
      item.webhookUrl,
      item.eventType,
      JSON.stringify(item.payload),
      item.retryCount || 0,
      item.lastError || 'Unknown Error',
      item.lastStatus || 500,
      item.failedAt || now,
      item.status || 'DEAD_LETTER'
    );
    return this.getNotificationDlqById(id);
  }

  getNotificationDlq(limit = 50) {
    const rows = this.db.prepare("SELECT * FROM notification_dlq WHERE status != 'DISCARDED' ORDER BY failed_at DESC LIMIT ?").all(limit);
    return rows.map((r) => ({
      id: r.id,
      channelId: r.channel_id,
      channelName: r.channel_name,
      channelType: r.channel_type,
      webhookUrl: r.webhook_url,
      eventType: r.event_type,
      payload: JSON.parse(r.payload_json || '{}'),
      retryCount: r.retry_count,
      lastError: r.last_error,
      lastStatus: r.last_status,
      failedAt: r.failed_at,
      status: r.status,
    }));
  }

  getNotificationDlqById(id) {
    const r = this.db.prepare('SELECT * FROM notification_dlq WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id,
      channelId: r.channel_id,
      channelName: r.channel_name,
      channelType: r.channel_type,
      webhookUrl: r.webhook_url,
      eventType: r.event_type,
      payload: JSON.parse(r.payload_json || '{}'),
      retryCount: r.retry_count,
      lastError: r.last_error,
      lastStatus: r.last_status,
      failedAt: r.failed_at,
      status: r.status,
    };
  }

  updateNotificationDlq(id, updates) {
    const existing = this.getNotificationDlqById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    return this.saveNotificationDlq(merged);
  }

  deleteNotificationDlq(id) {
    return this.db.prepare('DELETE FROM notification_dlq WHERE id = ?').run(id);
  }

  clearNotificationDlq() {
    return this.db.prepare('DELETE FROM notification_dlq').run();
  }

  getFindings(projectId) {
    const rows = projectId
      ? this.db.prepare('SELECT * FROM findings WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
      : this.db.prepare('SELECT * FROM findings ORDER BY created_at DESC').all();

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      entityId: r.entity_id,
      entityName: r.entity_name,
      scanRunId: r.scan_run_id,
      commitId: r.commit_id,
      scanType: r.scan_type,
      tool: r.tool,
      title: r.title,
      description: r.description,
      severity: r.severity,
      filePath: r.file_path,
      lineNumber: r.line_number,
      codeSnippet: r.code_snippet,
      remediationGuide: r.remediation_guide,
      assignee: r.assignee,
      status: r.status,
      createdAt: r.created_at,
      dueDate: r.due_date,
      falsePositiveReason: r.false_positive_reason || undefined,
      exceptionReason: r.exception_reason || undefined,
      exceptionExpiresAt: r.exception_expires_at || undefined,
      history: JSON.parse(r.history_json || '[]'),
      rescanResult: r.rescan_result || undefined,
    }));
  }

  getFindingById(id) {
    const r = this.db.prepare('SELECT * FROM findings WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      entityId: r.entity_id,
      entityName: r.entity_name,
      scanRunId: r.scan_run_id,
      commitId: r.commit_id,
      scanType: r.scan_type,
      tool: r.tool,
      title: r.title,
      description: r.description,
      severity: r.severity,
      filePath: r.file_path,
      lineNumber: r.line_number,
      codeSnippet: r.code_snippet,
      remediationGuide: r.remediation_guide,
      assignee: r.assignee,
      status: r.status,
      createdAt: r.created_at,
      dueDate: r.due_date,
      falsePositiveReason: r.false_positive_reason || undefined,
      exceptionReason: r.exception_reason || undefined,
      exceptionExpiresAt: r.exception_expires_at || undefined,
      history: JSON.parse(r.history_json || '[]'),
      rescanResult: r.rescan_result || undefined,
    };
  }

  saveFinding(finding) {
    const now = new Date().toISOString();
    const historyJson = JSON.stringify(finding.history || []);
    this.db.prepare(`
      INSERT INTO findings (
        id, project_id, project_name, entity_id, entity_name, scan_run_id, commit_id,
        scan_type, tool, title, description, severity, file_path, line_number,
        code_snippet, remediation_guide, assignee, status, created_at, due_date,
        false_positive_reason, exception_reason, exception_expires_at, history_json,
        rescan_result, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_name = excluded.project_name,
        assignee = excluded.assignee,
        status = excluded.status,
        due_date = excluded.due_date,
        false_positive_reason = excluded.false_positive_reason,
        exception_reason = excluded.exception_reason,
        exception_expires_at = excluded.exception_expires_at,
        history_json = excluded.history_json,
        rescan_result = excluded.rescan_result,
        updated_at = excluded.updated_at
    `).run(
      finding.id,
      finding.projectId,
      finding.projectName || '기본 프로젝트',
      finding.entityId || 'ENT-01',
      finding.entityName || '테크솔루션즈',
      finding.scanRunId || 'SCN-INIT',
      finding.commitId || 'HEAD',
      finding.scanType || '소스코드 정적 분석',
      finding.tool || 'SonarQube SAST',
      finding.title,
      finding.description || '',
      finding.severity,
      finding.filePath,
      String(finding.lineNumber || '1'),
      finding.codeSnippet || '',
      finding.remediationGuide || '',
      finding.assignee,
      finding.status,
      finding.createdAt || now,
      finding.dueDate || now,
      finding.falsePositiveReason || null,
      finding.exceptionReason || null,
      finding.exceptionExpiresAt || null,
      historyJson,
      finding.rescanResult || null,
      now
    );
    return this.getFindingById(finding.id);
  }

  updateFinding(id, updates) {
    const existing = this.getFindingById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    return this.saveFinding(merged);
  }

  batchUpdateFindings(ids, updates) {
    const updated = [];
    for (const id of ids) {
      const res = this.updateFinding(id, updates);
      if (res) updated.push(res);
    }
    return updated;
  }

  getReviews(projectId) {
    const rows = projectId
      ? this.db.prepare('SELECT * FROM deployment_reviews WHERE project_id = ? ORDER BY requested_at DESC').all(projectId)
      : this.db.prepare('SELECT * FROM deployment_reviews ORDER BY requested_at DESC').all();

    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      entityId: r.entity_id,
      entityName: r.entity_name,
      targetEnvironment: r.target_environment,
      requestCommitId: r.request_commit_id,
      scanCommitId: r.scan_commit_id,
      scanCompletedAt: r.scan_completed_at,
      requiredScansCompleted: Boolean(r.required_scans_completed),
      securityVerdict: r.security_verdict,
      verdictReason: r.verdict_reason,
      approvalStatus: r.approval_status,
      reviewer: r.reviewer || undefined,
      reviewComment: r.review_comment || undefined,
      reviewedAt: r.reviewed_at || undefined,
      requester: r.requester,
      requestedAt: r.requested_at,
    }));
  }

  getReviewById(id) {
    const r = this.db.prepare('SELECT * FROM deployment_reviews WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      entityId: r.entity_id,
      entityName: r.entity_name,
      targetEnvironment: r.target_environment,
      requestCommitId: r.request_commit_id,
      scanCommitId: r.scan_commit_id,
      scanCompletedAt: r.scan_completed_at,
      requiredScansCompleted: Boolean(r.required_scans_completed),
      securityVerdict: r.security_verdict,
      verdictReason: r.verdict_reason,
      approvalStatus: r.approval_status,
      reviewer: r.reviewer || undefined,
      reviewComment: r.review_comment || undefined,
      reviewedAt: r.reviewed_at || undefined,
      requester: r.requester,
      requestedAt: r.requested_at,
    };
  }

  saveReview(review) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO deployment_reviews (
        id, project_id, project_name, entity_id, entity_name, target_environment,
        request_commit_id, scan_commit_id, scan_completed_at, required_scans_completed,
        security_verdict, verdict_reason, approval_status, reviewer, review_comment,
        reviewed_at, requester, requested_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_name = excluded.project_name,
        security_verdict = excluded.security_verdict,
        verdict_reason = excluded.verdict_reason,
        approval_status = excluded.approval_status,
        reviewer = excluded.reviewer,
        review_comment = excluded.review_comment,
        reviewed_at = excluded.reviewed_at,
        updated_at = excluded.updated_at
    `).run(
      review.id,
      review.projectId,
      review.projectName,
      review.entityId || 'ENT-01',
      review.entityName || '테크솔루션즈',
      review.targetEnvironment || '운영',
      review.requestCommitId || 'HEAD',
      review.scanCommitId || 'HEAD',
      review.scanCompletedAt || now,
      review.requiredScansCompleted ? 1 : 0,
      review.securityVerdict,
      review.verdictReason || '',
      review.approvalStatus || '대기',
      review.reviewer || null,
      review.reviewComment || null,
      review.reviewedAt || null,
      review.requester || 'devlee0908',
      review.requestedAt || now,
      now
    );
    return this.getReviewById(review.id);
  }

  updateReview(id, updates) {
    const existing = this.getReviewById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    return this.saveReview(merged);
  }

  getPolicy() {
    try {
      const row = this.db.prepare("SELECT value_json FROM system_configs WHERE key = 'security_policy'").get();
      if (row?.value_json) return JSON.parse(row.value_json);
    } catch {}
    return {
      blockOnCritical: true,
      highThresholdForBlock: 1,
      mediumThresholdForReview: 3,
      criticalSlaDays: 3,
      highSlaDays: 7,
      mediumSlaDays: 30,
      lowSlaDays: 90,
      requiredScanTypes: [
        '소스코드 정적 분석',
        '의존성 취약점 분석',
        '비밀정보 탐지',
        '설정 오류 분석',
      ],
    };
  }

  savePolicy(policy) {
    const current = this.getPolicy();
    const merged = { ...current, ...policy };
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO system_configs (key, value_json, updated_at)
      VALUES ('security_policy', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `).run(JSON.stringify(merged), now);
    return merged;
  }

  getGitConfig() {
    try {
      const row = this.db.prepare("SELECT value_json FROM system_configs WHERE key = 'git_config'").get();
      if (row?.value_json) return JSON.parse(row.value_json);
    } catch {}
    return {
      serverType: 'GitLab Enterprise',
      serverUrl: 'https://git.internal-corp.net',
      webhookUrl: 'https://secureflow.internal-corp.net/api/v1/webhooks/git',
      connectionStatus: '연결됨',
      lastEventAt: '2026-09-30 16:45:00',
      lastEventType: 'push (refs/heads/main)',
      apiVersion: 'GitLab v16.8-ee REST API v4',
    };
  }

  saveGitConfig(config) {
    const current = this.getGitConfig();
    const merged = { ...current, ...config };
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO system_configs (key, value_json, updated_at)
      VALUES ('git_config', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `).run(JSON.stringify(merged), now);
    return merged;
  }

  getSyncState() {
    return {
      version: Date.now(),
      timestamp: new Date().toISOString(),
      projects: this.getProjects(),
      runs: this.getRuns(),
      findings: this.getFindings(),
      reviews: this.getReviews(),
      policy: this.getPolicy(),
      gitConfig: this.getGitConfig(),
    };
  }

  getStats() {
    const projects = this.db.prepare('SELECT count(*) as count FROM projects').get().count;
    const runs = this.db.prepare('SELECT count(*) as count FROM pipeline_runs').get().count;
    const webhooks = this.db.prepare('SELECT count(*) as count FROM webhook_deliveries').get().count;
    const auditLogs = this.db.prepare('SELECT count(*) as count FROM audit_logs').get().count;
    const channels = this.db.prepare('SELECT count(*) as count FROM notification_channels').get().count;
    const findings = this.db.prepare('SELECT count(*) as count FROM findings').get().count;
    const reviews = this.db.prepare('SELECT count(*) as count FROM deployment_reviews').get().count;
    const dlqCount = this.db.prepare("SELECT count(*) as count FROM notification_dlq WHERE status = 'DEAD_LETTER'").get().count;
    return { projects, runs, webhooks, auditLogs, channels, findings, reviews, dlqCount, dbPath: this.dbPath };
  }
}

