import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Mail,
  GitPullRequest,
  GitBranch,
  GitCommit,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Code2,
  RefreshCw,
  Cpu,
  Layers,
  Server,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DeveloperWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  author: string;
  authorEmail: string;
  department: string;
  branch: string;
  commitId: string;
  critCount: number;
  onStartFixFlow?: () => void;
}

export const DeveloperWorkflowModal: React.FC<DeveloperWorkflowModalProps> = ({
  isOpen,
  onClose,
  author,
  authorEmail,
  department,
  branch,
  commitId,
  critCount,
  onStartFixFlow,
}) => {
  const [activeTab, setActiveTab] = useState<'deliver' | 'assignee' | 'push' | 'main'>('deliver');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border-b border-indigo-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  보안 오류 발생 시 담당자 전달 ➔ 조치 ➔ 푸시 ➔ 플랫폼 반영 워크플로우
                </h3>
                <Badge variant="outline" className="text-[10px] border-indigo-500 text-indigo-300 font-mono">
                  End-to-End
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                현업 DevSecOps 표준: Slack/Teams 없이도 완벽한 사내 인앱·Git PR·이메일 전달 및 브랜치 라이프사이클
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('deliver')}
            className={cn(
              'pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0',
              activeTab === 'deliver'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">1</span>
            📢 1. 담당자에게 오류 전달
          </button>
          <button
            onClick={() => setActiveTab('assignee')}
            className={cn(
              'pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0',
              activeTab === 'assignee'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">2</span>
            💻 2. 담당자 로컬 조치 진행
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={cn(
              'pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0',
              activeTab === 'push'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">3</span>
            🔄 3. 푸시 감지 & 화면 반영
          </button>
          <button
            onClick={() => setActiveTab('main')}
            className={cn(
              'pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0',
              activeTab === 'main'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">4</span>
            🚀 4. main 머지 & 재점검 배포
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: 전달 메커니즘 */}
          {activeTab === 'deliver' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">작업 담당자 자동 지정 (Git Author Mapping)</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/60 text-emerald-400">
                    자동 매핑 완료
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">담당자</span>
                    <strong className="text-white">👤 {author}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">소속 부서</span>
                    <strong className="text-slate-200">{department}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">사내 이메일</span>
                    <strong className="text-indigo-300 font-mono text-[10px]">{authorEmail}</strong>
                  </div>
                </div>
              </div>

              {/* 3대 비-메신저 전달 채널 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. In-App Alert Center */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-900/60 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      ① 플랫폼 인앱 알림 & 티켓
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      플랫폼 로그인 시 상단 알림 벨과 대시보드에 긴급 조치 티켓(<code>#SEC-2026-891</code>)이 생성되고 배지 카운트가 즉시 표시됩니다.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-indigo-950/40 border border-indigo-800/50 text-[10px] text-indigo-200 font-mono">
                    🚨 [차단] {branch} 치명적 결함 {critCount}건 탐지 (SLA: 24h)
                  </div>
                </div>

                {/* 2. Git PR Bot Comment */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-900/60 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <GitPullRequest className="w-4 h-4 text-cyan-400" />
                      ② Git PR 인라인 봇 코멘트
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      GitHub/GitLab PR 화면에 <strong>SecureFlow Security Bot</strong>이 취약점 라인과 함께 수정 코드 diff 가이드를 자동으로 등록합니다.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/50 text-[10px] text-cyan-200 font-mono">
                    🤖 Bot: Line 12 AWS Key 노출 ➔ git-filter-repo 실행 권고
                  </div>
                </div>

                {/* 3. Internal SMTP Email */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-900/60 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Mail className="w-4 h-4 text-amber-400" />
                      ③ 사내 SMTP 이메일 발송
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      사내 메일 서버를 통해 담당자 메일함으로 결함 분석 요약서 및 조치 가이드 링크가 자동 전송됩니다. (Slack/Teams 불필요)
                    </p>
                  </div>
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-800/50 text-[10px] text-amber-200 font-mono truncate">
                    To: {authorEmail} [보안 긴급] 배포 차단 통보
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 담당자 로컬 조치 진행 */}
          {activeTab === 'assignee' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  담당자 로컬 환경 실무 조치 순서 (3단계)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  담당자는 알림을 수신한 후, 기존 차단된 브랜치를 억지로 밀지 않고 아래와 같이 <strong>fix/ 브랜치를 체크아웃</strong>하여 결함을 패치합니다.
                </p>
              </div>

              <div className="space-y-2.5 font-mono text-[11px]">
                {/* Step 1 Terminal */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-sans font-semibold flex items-center justify-between text-[11px]">
                    <span>1. 조치 전용 fix/ 브랜치 생성 및 체크아웃</span>
                    <Badge variant="outline" className="text-[9px] font-mono text-indigo-300">Terminal</Badge>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 text-indigo-300 overflow-x-auto text-[10.5px]">
{`# 차단된 ${branch} 기준으로 fix 브랜치 생성
git checkout -b fix/revoke-leaked-secret`}
                  </pre>
                </div>

                {/* Step 2 Code Patch */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-sans font-semibold flex items-center justify-between text-[11px]">
                    <span>2. 결함 제거 및 시큐어 코딩 / 키 무효화 적용</span>
                    <Badge variant="outline" className="text-[9px] font-mono text-emerald-300">Code Diff</Badge>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 text-emerald-300 overflow-x-auto text-[10.5px]">
{`// src/config/auth.key (하드코딩 키 파일 영구 삭제 및 환경변수 주입)
- const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
+ const AWS_KEY = process.env.AWS_SECRET_ACCESS_KEY;`}
                  </pre>
                </div>

                {/* Step 3 Commit & Push */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 font-sans font-semibold flex items-center justify-between text-[11px]">
                    <span>3. 조치 커밋 작성 및 원격 저장소 푸시</span>
                    <Badge variant="outline" className="text-[9px] font-mono text-cyan-300">Push Event</Badge>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 text-cyan-300 overflow-x-auto text-[10.5px]">
{`git commit -m "fix(security): AWS Access Key 무효화 및 환경변수 분리"
git push origin fix/revoke-leaked-secret`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 푸시 감지 및 플랫폼 화면 반영 */}
          {activeTab === 'push' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  플랫폼의 푸시 Webhook 수신 및 화면 자동 반영 과정
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  담당자가 <code>fix/</code> 브랜치를 푸시하는 순간, 플랫폼의 Webhook 수신 러너가 이벤트를 0.2초 내로 감지하여 화면을 실시간 업데이트합니다.
                </p>
              </div>

              {/* Status Transition Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-1.5">
                  <Badge variant="destructive" className="text-[10px]">이전 상태</Badge>
                  <div className="font-bold text-rose-300 text-xs">🛑 정책 차단 (Blocked)</div>
                  <div className="text-[10px] text-slate-400">{branch} 결함 1건</div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60 space-y-1.5">
                  <Badge variant="outline" className="text-[10px] border-indigo-500 text-indigo-300 animate-pulse">실시간 수신</Badge>
                  <div className="font-bold text-indigo-200 text-xs">⚡ fix/ 파이프라인 기동</div>
                  <div className="text-[10px] text-slate-300">4대 점검 엔진 병렬 재스캔</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 space-y-1.5">
                  <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-300">결과 반영</Badge>
                  <div className="font-bold text-emerald-300 text-xs">✅ 0 defects 클린 통과</div>
                  <div className="text-[10px] text-slate-300">3단계 게이트 Pass 전환</div>
                </div>
              </div>

              {/* Visualizing UI Changes */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                <span className="font-bold text-slate-300 block">플랫폼 UI 화면에서 보여지는 변화:</span>
                <ul className="space-y-1 text-slate-400 list-disc list-inside leading-relaxed font-sans">
                  <li><strong>상단 브랜치 드롭다운</strong>: 담당자({author}) 밑에 <code>fix/revoke-leaked-secret</code> 런이 자동 등록</li>
                  <li><strong>알림 센터 티켓</strong>: <code>[차단]</code> ➔ <code>[검증 완료 - PR 머지 대기]</code> 상태로 실시간 전환</li>
                  <li><strong>캔버스 케이블</strong>: 차단된 빨간 점선이 녹색 스트림 실선으로 변하며 심사 및 머지 단계로 개통</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: main 머지 및 재점검 배포 */}
          {activeTab === 'main' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-2">
                <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  사용자 제안 핵심: Feature ➔ Fix 완료 ➔ main 재점검 ➔ 최종 배포
                </span>
                <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                  <code>fix/</code> 브랜치에서 결함이 해결되어 PR이 승인되면, <strong>main 브랜치로 코드가 병합(Merge)</strong>되고 
                  <strong>main 브랜치의 통합 빌드 & 최종 보안 재점검 노드가 가동</strong>되어 무결점 검증 후 운영 K8s 클러스터로 배포됩니다.
                </p>
              </div>

              {/* Full Lifecycle Diagram */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300 font-sans">브랜치 라이프사이클 흐름</span>
                  <span className="text-[10px]">Git Flow Governance</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 font-bold text-rose-400">1. feature/</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="p-1.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 flex-1 truncate">
                      소스 푸시 ➔ 보안점검 ➔ 🛑 3단계 정책 게이트 차단 발생
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pl-6">
                    <span className="w-24 shrink-0 font-bold text-emerald-400">2. fix/ 분기</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex-1 truncate">
                      수정 브랜치 분기 ➔ 4대 점검 재실행 ➔ 0 defects 클린 통과 ➔ PR 승인
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pl-12">
                    <span className="w-24 shrink-0 font-bold text-indigo-400">3. main 배포</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="p-1.5 rounded bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 flex-1 truncate">
                      main 머지 ➔ 🛡️ main 통합 무결점 재점검 ➔ 🌐 운영 K8s 롤링 배포 성공!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            담당자: <strong className="text-slate-300">👤 {author}</strong> ({department})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs h-8 text-slate-400 hover:text-white"
            >
              닫기
            </Button>
            {onStartFixFlow && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onStartFixFlow();
                }}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-950"
              >
                <GitBranch className="w-3.5 h-3.5" />
                지금 즉시 fix/ 브랜치로 조치 및 재점검 실행
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
