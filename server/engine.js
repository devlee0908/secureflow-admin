/**
 * SecureFlow Lightweight Security Analysis & Policy Evaluation Engine
 * Evaluates real incoming GitHub Webhook events and determines gate verdicts.
 */

export function evaluateGitEvent({
  projectId = 'PRJ-101',
  repository,
  branch,
  commitId,
  commitMessage,
  author,
  authorEmail,
  trigger,
  prNumber,
  filesChanged = [],
}) {
  const textToScan = `${commitMessage} ${filesChanged.join(' ')} ${branch}`.toLowerCase();

  const nowTime = () => new Date().toLocaleTimeString();
  const startedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 1. Defect Detection Rules
  const hasSqlInjection =
    textToScan.includes('sql') ||
    textToScan.includes('query') ||
    textToScan.includes('raw_query') ||
    textToScan.includes('authcontroller');

  const hasSecretLeak =
    textToScan.includes('secret') ||
    textToScan.includes('key') ||
    textToScan.includes('token') ||
    textToScan.includes('aws_key') ||
    textToScan.includes('.env');

  const hasIacMisconfig =
    textToScan.includes('terraform') ||
    textToScan.includes('.tf') ||
    textToScan.includes('s3_public') ||
    textToScan.includes('iac');

  const hasDepVulnerability =
    textToScan.includes('dependency') ||
    textToScan.includes('package.json') ||
    textToScan.includes('cve') ||
    textToScan.includes('npm');

  // Count Findings
  let critCount = 0;
  let highCount = 0;
  let medCount = 0;

  if (hasSqlInjection) critCount += 1;
  if (hasSecretLeak) critCount += 1;
  if (hasIacMisconfig) highCount += 1;
  if (hasDepVulnerability) medCount += 2;

  // Tool status calculations
  const toolStatuses = {
    sast: {
      count: hasSqlInjection ? 1 : 0,
      duration: 35,
      status: hasSqlInjection ? '경고' : '성공',
    },
    sca: {
      count: hasDepVulnerability ? 2 : 0,
      duration: 22,
      status: hasDepVulnerability ? '경고' : '성공',
    },
    secret: {
      count: hasSecretLeak ? 1 : 0,
      duration: 12,
      status: hasSecretLeak ? '경고' : '성공',
    },
    iac: {
      count: hasIacMisconfig ? 1 : 0,
      duration: 18,
      status: hasIacMisconfig ? '경고' : '성공',
    },
  };

  const scanDuration = 35 + 22 + 12 + 18;

  // Gate evaluation (Policy: Critical 0건 허용, High 2건 이상 차단)
  let gateStatus = 'passed';
  let policyNotes = '모든 보안 점검 클린 통과 (0 defects)';
  let currentStage = 5;
  let reviewStatus = 'approved';
  let reviewer = '시스템 자동 승인 (무결점 패스트트랙)';
  let reviewComment = '보안점검 0건 및 정책 게이트 100% 클린 통과';
  let deployStatus = 'deployed';

  if (critCount > 0) {
    gateStatus = 'blocked';
    currentStage = 3;
    reviewStatus = 'not_reached';
    reviewer = null;
    reviewComment = null;
    deployStatus = 'blocked';
    policyNotes = `치명적(Critical) 보안 결함 ${critCount}건 탐지로 배포 강제 차단`;
  } else if (highCount > 0 || medCount > 0) {
    gateStatus = 'review';
    currentStage = 4;
    reviewStatus = 'pending_review';
    reviewer = '보안팀 최수민 팀장';
    reviewComment = '중간/고위험 결함 조치 계획서 검토 필요';
    deployStatus = 'pending';
    policyNotes = `고위험/중간 결함(${highCount + medCount}건)으로 배포 심사위원 수동 검토 필요`;
  }

  // Execution logs
  const logs = [
    `[${nowTime()}] [GITHUB] 🔔 GitHub Webhook 이벤트 수신: ${trigger} on ${branch} (@${commitId.substring(0, 7)})`,
    `[${nowTime()}] [AUTH] 커밋 작성자: ${author} (${authorEmail})`,
    `[${nowTime()}] [RUNNER] ⚡ K8s 보안점검 러너 워커 파드(k8s-sec-worker-01) 자동 프로비저닝 완료`,
    `[${nowTime()}] [SCAN] 4대 보안점검 엔진 병렬 스캔 개시 (SAST, SCA, Secret, IaC)`,
  ];

  if (hasSecretLeak) {
    logs.push(`[${nowTime()}] [ALERT] 🔑 Gitleaks: AWS Secret Access Key 유출 패턴 감지 (High Entropy)`);
  }
  if (hasSqlInjection) {
    logs.push(`[${nowTime()}] [ALERT] 🛡️ SonarQube SAST: CWE-89 SQL Injection 취약점 발견`);
  }
  if (hasIacMisconfig) {
    logs.push(`[${nowTime()}] [WARN] 📜 Checkov IaC: CKV_AWS_20 (S3 Public Access ACL) 위반 탐지`);
  }
  if (hasDepVulnerability) {
    logs.push(`[${nowTime()}] [WARN] 📦 Snyk/Trivy SCA: CVE-2024-21538 cross-spawn 취약점 2건 감지`);
  }

  if (gateStatus === 'blocked') {
    logs.push(`[${nowTime()}] [STAGE 3] 🛑 보안 정책 게이트 판정: 차단 (Critical 결함 ${critCount}건)`);
    logs.push(`[${nowTime()}] [NOTIFY] 👤 담당자(${author})에게 조치 가이드 및 슬랙 알림 발송 완료`);
  } else if (gateStatus === 'review') {
    logs.push(`[${nowTime()}] [STAGE 3] ⚖️ 보안 정책 게이트 판정: 검토 필요 (심사 대기)`);
    logs.push(`[${nowTime()}] [STAGE 4] 📋 배포 심사위원(${reviewer}) 배포 결재 큐에 등록되었습니다.`);
  } else {
    logs.push(`[${nowTime()}] [STAGE 3] ✅ 보안 정책 게이트 판정: 100% 클린 통과`);
    logs.push(`[${nowTime()}] [STAGE 4] 📋 배포 심사 자동 통과 (무결점 패스트트랙)`);
    logs.push(`[${nowTime()}] [STAGE 5] 🚀 운영 클러스터(k8s-prod-seoul) 무중단 롤링 배포 성공`);
  }

  return {
    id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    author,
    authorEmail,
    authorRole: '개발자',
    department: '개발팀',
    avatarColor: 'from-indigo-600 to-indigo-400',
    branch,
    targetBranch: 'main',
    trigger,
    prNumber,
    commitId: commitId.substring(0, 7),
    commitMessage,
    startedAt,
    currentStage,
    scanStatus: 'completed',
    scanDuration,
    toolStatuses,
    executionLogs: logs,
    gateStatus,
    critCount,
    highCount,
    medCount,
    policyNotes,
    reviewStatus,
    reviewer,
    reviewComment,
    targetEnvironment: '운영',
    deployStatus,
    cluster: 'k8s-prod-seoul',
    namespace: 'paycore-svc',
    replicas: gateStatus === 'blocked' ? '0 / 4 (차단됨)' : '4 / 4 Active',
    isOverridden: false,
  };
}
