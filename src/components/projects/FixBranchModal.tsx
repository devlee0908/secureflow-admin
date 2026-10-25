import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, GitPullRequest, GitCommit, CheckCircle2, X, ShieldCheck, ArrowRight, Sparkles, Code2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export interface FixBranchData {
  branchName: string;
  commitMessage: string;
  prTitle: string;
  targetBranch: string;
}

interface FixBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFix: (data: FixBranchData) => void;
  projectName: string;
  currentBranch: string;
  targetBranch: string;
  author: string;
  department: string;
  critCount: number;
  highCount: number;
  issueType?: 'secret' | 'iac' | 'sast' | 'general';
}

export const FixBranchModal: React.FC<FixBranchModalProps> = ({
  isOpen,
  onClose,
  onCreateFix,
  projectName,
  currentBranch,
  targetBranch,
  author,
  department,
  critCount,
  highCount,
  issueType = 'general',
}) => {
  // Generate smart default fix branch name based on issue type and base branch
  const generateDefaults = () => {
    const cleanBase = currentBranch.replace(/^(feature\/|chore\/|bug\/|fix\/)/, '');
    let prefix = 'fix';
    let summary = 'security-patch';

    if (issueType === 'secret') {
      prefix = 'fix';
      summary = 'revoke-leaked-secret';
    } else if (issueType === 'iac') {
      prefix = 'fix';
      summary = 'terraform-s3-private-acl';
    } else if (issueType === 'sast') {
      prefix = 'fix';
      summary = 'param-query-sqli-patch';
    } else {
      summary = `resolve-${cleanBase}`;
    }

    const branchName = `${prefix}/${summary}`;
    const commitMessage = `fix(security): ${cleanBase} 보안 정책 위반 결함 조치 및 시큐어 코딩 적용`;
    const prTitle = `[Fix] ${currentBranch} 보안 취약점 조치 및 검증 통과 요청`;

    return { branchName, commitMessage, prTitle };
  };

  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      const defaults = generateDefaults();
      setBranchName(defaults.branchName);
      setCommitMessage(defaults.commitMessage);
      setPrTitle(defaults.prTitle);
    }
  }, [isOpen, currentBranch, issueType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    onCreateFix({
      branchName: branchName.trim(),
      commitMessage: commitMessage.trim() || `fix(security): resolve security gate issues on ${currentBranch}`,
      prTitle: prTitle.trim() || `[Fix] Security resolution for ${currentBranch}`,
      targetBranch: targetBranch || 'main',
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-b border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                조치 브랜치(fix/) 생성 및 재검증 PR
                <Badge variant="outline" className="text-[10px] border-emerald-500/60 text-emerald-300 bg-emerald-950/60 font-mono">
                  Git Flow 표준
                </Badge>
              </h3>
              <p className="text-xs text-emerald-300/80 font-mono">
                Standard DevSecOps Remediation Workflow
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Best Practice Info Banner */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-emerald-200 text-xs">실무 개발 및 보안 거버넌스 표준 워크플로우</div>
              <p className="text-[11px] text-emerald-300/90 leading-relaxed font-sans">
                보안 게이트에서 차단된 브랜치를 직접 수정하거나 무리하게 우회하지 않고, 
                <strong><code>fix/</code> 브랜치를 체크아웃</strong>하여 결함을 패치한 뒤 신규 PR을 발행하여 
                파이프라인의 4대 보안점검을 클린 통과(0 defects)시키는 정석 프로세스입니다.
              </p>
            </div>
          </div>

          {/* Current Blocked Context Preview */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>작업 대상 프로젝트:</span>
              <strong className="text-white font-mono">{projectName}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>담당 개발자:</span>
              <span className="text-slate-200">👤 {author} ({department})</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>현재 차단 브랜치 (Source):</span>
              <span className="font-mono text-rose-400 font-bold bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/50">
                🛑 {currentBranch} ({critCount > 0 ? `치명적 ${critCount}건` : `높음 ${highCount}건`})
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Fix Branch Name Input */}
            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  생성할 조치 브랜치명 (Fix Branch)
                </span>
                <span className="text-[10px] text-slate-500 font-normal font-mono">
                  기준: {targetBranch}
                </span>
              </Label>
              <div className="relative">
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="fix/security-patch-..."
                  className="bg-slate-950 border-slate-700 text-xs font-mono text-emerald-300 pl-3 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Commit Message */}
            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                보안 조치 커밋 메시지 (Remediation Commit)
              </Label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="fix(security): resolve policy gate findings"
                className="bg-slate-950 border-slate-700 text-xs font-mono text-slate-200 focus:border-indigo-500"
                required
              />
            </div>

            {/* PR Title */}
            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                Pull Request 제목 (재검증 심사용)
              </Label>
              <Input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="[Fix] 보안 정책 위반 결함 조치"
                className="bg-slate-950 border-slate-700 text-xs text-slate-200 focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Workflow Diagram */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-2.5">
            <span className="text-rose-400 font-bold truncate max-w-[140px]">{currentBranch}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-emerald-400 font-bold truncate max-w-[170px]">{branchName || 'fix/...'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-indigo-300 font-bold truncate max-w-[120px]">{targetBranch} (배포)</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs h-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-lg shadow-emerald-950"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              fix/ 브랜치 생성 및 재검증 파이프라인 시작
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
