import React, { useState, useMemo, useEffect } from 'react';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldAlert,
  ShieldCheck,
  Calculator,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import { SecurityPolicy, ScanType, SecurityVerdict } from '@/types';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ActiveMenu } from '@/components/layout/Sidebar';

export interface PoliciesViewProps {
  initialTab?: 'thresholds' | 'simulator';
  onNavigate?: (menu: ActiveMenu, filterState?: any) => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  initialTab = 'thresholds',
  onNavigate,
}) => {
  const { policy, updatePolicy, currentUser } = useDevSecOps();
  const [activeTab, setActiveTab] = useState<'thresholds' | 'simulator'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Local state for policy form
  const [policyForm, setPolicyForm] = useState<SecurityPolicy>({ ...policy });

  // Update local form when context policy changes
  useEffect(() => {
    setPolicyForm({ ...policy });
  }, [policy]);

  const isGroupAdmin = currentUser.role === 'group_admin';

  // What-If Simulator state
  const [simEnvironment, setSimEnvironment] = useState<'운영' | '검증' | '개발'>('운영');
  const [simCommitMatch, setSimCommitMatch] = useState<boolean>(true);
  const [simScansStatus, setSimScansStatus] = useState<'all_completed' | 'partial_missing' | 'unscanned' | 'scan_failed'>('all_completed');
  const [simCriticalCount, setSimCriticalCount] = useState<number>(0);
  const [simHighCount, setSimHighCount] = useState<number>(1);
  const [simMediumCount, setSimMediumCount] = useState<number>(3);
  const [simLowCount, setSimLowCount] = useState<number>(2);
  const [simExceptionsCount, setSimExceptionsCount] = useState<number>(0);

  // Compute live What-If simulation verdict
  const simResult = useMemo(() => {
    // 1. Commit match
    if (!simCommitMatch) {
      return {
        verdict: '차단' as SecurityVerdict,
        reason: '배포 요청 커밋과 점검 커밋 불일치 (즉시 차단)',
        stepCommit: false,
        stepScans: true,
        stepCrit: true,
        stepHigh: true,
        stepMed: true,
        advice: '배포 요청 커밋과 일치하는 최신 커밋에 대해 점검 파이프라인을 실행해야 합니다.',
      };
    }

    // 2. Scan completion
    if (simScansStatus === 'unscanned') {
      return {
        verdict: '미점검' as SecurityVerdict,
        reason: '해당 커밋에 대해 보안점검 미실행 상태입니다.',
        stepCommit: true,
        stepScans: false,
        stepCrit: true,
        stepHigh: true,
        stepMed: true,
        advice: '점검 파이프라인을 먼저 트리거하여 검사를 완료해주세요.',
      };
    }

    if (simScansStatus === 'scan_failed') {
      return {
        verdict: '차단' as SecurityVerdict,
        reason: '필수 보안점검 파이프라인 중 일부 도구 실행이 실패(Error)했습니다.',
        stepCommit: true,
        stepScans: false,
        stepCrit: true,
        stepHigh: true,
        stepMed: true,
        advice: '파이프라인 로그를 확인하고 실패한 도구를 재실행하십시오.',
      };
    }

    if (simScansStatus === 'partial_missing') {
      return {
        verdict: '차단' as SecurityVerdict,
        reason: '필수 4대 점검(SAST/SCA/Secret/IaC) 중 일부 검사가 누락되었습니다.',
        stepCommit: true,
        stepScans: false,
        stepCrit: true,
        stepHigh: true,
        stepMed: true,
        advice: '누락된 점검 유형을 포함하여 전체 재점검을 수행해야 합니다.',
      };
    }

    // 3. Critical threshold (Zero-tolerance check)
    const effectiveCritical = Math.max(0, simCriticalCount - simExceptionsCount);
    if (policyForm.blockOnCritical && effectiveCritical > 0) {
      return {
        verdict: '차단' as SecurityVerdict,
        reason: `미해결 치명적(Critical) 결함이 ${effectiveCritical}건 존재합니다. (정책: 1건 이상 즉시 차단)`,
        stepCommit: true,
        stepScans: true,
        stepCrit: false,
        stepHigh: true,
        stepMed: true,
        advice: '치명적 결함을 패치하거나, CISO 긴급 보안 예외 승인 절차를 진행하십시오.',
      };
    }

    // 4. High threshold
    const remainingExceptions = Math.max(0, simExceptionsCount - simCriticalCount);
    const effectiveHigh = Math.max(0, simHighCount - remainingExceptions);
    if (effectiveHigh >= policyForm.highThresholdForBlock) {
      return {
        verdict: '차단' as SecurityVerdict,
        reason: `미해결 높음(High) 결함이 ${effectiveHigh}건으로 차단 기준(${policyForm.highThresholdForBlock}건 이상)을 초과했습니다.`,
        stepCommit: true,
        stepScans: true,
        stepCrit: true,
        stepHigh: false,
        stepMed: true,
        advice: '높음 등급 결함을 차단 임계값 미만으로 우선 조치하십시오.',
      };
    }

    // 5. Medium threshold (검토 필요)
    if (simMediumCount >= policyForm.mediumThresholdForReview) {
      return {
        verdict: '검토 필요' as SecurityVerdict,
        reason: `미해결 중간(Medium) 결함이 ${simMediumCount}건으로 검토 기준(${policyForm.mediumThresholdForReview}건 이상)에 도달했습니다.`,
        stepCommit: true,
        stepScans: true,
        stepCrit: true,
        stepHigh: true,
        stepMed: false,
        advice: '보안 심사관의 사유 확인 및 수동 승인이 필요합니다.',
      };
    }

    return {
      verdict: '통과' as SecurityVerdict,
      reason: '모든 보안 정책 기준을 충족하여 안전하게 자동 승인/통과 처리됩니다.',
      stepCommit: true,
      stepScans: true,
      stepCrit: true,
      stepHigh: true,
      stepMed: true,
      advice: '배포 게이트가 성공(Green) 상태입니다. 즉시 운영 릴리즈가 가능합니다.',
    };
  }, [
    simCommitMatch,
    simScansStatus,
    simCriticalCount,
    simHighCount,
    simMediumCount,
    simExceptionsCount,
    policyForm,
  ]);

  const handleSavePolicy = async () => {
    if (!isGroupAdmin) {
      toast.error('보안 정책 수정 권한은 [그룹 보안관리자]에게만 부여되어 있습니다.');
      return;
    }
    await updatePolicy(policyForm);
  };

  const handleToggleRequiredScan = (scanType: ScanType) => {
    const current = policyForm.requiredScanTypes;
    if (current.includes(scanType)) {
      if (current.length > 1) {
        setPolicyForm({
          ...policyForm,
          requiredScanTypes: current.filter((t) => t !== scanType),
        });
      } else {
        toast.warning('최소 1개 이상의 필수 점검 유형이 지정되어야 합니다.');
      }
    } else {
      setPolicyForm({
        ...policyForm,
        requiredScanTypes: [...current, scanType],
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="보안 정책 관리"
        subtitle="전사 DevSecOps 심각도별 배포 차단 기준, 조치기한(SLA) 및 배포 게이트 정책 모의 판정기를 관리합니다."
      />

      {/* Permission simulation alert */}
      {!isGroupAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            현재 역할({currentUser.roleTitle})에서는 정책이 <strong>조회 전용(Read-only)</strong> 모드로 동작합니다.
            정책을 수정하려면 우측 상단 프로필에서 <strong>[그룹 보안관리자]</strong>로 전환해주세요.
          </span>
        </div>
      )}

      {/* Sub-tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-6"
      >
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] pb-1">
          <TabsList className="h-10 bg-zinc-100/90 dark:bg-[#141417] p-1 rounded-lg border border-zinc-200/70 dark:border-white/[0.08] gap-1 w-full sm:w-auto flex flex-wrap justify-start">
            <TabsTrigger
              value="thresholds"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>배포 차단 및 SLA 기준 설정</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 border-zinc-200 dark:border-white/[0.08] hidden sm:inline-flex">
                전사 공통 정책
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="simulator"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Calculator className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>배포 게이트 모의 판정기</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] hidden sm:inline-flex">
                What-If
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: 배포 차단 및 SLA 기준 설정 */}
        <TabsContent value="thresholds" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <Card className="border-zinc-200/80 dark:border-white/[0.08]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    보안 정책 및 배포 차단(Gate) 기준
                  </CardTitle>
                  <CardDescription className="text-xs">
                    발견사항 심각도에 따른 배포 심사 자동 차단 및 검토 기준을 설정합니다.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  전사 공통 정책
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              {/* Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
                    치명적(Critical) 결함 정책
                  </span>
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="blockCritical"
                      checked={policyForm.blockOnCritical}
                      disabled={!isGroupAdmin}
                      onCheckedChange={(checked) =>
                        setPolicyForm({ ...policyForm, blockOnCritical: !!checked })
                      }
                    />
                    <Label htmlFor="blockCritical" className="text-xs cursor-pointer text-zinc-800 dark:text-zinc-200">
                      1개 이상 발견 시 배포 즉시 차단 (권장)
                    </Label>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    전자금융감독규정 및 ISMS-P 기준 미조치 치명적 결함은 프로덕션 배포가 불가합니다.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
                    높음(High) 차단 임계값
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={policyForm.highThresholdForBlock}
                      disabled={!isGroupAdmin}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          highThresholdForBlock: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-20 h-8 text-xs font-semibold"
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">개 이상 시 배포 차단</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    높음 심각도 결함이 설정 개수 이상이면 배포가 자동 차단됩니다.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
                    중간(Medium) 검토 임계값
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={policyForm.mediumThresholdForReview}
                      disabled={!isGroupAdmin}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          mediumThresholdForReview: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-20 h-8 text-xs font-semibold"
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">개 이상 시 검토 필요</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    중간 심각도 결함이 기준 이상이면 보안관리자 수동 검토 상태로 전환됩니다.
                  </p>
                </div>
              </div>

              {/* SLA Days */}
              <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06]">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  심각도별 취약점 조치 기한(SLA) 설정
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[11px] text-zinc-500">치명적 (Critical)</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={policyForm.criticalSlaDays}
                        disabled={!isGroupAdmin}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            criticalSlaDays: parseInt(e.target.value) || 3,
                          })
                        }
                        className="h-8 text-xs font-semibold"
                      />
                      <span className="text-xs text-zinc-500">일 이내</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-zinc-500">높음 (High)</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={policyForm.highSlaDays}
                        disabled={!isGroupAdmin}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            highSlaDays: parseInt(e.target.value) || 7,
                          })
                        }
                        className="h-8 text-xs font-semibold"
                      />
                      <span className="text-xs text-zinc-500">일 이내</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-zinc-500">중간 (Medium)</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={policyForm.mediumSlaDays}
                        disabled={!isGroupAdmin}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            mediumSlaDays: parseInt(e.target.value) || 30,
                          })
                        }
                        className="h-8 text-xs font-semibold"
                      />
                      <span className="text-xs text-zinc-500">일 이내</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] text-zinc-500">낮음 (Low)</Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={policyForm.lowSlaDays}
                        disabled={!isGroupAdmin}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            lowSlaDays: parseInt(e.target.value) || 90,
                          })
                        }
                        className="h-8 text-xs font-semibold"
                      />
                      <span className="text-xs text-zinc-500">일 이내</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Scans (Section 4.6 필수 점검 유형 4종) */}
              <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    배포 심사 게이트 통과를 위한 필수 보안점검 유형 (4종)
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    선택된 점검이 모두 완료되어야 '통과' 판정 가능
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      '소스코드 정적 분석',
                      '오픈소스 라이선스·SCA',
                      '시크릿 탐지',
                      'IaC 보안점검',
                    ] as ScanType[]
                  ).map((type) => {
                    const isChecked = policyForm.requiredScanTypes.includes(type);
                    return (
                      <div
                        key={type}
                        onClick={() => isGroupAdmin && handleToggleRequiredScan(type)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'border-zinc-900 dark:border-zinc-300 bg-zinc-900/[0.04] dark:bg-white/[0.06] text-zinc-950 dark:text-zinc-100 font-semibold cursor-pointer'
                            : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417] text-zinc-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.03]'
                        } ${!isGroupAdmin ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <span>{type}</span>
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            {isGroupAdmin && (
              <CardFooter className="flex justify-end pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
                <Button
                  size="sm"
                  onClick={handleSavePolicy}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  보안 정책 저장
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* What-If 시뮬레이터 이동 배너 */}
          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <div>
                <span className="font-bold text-zinc-950 dark:text-zinc-100">설정된 정책으로 모의 배포 심사를 테스트해보시겠습니까?</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  What-If 시뮬레이터를 통해 가상 취약점 수치 및 커밋 일치 조건에서의 통과/차단 판정을 실시간으로 검증할 수 있습니다.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab('simulator')}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs shrink-0 gap-1.5 shadow-2xs"
            >
              <span>배포 게이트 모의 판정기 열기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: 배포 게이트 모의 판정기 (What-If Simulator) */}
        <TabsContent value="simulator" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <Card className="border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-200/70 dark:border-white/[0.06]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                    <Calculator className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    배포 게이트 정책 모의 판정기 (What-If Simulator)
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                    현재 설정된 정책 기준에 따라 가상의 취약점 건수, 점검 완료 상태, 커밋 일치 여부를 즉시 시뮬레이션하여 판정 결과를 확인합니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-medium">
                    실시간 계산 활성화
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Interactive Input Sliders & Selectors */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Target Environment */}
                    <div className="p-3 bg-zinc-50/50 dark:bg-[#141417] rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-1.5">
                      <Label className="text-[11px] text-zinc-500 font-semibold block">
                        배포 대상 환경 (Environment)
                      </Label>
                      <Select
                        value={simEnvironment}
                        onValueChange={(v: any) => setSimEnvironment(v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="운영">운영 환경 (Production)</SelectItem>
                          <SelectItem value="검증">검증 환경 (Staging)</SelectItem>
                          <SelectItem value="개발">개발 환경 (Development)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-zinc-400">운영 환경은 엄격한 무결성 정책이 적용됩니다.</span>
                    </div>

                    {/* 2. Commit Match Toggle */}
                    <div className="p-3 bg-zinc-50/50 dark:bg-[#141417] rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-1.5">
                      <Label className="text-[11px] text-zinc-500 font-semibold block">
                        커밋 해시 무결성 일치 여부
                      </Label>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          type="button"
                          variant={simCommitMatch ? 'default' : 'outline'}
                          onClick={() => setSimCommitMatch(true)}
                          className={`h-8 flex-1 text-xs ${
                            simCommitMatch ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          커밋 일치
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant={!simCommitMatch ? 'destructive' : 'outline'}
                          onClick={() => setSimCommitMatch(false)}
                          className="h-8 flex-1 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          커밋 불일치
                        </Button>
                      </div>
                      <span className="text-[10px] text-zinc-400">배포 요청 커밋과 점검 완료 커밋의 일치성</span>
                    </div>
                  </div>

                  {/* 3. Scan Completion Status */}
                  <div className="p-3 bg-zinc-50/50 dark:bg-[#141417] rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-1.5">
                    <Label className="text-[11px] text-zinc-500 font-semibold block">
                      필수 4대 보안점검 완료 상태
                    </Label>
                    <Select
                      value={simScansStatus}
                      onValueChange={(v: any) => setSimScansStatus(v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_completed">
                          필수 4종 점검 모두 정상 완료 (SAST, SCA, Secret, IaC)
                        </SelectItem>
                        <SelectItem value="partial_missing">
                          일부 점검 누락 (예: IaC 미실행)
                        </SelectItem>
                        <SelectItem value="unscanned">
                          해당 커밋 점검 기록 전혀 없음 (미점검)
                        </SelectItem>
                        <SelectItem value="scan_failed">
                          점검 파이프라인 엔진 오류 발생 (Scan Error)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Sliders for finding counts */}
                  <div className="p-3.5 bg-zinc-50/50 dark:bg-[#141417] rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        가상 미해결 결함 건수 시뮬레이션
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSimCriticalCount(0);
                          setSimHighCount(0);
                          setSimMediumCount(0);
                          setSimLowCount(0);
                          setSimExceptionsCount(0);
                        }}
                        className="h-6 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1 px-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        결함 초기화 (Clean)
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {/* Critical */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-rose-600 dark:text-rose-400">치명적 (Critical)</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{simCriticalCount}건</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={simCriticalCount}
                          onChange={(e) => setSimCriticalCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8 text-xs font-mono font-semibold"
                        />
                        <span className="text-[10px] text-zinc-400 block">
                          정책: {policyForm.blockOnCritical ? '1건 이상 차단' : '차단 안 함'}
                        </span>
                      </div>

                      {/* High */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-600 dark:text-amber-400">높음 (High)</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{simHighCount}건</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={simHighCount}
                          onChange={(e) => setSimHighCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8 text-xs font-mono font-semibold"
                        />
                        <span className="text-[10px] text-zinc-400 block">
                          차단 임계: {policyForm.highThresholdForBlock}건 이상
                        </span>
                      </div>

                      {/* Medium */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-500">중간 (Medium)</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{simMediumCount}건</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={simMediumCount}
                          onChange={(e) => setSimMediumCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8 text-xs font-mono font-semibold"
                        />
                        <span className="text-[10px] text-zinc-400 block">
                          검토 임계: {policyForm.mediumThresholdForReview}건 이상
                        </span>
                      </div>

                      {/* Low */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-zinc-600 dark:text-zinc-400">낮음 (Low)</span>
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{simLowCount}건</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={simLowCount}
                          onChange={(e) => setSimLowCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-8 text-xs font-mono font-semibold"
                        />
                        <span className="text-[10px] text-zinc-400 block">참고용 집계</span>
                      </div>
                    </div>

                    {/* Exceptions count */}
                    <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 block">
                          승인된 보안 예외 (Security Exceptions / Waivers)
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          유효 기간 내 승인된 예외는 차단 판정 계산에서 우선 제외 차감됩니다.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={simExceptionsCount}
                          onChange={(e) => setSimExceptionsCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 h-8 text-xs font-mono font-semibold"
                        />
                        <span className="text-xs text-zinc-900 dark:text-zinc-100 font-semibold">건</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Live Verdict Card & Step Breakdown */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  <div
                    className={`p-5 rounded-xl border transition-all space-y-3.5 ${
                      simResult.verdict === '통과'
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100'
                        : simResult.verdict === '검토 필요'
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100'
                        : simResult.verdict === '미점검'
                        ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-[#141417] text-zinc-900 dark:text-zinc-100'
                        : 'border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        게이트 자동 평가 결과
                      </span>
                      <Badge
                        className={`text-xs px-2.5 py-0.5 font-bold ${
                          simResult.verdict === '통과'
                            ? 'bg-emerald-600 text-white'
                            : simResult.verdict === '검토 필요'
                            ? 'bg-amber-600 text-white'
                            : simResult.verdict === '미점검'
                            ? 'bg-zinc-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {simResult.verdict}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-bold tracking-tight">
                        {simResult.verdict === '통과' && '배포 승인 (Pass)'}
                        {simResult.verdict === '검토 필요' && '관리자 검토 필요 (Review Required)'}
                        {simResult.verdict === '차단' && '배포 즉시 차단 (Blocked)'}
                        {simResult.verdict === '미점검' && '보안점검 미실행 (Unchecked)'}
                      </h4>
                      <p className="text-xs font-medium leading-relaxed opacity-90">
                        "{simResult.reason}"
                      </p>
                    </div>

                    {/* Step-by-Step Rule Checklist */}
                    <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5 text-[11px]">
                      <span className="font-bold block text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                        정책 규칙 평가 단계:
                      </span>
                      <div className="flex items-center justify-between">
                        <span>1. 커밋 해시 무결성 일치:</span>
                        <span className={simResult.stepCommit ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-rose-700 dark:text-rose-400'}>
                          {simResult.stepCommit ? '충족 (OK)' : '불일치 (FAIL)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>2. 필수 4대 점검 전수 완료:</span>
                        <span className={simResult.stepScans ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-rose-700 dark:text-rose-400'}>
                          {simResult.stepScans ? '완료 (OK)' : '미완료 (FAIL)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>3. 치명적(Critical) 결함 통제:</span>
                        <span className={simResult.stepCrit ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-rose-700 dark:text-rose-400'}>
                          {simResult.stepCrit ? '기준 충족 (0건)' : '위반 (FAIL)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>4. 높음(High) 차단 임계값 통제:</span>
                        <span className={simResult.stepHigh ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-rose-700 dark:text-rose-400'}>
                          {simResult.stepHigh ? `허용 범위 (<${policyForm.highThresholdForBlock})` : '임계값 초과 (FAIL)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>5. 중간(Medium) 검토 임계값:</span>
                        <span className={simResult.stepMed ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold text-amber-700 dark:text-amber-400'}>
                          {simResult.stepMed ? `정상 (<${policyForm.mediumThresholdForReview})` : '검토 대상'}
                        </span>
                      </div>
                    </div>

                    {/* Action Advice Box */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-black/5 dark:border-white/10 text-[11px] space-y-0.5">
                      <span className="font-bold block text-zinc-800 dark:text-zinc-200">권장 조치 가이드:</span>
                      <span className="text-zinc-600 dark:text-zinc-300 block">{simResult.advice}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50/50 dark:bg-[#141417] rounded-xl border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                      실시간 게이트 연동 안내
                    </div>
                    <p>
                      이 시뮬레이터는 <code>evaluateDeploymentVerdict()</code> 엔진과 동일한 알고리즘으로 구동되며,
                      실제 개발자의 Git Push 및 PR 발생 시 적용되는 정확한 로직을 사전에 검증할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 정책 수정 이동 배너 */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              시뮬레이션 판정 기준이 되는 전사 임계값을 수정하려면 <strong>[배포 차단 및 SLA 기준 설정]</strong> 탭을 확인하세요.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('thresholds')}
              className="text-xs font-semibold"
            >
              &larr; 보안 정책 기준 수정하러 가기
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
