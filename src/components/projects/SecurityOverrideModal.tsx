import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertTriangle, CheckCircle2, X, Lock, KeyRound, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SecurityOverrideData {
  reason: string;
  detail: string;
  approver: string;
  slaHours: number;
}

interface SecurityOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (data: SecurityOverrideData) => void;
  projectName: string;
  branch: string;
  critCount: number;
  highCount: number;
}

export const SecurityOverrideModal: React.FC<SecurityOverrideModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  projectName,
  branch,
  critCount,
  highCount,
}) => {
  const [reasonCategory, setReasonCategory] = useState<string>('P0_HOTFIX');
  const [detail, setDetail] = useState<string>('서비스 장애 긴급 복구를 위해 핫픽스를 배포하며, 결함은 24시간 이내 패치 완료 예정.');
  const [approver, setApprover] = useState<string>('CISO 김철수 상무');
  const [acknowledged, setAcknowledged] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) return;

    const reasonLabelMap: Record<string, string> = {
      P0_HOTFIX: '서비스 장애 긴급 핫픽스 (P0 Incident)',
      REGULATORY: '대외 금융/감독 규제 마감 기한 대응',
      FALSE_POSITIVE: '보안팀 오탐 확인 중 선배포 승인',
      BUSINESS_IMPACT: '핵심 비즈니스 매출 영향 긴급 조치',
    };

    onApprove({
      reason: reasonLabelMap[reasonCategory] || reasonCategory,
      detail,
      approver,
      slaHours: 24,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header with Alert styling */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                긴급 보안 예외 승인 신청
                <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                  CISO Override
                </Badge>
              </h3>
              <p className="text-xs text-rose-300/80 font-mono">
                Security Exception Bypass for Emergency Deployment
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Warning Banner */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-200 leading-relaxed">
              현재 <strong className="text-white">[{projectName}]</strong>의 <span className="font-mono text-rose-300 font-bold">{branch}</span> 브랜치에는{' '}
              <span className="font-mono font-bold text-rose-400">치명적(Critical) {critCount}건</span>,{' '}
              <span className="font-mono font-bold text-amber-400">높음(High) {highCount}건</span>의 미조치 취약점이 존재합니다.
              예외 승인 시 <strong>감사 증적(Audit Trail)</strong>이 전사 보안 로그에 영구 기록됩니다.
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              우회 승인 사유 구분 (필수)
            </Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200 text-xs h-9">
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 z-[10005]">
                <SelectItem value="P0_HOTFIX">🚨 서비스 장애 긴급 핫픽스 (P0 Incident Hotfix)</SelectItem>
                <SelectItem value="REGULATORY">🏛️ 대외 금융/감독 규제 마감 기한 대응</SelectItem>
                <SelectItem value="FALSE_POSITIVE">🔍 보안팀 오탐(False Positive) 확인 중 선배포</SelectItem>
                <SelectItem value="BUSINESS_IMPACT">💼 핵심 비즈니스 긴급 거래 중단 방지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-200">
              상세 사유 및 영향도 분석
            </Label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              required
              rows={3}
              placeholder="장애 상황 및 긴급 배포의 정당성을 입력하세요..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />
          </div>

          {/* Approver Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                보안 승인권자 (CISO/리드)
              </Label>
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200 text-xs h-9">
                  <SelectValue placeholder="승인자를 선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 z-[10005]">
                  <SelectItem value="CISO 김철수 상무">CISO 김철수 상무 (전사 보안총괄)</SelectItem>
                  <SelectItem value="최수민 팀장">최수민 팀장 (보안아키텍처팀)</SelectItem>
                  <SelectItem value="박서준 수석">박서준 수석 (DevSecOps 리드)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                사후 조치 보증 SLA
              </Label>
              <div className="h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold">24시간 이내 패치 보증</span>
                <span className="text-slate-500 text-[10px]">D-Day 카운트다운</span>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-950 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
            />
            <span className="text-[11px] text-slate-300 leading-snug">
              본인은 상기 긴급 배포 사유가 정당함을 보증하며, 배포 후 <strong className="text-amber-300">24시간 이내</strong>에
              발견된 보안 결함을 완전 조치하고 사후 보안 검토 보고서를 제출할 것에 동의합니다.
            </span>
          </label>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            >
              취소
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!acknowledged}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5 shadow-lg shadow-rose-900/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              🚨 예외 승인 및 배포 긴급 통과
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
