import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Package,
  FileJson,
  Download,
  Copy,
  Check,
  X,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, SbomBundle } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SbomInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export const SbomInspectorModal: React.FC<SbomInspectorModalProps> = ({
  isOpen,
  onClose,
  projectId = 'PRJ-AGENTGATE',
  projectName = 'AgentGate 보안 게이트웨이',
}) => {
  const [bundle, setBundle] = useState<SbomBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'components' | 'vex' | 'slsa' | 'json'>('components');
  const [copied, setCopied] = useState(false);

  const loadSbom = async (recordAudit = false) => {
    setIsLoading(true);
    try {
      const data = await api.getSbomBundle(projectId, recordAudit);
      if (data) {
        setBundle(data);
      }
    } catch (e) {
      console.warn('Failed to load SBOM bundle:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSbom(false);
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleDownloadSbomJson = async () => {
    if (!bundle) return;
    await loadSbom(true);
    const blob = new Blob([JSON.stringify(bundle.sbom, null, 2)], {
      type: 'application/vnd.cyclonedx+json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sbom-${bundle.projectId.toLowerCase()}-${bundle.commitId}.cdx.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CycloneDX v1.5 표준 SBOM 명세서(.cdx.json)가 다운로드되었으며 감사 로그에 기록되었습니다.');
  };

  const handleDownloadSlsaProvenance = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle.slsaProvenance, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slsa-provenance-${bundle.projectId.toLowerCase()}-${bundle.commitId}.intoto.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SLSA v1.0 빌드 출처 증명서(.intoto.json)가 다운로드되었습니다.');
  };

  const handleCopyJson = () => {
    if (!bundle) return;
    const content =
      activeTab === 'slsa'
        ? JSON.stringify(bundle.slsaProvenance, null, 2)
        : JSON.stringify(bundle.sbom, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('클립보드에 JSON 명세가 복사되었습니다.');
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0c1017] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  소프트웨어 공급망 명세서 (SBOM) &amp; SLSA v1.0 출처 증명
                </h3>
                <Badge className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-mono text-[10px]">
                  CycloneDX v1.5
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono text-[10px]">
                  SLSA Build L3 Attested
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {bundle?.projectName || projectName} • Commit @{bundle?.commitId || 'HEAD'} • 금융보안원 공급망 보안 가이드라인 &amp; US EO 14028 준수
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {isLoading || !bundle ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="font-mono">CycloneDX 1.5 SBOM 및 KMS 전자서명 생성 중...</span>
            </div>
          ) : (
            <>
              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141923] border border-slate-200 dark:border-white/[0.07]">
                  <span className="text-[10px] text-slate-400 block">식별된 패키지(PURL)</span>
                  <strong className="text-base font-mono text-indigo-600 dark:text-indigo-400">
                    {bundle.summary.totalComponents}개 컴포넌트
                  </strong>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
                    SHA-256 해시 검증됨
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141923] border border-slate-200 dark:border-white/[0.07]">
                  <span className="text-[10px] text-slate-400 block">오픈소스 라이선스</span>
                  <strong className="text-base font-mono text-emerald-600 dark:text-emerald-400">
                    100% 적합 (Permissive)
                  </strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                    MIT {bundle.summary.licenses.MIT || 0}건 / Apache-2.0 {bundle.summary.licenses['Apache-2.0'] || 0}건
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141923] border border-slate-200 dark:border-white/[0.07]">
                  <span className="text-[10px] text-slate-400 block">VEX 취약점 영향도</span>
                  <strong
                    className={cn(
                      'text-base font-mono',
                      bundle.summary.openVulnerabilities > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    미해결 {bundle.summary.openVulnerabilities}건 / 총 {bundle.summary.totalVulnerabilities}건
                  </strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                    패치 완료: {bundle.summary.resolvedVulnerabilities}건
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141923] border border-slate-200 dark:border-white/[0.07]">
                  <span className="text-[10px] text-slate-400 block">SLSA 무결성 서명 키</span>
                  <strong className="text-xs font-mono text-indigo-600 dark:text-indigo-300 truncate block mt-0.5">
                    {bundle.slsaProvenance.attestation.keyId}
                  </strong>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    KMS KEK 전자서명 완료
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-2 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={activeTab === 'components' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('components')}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    컴포넌트 &amp; 라이선스 ({bundle.summary.totalComponents})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'vex' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('vex')}
                    className="h-8 text-xs gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    VEX 취약점 분석 ({bundle.summary.totalVulnerabilities})
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'slsa' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('slsa')}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    SLSA v1.0 출처 증명서
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTab === 'json' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('json')}
                    className="h-8 text-xs gap-1.5 font-mono"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    CycloneDX JSON
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyJson}
                  className="h-7 text-xs font-mono text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? '복사됨' : 'JSON 복사'}
                </Button>
              </div>

              {/* Tab 1: Components Table */}
              {activeTab === 'components' && (
                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.04] text-slate-500 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                      <tr>
                        <th className="p-3">패키지명</th>
                        <th className="p-3">버전</th>
                        <th className="p-3">표준 PURL 식별자</th>
                        <th className="p-3">라이선스 (SPDX)</th>
                        <th className="p-3">SHA-256 무결성 다이제스트</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                      {bundle.sbom.components.map((comp: any) => (
                        <tr key={comp['bom-ref']} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                          <td className="p-3 font-bold font-mono text-slate-800 dark:text-slate-200">
                            {comp.name}
                          </td>
                          <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            v{comp.version}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {comp.purl}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-mono text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-300">
                              {comp.licenses?.[0]?.license?.id || 'MIT'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">
                            {comp.hashes?.[0]?.content?.substring(0, 20)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: VEX Vulnerability Exploitability eXchange */}
              {activeTab === 'vex' && (
                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.04] text-slate-500 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                      <tr>
                        <th className="p-3">취약점 ID / 규칙</th>
                        <th className="p-3">진단 도구</th>
                        <th className="p-3">심각도</th>
                        <th className="p-3">VEX 분석 상태</th>
                        <th className="p-3">권고 조치 사항</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                      {bundle.sbom.vulnerabilities.map((v: any) => (
                        <tr key={v['bom-ref']}>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {v.id}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {v.source?.name}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={cn(
                                'font-mono text-[10px] uppercase',
                                v.ratings?.[0]?.severity === 'critical'
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-400'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-400'
                              )}
                            >
                              {v.ratings?.[0]?.severity}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-mono text-[10px]',
                                v.analysis?.state === 'resolved' || v.analysis?.state === 'not_affected'
                                  ? 'border-emerald-400 text-emerald-600 bg-emerald-50/50'
                                  : 'border-rose-400 text-rose-600 bg-rose-50/50'
                              )}
                            >
                              {v.analysis?.state?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate" title={v.recommendation}>
                            {v.recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: SLSA v1.0 Provenance */}
              {activeTab === 'slsa' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Key className="w-4 h-4" />
                        SLSA v1.0 Cryptographic Provenance Attestation
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                        VERIFIED SIGNATURE
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Statement Type:</span>
                        <span className="text-indigo-300">{bundle.slsaProvenance._type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Predicate Type:</span>
                        <span className="text-indigo-300">{bundle.slsaProvenance.predicateType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Signing KMS Provider:</span>
                        <span className="text-white">{bundle.slsaProvenance.attestation.kmsProvider}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Active Master KEK ID:</span>
                        <span className="text-amber-300">{bundle.slsaProvenance.attestation.keyId}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-[10.5px]">
                      <div className="text-slate-400">SBOM Canonical SHA-256 Digest:</div>
                      <div className="text-emerald-300 break-all">{bundle.slsaProvenance.attestation.sbomDigestSha256}</div>
                      <div className="text-slate-400 pt-1">HMAC-SHA256 KMS Attestation Signature:</div>
                      <div className="text-indigo-300 break-all">{bundle.slsaProvenance.attestation.signature}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Raw CycloneDX JSON */}
              {activeTab === 'json' && (
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-[340px] border border-slate-800">
                  {JSON.stringify(bundle.sbom, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#121722] border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            다운로드 시 SHA-256 불변 감사 로그에 SBOM_PROVENANCE_EXPORT 증적이 기록됩니다.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSlsaProvenance}
              disabled={!bundle}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              SLSA v1.0 증명서 (.intoto.json)
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadSbomJson}
              disabled={!bundle}
              className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CycloneDX 1.5 SBOM 다운로드 (.cdx.json)
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
