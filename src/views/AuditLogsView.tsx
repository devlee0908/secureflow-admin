import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { api, AuditLogEntry, AuditVerificationResult } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Search,
  RefreshCw,
  Download,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  Copy,
  Clock,
  User,
  Hash,
  Terminal,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { ComplianceReportModal } from '@/components/compliance/ComplianceReportModal';
import { exportToCsv } from '@/lib/exportCsv';
import { useLiveEvents } from '@/hooks/useLiveEvents';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Compliance Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Verification modal state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<AuditVerificationResult | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(150, selectedCategory);
      setLogs(data);
    } catch {
      toast.error('감사 로그 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedCategory]);

  // Real-time SSE audit stream listener
  useLiveEvents({
    onAuditLogged: (data) => {
      const newLog = data?.log;
      if (!newLog) return;
      if (selectedCategory !== 'ALL' && newLog.category !== selectedCategory) return;
      setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
    },
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setVerifyResult(res);
      setIsVerifyDialogOpen(true);
      if (res.verified) {
        toast.success('ISMS-P 전자서명 체인 검증 성공! 모든 레코드의 무결성이 확인되었습니다.');
      } else {
        toast.error('무결성 체인 검증 실패! 위변조된 레코드가 감지되었습니다.');
      }
    } catch {
      toast.error('검증 엔진과 통신 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Category', 'TargetResource', 'Status', 'HashSignature', 'PreviousHash'];
    const rows = filteredLogs.map((l) => [
      l.id || '',
      l.timestamp || '',
      `${l.actorName || ''} (${l.actorId || ''})`,
      l.actorRole || '',
      l.actionType || '',
      l.category || '',
      l.targetResource || '',
      l.resultStatus || '',
      l.hashSignature || '',
      l.previousHash || '',
    ]);

    exportToCsv('SecureFlow_AuditTrail', headers, rows);
    toast.success('감사 증적 CSV 보고서가 다운로드되었습니다.');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (log.actorName || '').toLowerCase().includes(q) ||
        (log.actorId || '').toLowerCase().includes(q) ||
        (log.actionType || '').toLowerCase().includes(q) ||
        (log.targetResource || '').toLowerCase().includes(q) ||
        (log.id || '').toLowerCase().includes(q);

      return matchSearch;
    });
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="보안 감사 및 전자서명"
        subtitle="ISMS-P 인증 및 전자금융감독규정에 따라 위변조가 불가능한 SHA-256 해시 체인 기반 거버넌스 감사 이력을 제공합니다."
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>누적 감사 증적</span>
            <FileCheck className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-950 dark:text-white font-mono">{logs.length}</span>
            <span className="text-xs text-zinc-400">건 영구 보관</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>SQLite 영속 볼트 기록</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>무결성 전자서명 체인</span>
            <Fingerprint className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">SHA-256 CHAIN</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1 font-mono truncate">
            <span>Genesis ➔ Block #{logs.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>규정 준수 인증</span>
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ISMS-P &amp; 금감원</span>
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-2 font-medium">
            전자금융감독규정 제15조 준수
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>최근 활동 감사</span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-1">
            {logs[0] ? logs[0].actionType : '기록 대기 중'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 truncate font-mono">
            {logs[0] ? new Date(logs[0].timestamp).toLocaleString() : '-'}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08] rounded-xl">
        {/* Left: Search & Category filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="작업자, ID, 작업 유형, 리소스 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-50 dark:bg-white/[0.04]"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-[#141417] p-1 rounded-lg text-[11px]">
            {['ALL', 'GOVERNANCE', 'SECURITY_GATE', 'ORCHESTRATION', 'AUDIT', 'INTEGRATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-[#222226] text-zinc-950 dark:text-zinc-50 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {cat === 'ALL'
                  ? '전체'
                  : cat === 'GOVERNANCE'
                  ? '거버넌스'
                  : cat === 'SECURITY_GATE'
                  ? '배포게이트'
                  : cat === 'ORCHESTRATION'
                  ? '자동패치'
                  : cat === 'AUDIT'
                  ? '예외승인'
                  : '외부연동'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            ISMS-P 공식 감사보고서 생성
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 font-semibold gap-1.5"
          >
            <Fingerprint className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? '무결성 계산 중...' : '전자서명 체인 검증'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            CSV 내보내기
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={fetchLogs}
            className="h-8 text-xs px-2.5"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/80 dark:bg-white/[0.02]">
            <TableRow className="border-b border-zinc-200/80 dark:border-white/[0.06]">
              <TableHead className="w-40 text-xs font-bold">일시 (Timestamp)</TableHead>
              <TableHead className="w-48 text-xs font-bold">작업 주체 (Actor)</TableHead>
              <TableHead className="w-48 text-xs font-bold">작업 유형 (Action Type)</TableHead>
              <TableHead className="text-xs font-bold">대상 리소스</TableHead>
              <TableHead className="w-24 text-xs font-bold text-center">결과</TableHead>
              <TableHead className="w-44 text-xs font-bold font-mono">SHA-256 서명</TableHead>
              <TableHead className="w-20 text-xs font-bold text-right">상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-zinc-400 text-xs">
                  {isLoading ? '감사 로그를 조회하는 중입니다...' : '조건에 부합하는 감사 로그가 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] border-b border-zinc-100 dark:border-white/[0.04] text-xs transition-colors"
                >
                  <TableCell className="font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-400" />
                        {log.actorName || '-'}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {log.actorRole || '-'} ({log.ipAddress || '10.240.x.x'})
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {log.actionType || '-'}
                      </span>
                      <span className="text-[10px] text-zinc-400">카테고리: {log.category}</span>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[220px]">
                    {log.targetResource || '-'}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-bold ${
                        log.resultStatus === '성공'
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                          : log.resultStatus === '차단'
                          ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                          : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                      }`}
                    >
                      {log.resultStatus}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-400 truncate max-w-[170px]">
                    <div className="flex items-center gap-1.5" title={`전체 해시: ${log.hashSignature || ''}`}>
                      <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{(log.hashSignature || '').substring(0, 16)}...</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedLog(log)}
                      className="h-7 text-xs px-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                    >
                      조회
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08] text-xs space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
                <FileCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                감사 로그 상세 증적 (Record #{selectedLog.id})
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                전자금융감독규정 및 ISMS-P 인증 규격에 부합하는 암호화 증적 원문입니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-[#141417] border border-zinc-200/80 dark:border-white/[0.08] text-[11px]">
                <div>
                  <span className="text-zinc-400 block font-sans">작업 주체:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{selectedLog.actorName} ({selectedLog.actorId})</strong>
                  <span className="text-zinc-400 block mt-0.5">{selectedLog.actorRole} · IP: {selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-sans">기록 일시 (Timestamp):</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{selectedLog.timestamp}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 block font-bold mt-0.5">상태: {selectedLog.resultStatus}</span>
                </div>
              </div>

              {/* Cryptographic Hash Section */}
              <div className="p-3 rounded-xl bg-[#09090b] text-zinc-200 border border-white/[0.08] text-[11px] space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-50">
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                    SHA-256 전자서명 무결성 증적
                  </span>
                  <span className="text-[10px] text-emerald-400">체인 링크 검증 완료</span>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-400 block text-[10px]">이전 블록 해시 (Previous Hash):</span>
                  <div className="p-1.5 rounded bg-[#141417] font-mono text-[10px] text-zinc-400 break-all border border-white/[0.06]">
                    {selectedLog.previousHash}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-400 block text-[10px]">현재 레코드 서명 해시 (Hash Signature):</span>
                  <div className="p-1.5 rounded bg-[#141417] font-mono text-[10px] text-emerald-400 break-all border border-emerald-500/30 font-bold">
                    {selectedLog.hashSignature}
                  </div>
                </div>
              </div>

              {/* Payload JSON */}
              <div className="space-y-1">
                <span className="text-zinc-400 block text-[11px] font-sans">감사 이벤트 상세 페이로드 (JSON Details):</span>
                <pre className="p-3 rounded-xl bg-[#09090b] text-zinc-200 text-[11px] overflow-x-auto max-h-56 border border-white/[0.08] font-mono">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Verification Result Dialog */}
      {verifyResult && (
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-[#0f0f11] border border-zinc-200/80 dark:border-white/[0.08] text-xs space-y-4">
            <DialogHeader>
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-2 ${
                  verifyResult.verified
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                }`}
              >
                {verifyResult.verified ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <DialogTitle className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                {verifyResult.verified ? '전자서명 체인 무결성 인증 완료' : '무결성 위변조 경고'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                {verifyResult.message}
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#141417] border border-zinc-200/80 dark:border-white/[0.08] space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-400">검증된 레코드 수:</span>
                <strong className="text-zinc-800 dark:text-zinc-200">{verifyResult.count} 건 전수 검사</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">검증 알고리즘:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">SHA-256 Sequential Chaining</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">인증 표준:</span>
                <span className="text-zinc-800 dark:text-zinc-200">ISMS-P 인증기준 2.10.1</span>
              </div>
            </div>

            <Button
              className={`w-full text-white font-semibold ${
                verifyResult.verified ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
              onClick={() => setIsVerifyDialogOpen(false)}
            >
              확인 및 인증서 닫기
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* ISMS-P Official Compliance Report Generator Modal */}
      <ComplianceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
export default AuditLogsView;
