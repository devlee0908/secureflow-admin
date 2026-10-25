import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '@/types';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  ArrowRight,
  RotateCcw,
  Sparkles,
  X,
  Loader2,
  GitPullRequest,
  GitBranch,
  FolderGit2,
  Copy,
  Check,
  FileCode,
  Layers,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BaselineOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onOpenPrChecks: () => void;
  onNavigateToReviews?: () => void;
}

export const BaselineOnboardingWizardModal: React.FC<BaselineOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  project,
  onOpenPrChecks,
  onNavigateToReviews,
}) => {
  const { commitBaselineScan } = useDevSecOps();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const tools = [
    {
      id: 'gitleaks',
      name: 'Gitleaks (Secret)',
      desc: 'Git 전체 커밋 히스토리 내 API 키 및 비밀정보 누출 탐지',
      fileCount: '48개 소스 파일',
      result: '0건 누출 (Clean Pass)',
      status: 'clean',
    },
    {
      id: 'sast',
      name: 'SonarQube / Semgrep (SAST)',
      desc: 'TypeScript 소스코드 정적 취약점 분석 (CWE 기준)',
      fileCount: '48개 소스 파일',
      result: '1건 치명적 (SQLi) / 1건 중간 (JWT)',
      status: 'error',
    },
    {
      id: 'sca',
      name: 'Trivy (SCA)',
      desc: 'package-lock.json 오픈소스 패키지 취약점 및 라이선스 점검',
      fileCount: '182개 npm 패키지',
      result: '1건 중간(Medium) 결함 (cross-spawn CVE-2024-21538)',
      status: 'warn',
    },
    {
      id: 'iac',
      name: 'Checkov (IaC / Dockerfile)',
      desc: '클라우드 인프라 및 컨테이너 보안 설정 오류 분석',
      fileCount: 'Dockerfile & Config',
      result: '1건 설정 권고 (Dockerfile root 권한)',
      status: 'clean',
    },
  ];

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle modal open: initialize logs if fresh
  useEffect(() => {
    if (isOpen) {
      if (logs.length === 0) {
        setLogs([
          `[16:30:00] [SYSTEM] 온보딩 마법사 초기화 완료: ${project.name} (${project.repository})`,
          `[16:30:00] [READY] 최초 전체 베이스라인 스캔 대기 중... 아래 [점검 개시] 버튼을 눌러 실행하십시오.`,
        ]);
      }
    }
  }, [isOpen, project.name, project.repository, logs.length]);

  if (!isOpen) return null;

  const handleStartFullScan = () => {
    setIsScanning(true);
    setScanProgress(5);
    setCurrentToolIndex(0);
    setActiveStep(1);

    const now = new Date().toLocaleTimeString();
    setLogs([
      `[${now}] [INIT] 🚀 devlee0908/agentgate 전체 소스코드 최초 베이스라인 풀 스캔 개시`,
      `[${now}] [CLONE] main 브랜치 전체 워킹 트리 체크아웃 (@e81a3d9, 48개 소스 파일)`,
      `[${now}] [RUNNER] 4대 보안 점검 컨테이너 워커(SAST, SCA, Secret, IaC) 병렬 기동`,
    ]);

    // Step 1: Secret Scan
    setTimeout(() => {
      setScanProgress(25);
      setCurrentToolIndex(1);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SECRET] 🔑 Gitleaks 실행: 전체 48개 소스 파일 및 git log 히스토리 스캔`,
        `[${new Date().toLocaleTimeString()}] [SECRET] ✅ 하드코딩된 AWS/API 키 및 개인정보 누출 0건 (Clean Pass)`,
      ]);
    }, 1200);

    // Step 2: SAST Scan
    setTimeout(() => {
      setScanProgress(55);
      setCurrentToolIndex(2);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SAST] 🔍 SonarQube & Semgrep 정적 분석 실행 (TypeScript AST 파싱)`,
        `[${new Date().toLocaleTimeString()}] [SAST] 🚨 [치명적/Critical] CWE-89 SQL Injection 결함 탐지: src/auth/session.ts:34`,
        `[${new Date().toLocaleTimeString()}] [SAST] ⚠️ [중간/Medium] CWE-327 JWT 알고리즘 설정 누락 탐지: src/auth/jwt.ts:28`,
      ]);
    }, 2400);

    // Step 3: SCA Scan
    setTimeout(() => {
      setScanProgress(80);
      setCurrentToolIndex(3);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [SCA] 📦 Trivy 의존성 분석 실행: package-lock.json 182개 패키지 트리 검사`,
        `[${new Date().toLocaleTimeString()}] [SCA] ⚠️ [중간/Medium] CVE-2024-21538 의존성 취약점 탐지: cross-spawn v7.0.3 (package.json:18)`,
      ]);
    }, 3600);

    // Step 4: IaC Scan & Completion
    setTimeout(async () => {
      setScanProgress(100);
      setIsScanning(false);
      setActiveStep(2); // Automatically advance to Step 2 (Baseline Confirmed)
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [IaC] 🐳 Checkov 컨테이너 분석 실행: Dockerfile 및 K8s 매니페스트 점검`,
        `[${new Date().toLocaleTimeString()}] [IaC] ℹ️ 1건 설정 권고: Dockerfile:14 (Non-root user 설정 권장)`,
        `[${new Date().toLocaleTimeString()}] [BASE] 📊 전체 분석 결과 집계 완료: 총 48개 파일 검사, 치명적 1건 / 중간 2건 탐지`,
        `[${new Date().toLocaleTimeString()}] [ALERT] 🚨 소스코드 취약점 3건 탐지 -> 자동 조치 에러 PR 생성!`,
        `[${new Date().toLocaleTimeString()}] [PR_CREATE] 🚀 보안 에러 PR #1 (fix/security-remediation -> main) 자동 발행 완료`,
        `[${new Date().toLocaleTimeString()}] [GATE] 🛡️ 배포 심사 게이트(Deployment Gate)로 결함 리포트 연동 (SQL Injection으로 인한 반려 대기)`,
      ]);
      await commitBaselineScan(project.id);
      toast.success(`${project.name} 전체 소스코드 점검 완료: 3건 결함 탐지 및 보안 에러 PR이 생성되었습니다!`);
    }, 4800);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('터미널 로그가 클립보드에 복사되었습니다.');
  };

  const handleProceedToPrChecks = () => {
    onClose();
    onOpenPrChecks();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-100 to-indigo-50/40 dark:from-[#111622] dark:to-[#0f1424] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  최초 전체 소스코드 점검 &amp; PR 게이트 연계 온보딩 마법사
                </h2>
                <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-mono">
                  {project.repository}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                신규 연동 저장소의 전체 코드를 먼저 점검하여 베이스라인을 수립하고, 이후 PR 증분(Delta) 검증으로 연계하는 표준 엔터프라이즈 플로우입니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Wizard Progress Stepper Header */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-[#0a0d14] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all',
                activeStep === 1
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]'
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>1단계: 전체 소스코드 풀 스캔</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all',
                activeStep === 2
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]'
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>2단계: 취약점(3건) 탐지 &amp; 에러 PR 발행</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all',
                activeStep === 3
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]'
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                3
              </span>
              <span>3단계: 신규 PR 증분(Delta) 검증</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              진행 상태: {isScanning ? `${scanProgress}% 스캔 중...` : activeStep === 2 ? '기준점 수립 완료' : '준비 완료'}
            </span>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Progress bar (when scanning) */}
          {isScanning && (
            <div className="space-y-1.5 animate-in fade-in">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  전체 소스코드(48개 파일) 전수 점검 중...
                </span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 1: Scan Execution Panel & 4 Engines Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Layers className="w-4 h-4 text-indigo-500" />
                4대 점검 엔진 분석 파이프라인
              </h3>
              {!isScanning && (
                <Button
                  size="sm"
                  onClick={handleStartFullScan}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-sm"
                >
                  {logs.length > 2 ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{logs.length > 2 ? '전체 점검 다시 실행' : '전체 소스코드 점검 시작'}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tools.map((t, idx) => {
                const isCurrentlyActive = isScanning && currentToolIndex === idx;
                const isDone = (!isScanning && scanProgress === 100) || (isScanning && currentToolIndex > idx);

                return (
                  <div
                    key={t.id}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all text-xs flex flex-col justify-between space-y-2',
                      isCurrentlyActive
                        ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                        : isDone
                        ? 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]'
                        : 'border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] opacity-70'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[11px] text-slate-900 dark:text-slate-100">
                          {t.name}
                        </span>
                        {isCurrentlyActive ? (
                          <Badge className="bg-indigo-500 text-white text-[9px] animate-pulse">
                            분석 중...
                          </Badge>
                        ) : isDone ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] font-mono',
                              t.status === 'clean'
                                ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50'
                                : 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50/50'
                            )}
                          >
                            {t.status === 'clean' ? '통과' : '경고 1건'}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">대기</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] text-[10px] font-mono text-slate-400">
                      <span>대상: {t.fileCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Runner Terminal Window */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 shadow-xl overflow-hidden font-mono text-xs">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  실시간 분석 러너 콘솔 (CI/CD Telemetry)
                </span>
                <span className="text-[10px] text-slate-500">|</span>
                <span className="text-[10px] text-indigo-400 font-bold">@e81a3d9 (main)</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLogs}
                className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? '복사됨' : '로그 복사'}</span>
              </Button>
            </div>

            <div className="p-4 max-h-48 overflow-y-auto space-y-1 text-[11px] leading-relaxed scrollbar-thin">
              {logs.map((log, idx) => {
                let colorClass = 'text-slate-300';
                if (log.includes('[ERROR]')) colorClass = 'text-rose-400 font-bold';
                else if (log.includes('[WARN]')) colorClass = 'text-amber-300';
                else if (log.includes('[SECRET]')) colorClass = 'text-cyan-300';
                else if (log.includes('[COMPLETE]')) colorClass = 'text-emerald-400 font-bold';
                else if (log.includes('[INIT]') || log.includes('[CLONE]')) colorClass = 'text-indigo-300';

                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-600 select-none w-6 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <span className={colorClass}>{log}</span>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Step 2: Baseline Summary Card & Debt Isolation Callout (Visible upon completion) */}
          {scanProgress === 100 && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/70 via-white to-amber-50/60 dark:from-[#180f14] dark:via-[#0c121c] dark:to-[#1a1410] border-2 border-rose-400 dark:border-rose-600/60 shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
                    3건
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        전체 소스코드 점검 완료 — 보안 취약점 3건 탐지 (에러 PR 생성)
                      </h4>
                      <Badge className="bg-rose-600 text-white text-[10px]">
                        에러 PR #1 생성됨
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      치명적 결함(SQL Injection) 1건 및 중간 결함 2건이 탐지되어, 개발자 조치 가이드와 함께 GitHub 보안 에러 PR이 생성되었습니다.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={handleProceedToPrChecks}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 px-3.5 py-2 font-bold shadow-md animate-pulse"
                    title="탐지된 보안 결함 3건이 반영된 GitHub 에러 PR 화면을 확인합니다"
                  >
                    <GitPullRequest className="w-4 h-4" />
                    <span>🚨 GitHub 에러 PR 화면 열기 (3건)</span>
                  </Button>

                  {onNavigateToReviews && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onNavigateToReviews();
                      }}
                      className="border-slate-300 dark:border-white/[0.12] text-slate-700 dark:text-slate-200 text-xs gap-1.5 px-3 py-2 font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                      title="SecureFlow 보안 관리자 화면의 배포 게이트 심사 목록으로 이동합니다"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>[관리자 뷰] 배포 게이트 심사 이동</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Detected 3 issues quick pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-400">src/auth/session.ts:34</span>
                    <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0">치명적</Badge>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] mt-1 font-sans">
                    CWE-89: SQL Injection (배포 차단 원인)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400">src/auth/jwt.ts:28</span>
                    <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0">중간</Badge>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] mt-1 font-sans">
                    CWE-327: JWT algorithms 옵션 미지정
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400">package.json:18</span>
                    <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0">중간</Badge>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] mt-1 font-sans">
                    CVE-2024-21538: cross-spawn ReDoS
                  </span>
                </div>
              </div>

              {/* Debt Isolation Explanation Card */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    🛡️ 점검 에러 PR 및 배포 심사 게이트 연동 안내
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    탐지된 결함에 대한 조치 패치 제안이 <strong>GitHub PR #1 (fix/security-remediation)</strong>에 즉시 게시되었습니다.
                    치명적 결함(SQL Injection)은 배포 게이트에서 <strong>자동 반려(Changes Requested)</strong> 처리되며, 개발자가 PR에서 추천된 보안 코드로 수정 후 커밋을 푸시하면 게이트가 통과됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-[#111622] border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            SecureFlow Brownfield Baseline Engine v2.4.8
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              닫기
            </Button>
            {scanProgress === 100 && (
              <Button
                size="sm"
                onClick={handleProceedToPrChecks}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5 h-8"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>점검 에러 PR 확인 및 조치</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
