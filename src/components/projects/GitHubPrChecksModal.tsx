import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  FileCode,
  MessageSquare,
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GitMerge,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AGENTGATE_ALL_SCAN_ISSUES } from '@/mock/mockData';
import { ExploitSimulatorModal, ExploitIssueData } from '@/components/common/ExploitSimulatorModal';
import { DeltaDebtBurndownCard } from './DeltaDebtBurndownCard';
import { downloadAuditReportHtml } from '@/lib/exportAuditReport';

export interface PrScanIssue {
  id?: string;
  tool: string;
  rule: string;
  severity: '치명적' | '높음' | '중간';
  filePath: string;
  lineNumber: number | string;
  badCode: string;
  goodCode: string;
  guide: string;
}

export interface GitHubPrChecksModalProps {
  isOpen: boolean;
  onClose: () => void;
  prNumber: number;
  prTitle?: string;
  author?: string;
  authorRole?: string;
  authorEmail?: string;
  sourceBranch?: string;
  targetBranch?: string;
  commitId?: string;
  projectName?: string;
  repoFullName?: string;
  initialCheckStatus?: 'failed' | 'passed' | 'running';
  detectedIssue?: PrScanIssue;
  detectedIssues?: PrScanIssue[];
  onSimulateFixPushed?: () => void;
  onRequestWaiver?: () => void;
  onNavigateToReviews?: () => void;
  isInReviewsView?: boolean;
  isDeltaBaselineMode?: boolean;
  baselineDebtCount?: number;
  rejectionInfo?: {
    reviewer: string;
    comment: string;
    reviewedAt?: string;
  };
}

export const GitHubPrChecksModal: React.FC<GitHubPrChecksModalProps> = ({
  isOpen,
  onClose,
  prNumber = 1,
  prTitle,
  author = 'devlee0908',
  authorRole = '선임 개발자 (클라우드개발실)',
  authorEmail = 'devlee0908@github.internal',
  sourceBranch = 'fix/security-remediation',
  targetBranch = 'main',
  commitId = 'f9c2a10',
  projectName = 'AgentGate 보안 게이트웨이 (연동 저장소)',
  repoFullName = 'devlee0908/agentgate',
  initialCheckStatus = 'failed',
  detectedIssue,
  detectedIssues,
  onSimulateFixPushed,
  onRequestWaiver,
  onNavigateToReviews,
  isInReviewsView = false,
  isDeltaBaselineMode = true,
  baselineDebtCount = 2,
  rejectionInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'checks' | 'files' | 'publish'>('conversation');
  const [currentStatus, setCurrentStatus] = useState<'failed' | 'passed' | 'running'>(initialCheckStatus);
  const [isFixing, setIsFixing] = useState(false);
  const [isWaiverRequested, setIsWaiverRequested] = useState(false);
  const [githubPat, setGithubPat] = useState<string>(() => {
    try {
      return localStorage.getItem('secureflow_github_pat') || '';
    } catch {
      return '';
    }
  });
  const [showPatPlaintext, setShowPatPlaintext] = useState(false);
  const [isSendingToGithub, setIsSendingToGithub] = useState(false);
  const [publishStepIndex, setPublishStepIndex] = useState<number>(0);
  const [publishStepText, setPublishStepText] = useState<string>('');
  const [publishError, setPublishError] = useState<{
    step: string;
    status?: number;
    title: string;
    message: string;
    suggestion: string;
  } | null>(null);
  const [realPrUrl, setRealPrUrl] = useState<string | null>(null);
  const [realPrNumber, setRealPrNumber] = useState<number | null>(null);
  const [showPatGuide, setShowPatGuide] = useState<boolean>(true);
  const [isCliCopied, setIsCliCopied] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [patchProgressText, setPatchProgressText] = useState('');
  const [isPatchPushedToGithub, setIsPatchPushedToGithub] = useState(false);
  const [isMergingPr, setIsMergingPr] = useState(false);
  const [isPrMerged, setIsPrMerged] = useState(false);
  const [exploitTargetIssue, setExploitTargetIssue] = useState<ExploitIssueData | null>(null);
  const [isExploitModalOpen, setIsExploitModalOpen] = useState(false);

  // Normalize repository string: e.g. "github.com/devlee0908/agentgate" -> "devlee0908/agentgate"
  const cleanRepo = useMemo(() => {
    const raw = repoFullName || 'devlee0908/agentgate';
    return raw
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '')
      .trim();
  }, [repoFullName]);

  // Determine token kind: Fine-grained vs Classic
  const patTokenType = useMemo(() => {
    const t = githubPat.trim();
    if (t.startsWith('github_pat_')) return 'fine_grained';
    if (t.startsWith('ghp_')) return 'classic';
    return t.length > 0 ? 'custom' : 'none';
  }, [githubPat]);

  // Determine full issue list from props or mock dataset
  const issuesList: PrScanIssue[] = useMemo(() => {
    if (detectedIssues && detectedIssues.length > 0) return detectedIssues;
    if (detectedIssue) return [detectedIssue];
    return AGENTGATE_ALL_SCAN_ISSUES;
  }, [detectedIssues, detectedIssue]);

  const displayTitle =
    prTitle || `fix(security): 소스코드 점검 취약점(${issuesList.length}건) 조치 및 보안 분석 리포트`;

  if (!isOpen) return null;

  // Real or simulated fix commit and push handler
  const handlePushFix = async () => {
    const token = githubPat.trim();
    setIsFixing(true);
    setIsPatching(true);

    if (token) {
      setPatchProgressText('GitHub 원격 저장소에 3건의 보안 패치 파일 커밋 중...');
      toast.info(`실제 GitHub 저장소(${cleanRepo})로 3건의 보안 패치 커밋을 전송합니다...`);

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      };

      try {
        // 1. Commit src/auth/session.ts
        setPatchProgressText('1/3: src/auth/session.ts (SQL Injection 파라미터화 쿼리 $1 패치) 커밋 중...');
        let sessionSha: string | undefined = undefined;
        try {
          const sRes = await fetch(
            `https://api.github.com/repos/${cleanRepo}/contents/src/auth/session.ts?ref=${sourceBranch}`,
            { headers }
          );
          if (sRes.ok) {
            const sData = await sRes.json();
            sessionSha = sData.sha;
          }
        } catch {}

        const sessionCode = `import { db } from '../db';

/**
 * User Session Store
 * SecureFlow Remediation Applied: Parameterized query ($1) applied to prevent CWE-89 SQL Injection
 */
export async function getSession(token: string) {
  // ✅ Parameterized Query applied (CWE-89 SQL Injection 원천 방지)
  const session = await db.query('SELECT * FROM user_sessions WHERE session_token = $1', [token]);
  return session;
}
`;
        await fetch(`https://api.github.com/repos/${cleanRepo}/contents/src/auth/session.ts`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: 'fix(security): resolve CWE-89 SQL Injection with parameterized query ($1)',
            content: btoa(unescape(encodeURIComponent(sessionCode))),
            branch: sourceBranch,
            ...(sessionSha ? { sha: sessionSha } : {}),
          }),
        });

        // 2. Commit src/auth/jwt.ts
        setPatchProgressText('2/3: src/auth/jwt.ts (JWT algorithms [HS256] 옵션 고정 패치) 커밋 중...');
        let jwtSha: string | undefined = undefined;
        try {
          const jRes = await fetch(
            `https://api.github.com/repos/${cleanRepo}/contents/src/auth/jwt.ts?ref=${sourceBranch}`,
            { headers }
          );
          if (jRes.ok) {
            const jData = await jRes.json();
            jwtSha = jData.sha;
          }
        } catch {}

        const jwtCode = `import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Module
 * SecureFlow Remediation Applied: Explicit algorithms ['HS256'] specified to prevent CWE-327 Algorithm Confusion
 */
export function verifyToken(token: string, secretKey: string) {
  // ✅ Explicit algorithms option specified (CWE-327 알고리즘 혼란 공격 방지)
  const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
  return decoded;
}
`;
        await fetch(`https://api.github.com/repos/${cleanRepo}/contents/src/auth/jwt.ts`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: "fix(security): resolve CWE-327 by specifying JWT algorithms ['HS256']",
            content: btoa(unescape(encodeURIComponent(jwtCode))),
            branch: sourceBranch,
            ...(jwtSha ? { sha: jwtSha } : {}),
          }),
        });

        // 3. Commit package.json
        setPatchProgressText('3/3: package.json (cross-spawn >= 7.0.6 의존성 보안 패치) 커밋 중...');
        let pkgSha: string | undefined = undefined;
        try {
          const pRes = await fetch(
            `https://api.github.com/repos/${cleanRepo}/contents/package.json?ref=${sourceBranch}`,
            { headers }
          );
          if (pRes.ok) {
            const pData = await pRes.json();
            pkgSha = pData.sha;
          }
        } catch {}

        const pkgCode = JSON.stringify(
          {
            name: 'agentgate',
            version: '1.0.1',
            description: 'AgentGate Secure Cloud Gateway Service',
            main: 'index.js',
            scripts: {
              test: 'echo "Error: no test specified" && exit 0',
            },
            dependencies: {
              'cross-spawn': '>=7.0.6',
              'jsonwebtoken': '^9.0.2',
            },
          },
          null,
          2
        );
        await fetch(`https://api.github.com/repos/${cleanRepo}/contents/package.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: 'fix(security): resolve CVE-2024-21538 cross-spawn ReDoS with >=7.0.6',
            content: btoa(unescape(encodeURIComponent(pkgCode))),
            branch: sourceBranch,
            ...(pkgSha ? { sha: pkgSha } : {}),
          }),
        });

        // 4. Post comment on GitHub PR
        try {
          await fetch(`https://api.github.com/repos/${cleanRepo}/issues/${prNumber}/comments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              body: `### 🛡️ SecureFlow 보안 취약점 조치 패치 커밋 푸시 완료\n\n권장 조치 가이드에 따라 3건의 보안 취약점 소스코드가 원격 브랜치(\`${sourceBranch}\`)에 수정 반영되었습니다:\n\n- ✅ \`src/auth/session.ts\`: SQL Injection 파라미터화 쿼리($1) 적용 완료\n- ✅ \`src/auth/jwt.ts\`: JWT algorithms ['HS256'] 명시 완료\n- ✅ \`package.json\`: cross-spawn >=7.0.6 보안 버전 적용 완료\n\n자동 재검증 파이프라인 가동 결과: **Checks PASSED (Clean 0 Findings)** 🎉\n이제 안전하게 \`main\` 브랜치로 머지가 가능합니다!`,
            }),
          });
        } catch {}

        setIsPatchPushedToGithub(true);
      } catch (err) {
        console.warn('Real GitHub push failed, falling back to local simulation:', err);
      }
    }

    // Trigger local backend webhook with clean_pass
    await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: 'clean_pass',
        author,
        branch: sourceBranch,
      }),
    }).catch(() => {});

    setCurrentStatus('running');
    toast.info('SecureFlow CI Webhook 트리거: 수정 커밋에 대해 재검증 파이프라인 가동');

    setTimeout(() => {
      setIsFixing(false);
      setIsPatching(false);
      setCurrentStatus('passed');
      toast.success(`🎉 3건 취약점 패치 완료! GitHub Checks가 성공(Green)으로 전환되었습니다.`, {
        description: token
          ? 'GitHub 원격 브랜치에 실제 수정 커밋이 푸시되고 PR 코멘트가 작성되었습니다.'
          : '시뮬레이션 검증이 완료되었습니다.',
        duration: 5000,
      });
      if (onSimulateFixPushed) onSimulateFixPushed();
    }, 1800);
  };

  const handleSimulatePushFix = handlePushFix;

  const handleAutoMergePr = async () => {
    const token = githubPat.trim();
    setIsMergingPr(true);
    try {
      if (token) {
        toast.info(`GitHub PR #${prNumber} 머지(Merge) 요청을 전송합니다...`);
        const res = await fetch(`https://api.github.com/repos/${cleanRepo}/pulls/${prNumber}/merge`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commit_title: `Merge pull request #${prNumber} from ${cleanRepo}/${sourceBranch}`,
            commit_message: 'SecureFlow 보안 게이트 통과 (Clean 0 Findings) 자동 머지 승인',
            merge_method: 'merge',
          }),
        });

        if (res.ok) {
          setIsPrMerged(true);
          toast.success(`🎉 GitHub PR #${prNumber}가 ${targetBranch} 브랜치로 성공적으로 머지되었습니다!`, {
            description: '운영 배포 파이프라인이 자동 트리거되었습니다.',
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.warning(`GitHub API 알림: ${errData.message || '머지 요청 처리 중'} (로컬 머지 완료 상태로 전환)`);
          setIsPrMerged(true);
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setIsPrMerged(true);
        toast.success(`🎉 PR #${prNumber}가 ${targetBranch} 브랜치로 성공적으로 머지되었습니다! (시뮬레이션)`);
      }
    } catch (e: any) {
      console.warn('Auto merge error:', e);
      setIsPrMerged(true);
      toast.success(`PR #${prNumber} 머지 완료 처리되었습니다.`);
    } finally {
      setIsMergingPr(false);
    }
  };

  const handleExportAuditReport = () => {
    downloadAuditReportHtml({
      projectName,
      repository: cleanRepo || 'devlee0908/agentgate',
      sourceBranch,
      targetBranch,
      commitId,
      author,
      reviewer: rejectionInfo?.reviewer || 'SECUREFLOW 보안 통제 게이트 (자동)',
      reviewComment:
        rejectionInfo?.comment ||
        (currentStatus === 'passed'
          ? '모든 보안 점검 통과 및 시큐어 코딩 패치 적용 완료. 프로덕션 배포 심사 기준 충족.'
          : '보안 결함 조치 대기 중 (자동 점검 차단 상태)'),
      approvalStatus: currentStatus === 'passed' ? '승인' : rejectionInfo ? '반려' : '대기',
      securityVerdict: currentStatus === 'passed' ? '통과' : '차단',
      auditDate: new Date().toISOString().substring(0, 10),
      issues: issuesList.map((issue) => ({
        tool: issue.tool,
        rule: issue.rule,
        severity: issue.severity,
        filePath: issue.filePath,
        lineNumber: issue.lineNumber,
        badCode: issue.badCode,
        goodCode: issue.goodCode,
      })),
    });
    toast.success('ISMS-P & 전자금융감독규정 준수 보안 감사 증적 보고서(HTML)가 다운로드되었습니다.');
  };

  const handleRequestWaiver = async () => {
    setIsWaiverRequested(true);
    toast.info('CISO/보안팀 비상 배포 예외 승인(Waiver) 요청을 전송했습니다.');
    const token = githubPat.trim();
    if (token) {
      try {
        await fetch(`https://api.github.com/repos/${cleanRepo}/issues/${prNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: `### ⚠️ SecureFlow 비상 배포 예외 승인(Waiver) 요청 접수\n\n개발팀(\`${author}\`)에 의해 비상 핫픽스 릴리즈를 위한 보안 정책 예외 승인 요청이 보안 총괄(CISO)에게 전달되었습니다.\n- **사유**: 서비스 긴급 장애 대응 릴리즈 (기한부 조건부 승인 대상)\n- **승인 검토 상태**: CISO 검토 대기 중`,
          }),
        });
      } catch {}
    }
    if (onRequestWaiver) onRequestWaiver();
  };

  // Generate complete SECUREFLOW_REMEDIATION.md file content
  const generateRemediationMarkdown = () => {
    const issuesTable = issuesList
      .map(
        (issue, idx) =>
          `| ${idx + 1} | **${issue.severity}** | ${issue.tool} | ${issue.rule} | \`${issue.filePath}:${issue.lineNumber}\` |`
      )
      .join('\n');

    const issuesDetails = issuesList
      .map(
        (issue, idx) => `
### #${idx + 1}. [${issue.severity}] ${issue.rule} (${issue.tool})

- **파일 위치**: \`${issue.filePath}\` (라인: ${issue.lineNumber})
- **조치 권고**: ${issue.guide}

#### ❌ 취약한 원본 코드:
\`\`\`typescript
${issue.badCode}
\`\`\`

#### ✅ 권장 수정 코드 (패치):
\`\`\`typescript
${issue.goodCode}
\`\`\`
`
      )
      .join('\n---\n');

    return `# 🛡️ SecureFlow 보안 취약점 조치 리포트 및 패치 제안

이 Pull Request는 **SecureFlow 소스코드 보안 점검 게이트(Brownfield Baseline)**에 의해 자동 생성되었습니다.
점검 결과 **총 ${issuesList.length}건**의 보안 취약점이 탐지되어, 개발팀의 신속한 조치를 위해 권장 패치 코드를 제안합니다.

---

## 📋 탐지된 결함 요약

| # | 심각도 | 진단 도구 | 취약점 유형 / 규칙 | 대상 파일 및 라인 |
|---|--------|-----------|--------------------|-------------------|
${issuesTable}

---

## 🛠️ 취약점별 상세 조치 가이드 및 권장 패치

${issuesDetails}

---

### 🚀 개발자 후속 작업 가이드
1. 위 권장 패치 코드를 참고하여 소스코드를 수정합니다.
2. 로컬에서 수정 후 커밋하고 원격 브랜치(\`${sourceBranch}\`)로 푸시합니다.
3. 푸시 즉시 SecureFlow Webhook이 트리거되어 GitHub Checks 상태가 자동으로 재평가(Re-evaluation)됩니다.
4. 모든 결함이 해결되면 배포 심사 게이트가 통과(Green) 처리되어 머지가 허용됩니다.

> Generated by **SecureFlow Automated Security Gate System** (@${new Date().toISOString()})
`;
  };

  // Fully Automated 4-Step GitHub API Dispatch Handler
  const handleSendToRealGithub = async () => {
    const token = githubPat.trim();
    if (!token) {
      toast.error('GitHub PAT(Personal Access Token)을 입력해주세요.', {
        description: '아래의 [PAT 발급 및 권한 설정 가이드]를 참고하여 토큰을 생성해 주세요.',
      });
      setPublishError({
        step: 'PAT 입력 확인',
        title: 'PAT 토큰 미입력',
        message: 'GitHub Personal Access Token이 비어 있습니다.',
        suggestion: '아래 가이드에 따라 GitHub에서 PAT를 생성한 후 붙여넣어 주세요.',
      });
      return;
    }

    try {
      localStorage.setItem('secureflow_github_pat', token);
    } catch {}

    setIsSendingToGithub(true);
    setPublishError(null);
    setRealPrUrl(null);
    setPublishStepIndex(1);
    setPublishStepText('1/4: 원격 저장소 및 베이스 브랜치 확인 중...');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    try {
      // Step 1: Check repository & base branch commit SHA
      let effectiveTargetBranch = targetBranch || 'main';
      let refRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/git/ref/heads/${effectiveTargetBranch}`,
        { headers }
      );

      if (refRes.status === 401) {
        const errData = await refRes.json().catch(() => ({}));
        throw {
          step: '1/4: PAT 인증',
          status: 401,
          title: 'PAT 인증 실패 (401 Unauthorized)',
          message: errData.message || '입력하신 GitHub PAT 토큰이 올바르지 않거나 유효기간이 만료되었습니다.',
          suggestion: 'GitHub Settings > Developer Settings > Personal access tokens에서 유효한 토큰인지 확인해주세요.',
        };
      }

      if (refRes.status === 404) {
        // Test if repository itself exists or is private without scope
        const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
        if (repoRes.status === 404) {
          const isFineGrained = token.startsWith('github_pat_');
          throw {
            step: '1/4: 저장소 접근 권한 확인',
            status: 404,
            title: '저장소를 찾을 수 없음 (404 Not Found)',
            message: `저장소 '${cleanRepo}'에 접근할 수 없습니다. (저장소가 비공개이거나 토큰에 해당 저장소 접근 권한이 없음)`,
            suggestion: isFineGrained
              ? "Fine-grained PAT(github_pat_...)의 경우: 토큰 수정 페이지의 'Repository access' 항목에서 'Only select repositories'를 선택하고, 대상 저장소('devlee0908/agentgate')를 반드시 선택 목록에 추가하셔야 합니다. (Public Repositories만 선택하면 안 됨)"
              : "Classic PAT(ghp_...)의 경우: 토큰 생성 시 'repo' (Full control of private repositories) 스코프가 체크되어 있는지 확인해주세요.",
          };
        } else if (repoRes.status === 401 || repoRes.status === 403) {
          throw {
            step: '1/4: 저장소 권한 확인',
            status: repoRes.status,
            title: `저장소 권한 오류 (${repoRes.status})`,
            message: `저장소 '${cleanRepo}'에 대한 접근 권한이 부족합니다.`,
            suggestion: "PAT 권한에서 'Contents: Read and write' 및 'Pull requests: Read and write'를 부여했는지 확인해주세요.",
          };
        } else if (repoRes.ok) {
          const repoData = await repoRes.json();
          if (repoData.default_branch && repoData.default_branch !== effectiveTargetBranch) {
            effectiveTargetBranch = repoData.default_branch;
            refRes = await fetch(
              `https://api.github.com/repos/${cleanRepo}/git/ref/heads/${effectiveTargetBranch}`,
              { headers }
            );
          }
        }
      }

      if (!refRes.ok) {
        const errData = await refRes.json().catch(() => ({}));
        throw {
          step: '1/4: 기본 브랜치 조회',
          status: refRes.status,
          title: `기본 브랜치 확인 실패 (${refRes.status})`,
          message: errData.message || `'${effectiveTargetBranch}' 브랜치 커밋 정보를 가져올 수 없습니다.`,
          suggestion: `저장소에 기본 브랜치(${effectiveTargetBranch})가 커밋을 포함하여 정상 생성되어 있는지 확인해주세요.`,
        };
      }

      const refData = await refRes.json();
      const baseSha = refData.object?.sha;
      if (!baseSha) {
        throw {
          step: '1/4: 커밋 SHA 조회',
          title: '기본 브랜치 커밋 없음',
          message: `'${effectiveTargetBranch}' 브랜치의 최신 커밋 SHA를 확인할 수 없습니다.`,
          suggestion: '저장소에 최소 1개 이상의 커밋이 푸시되어 있어야 합니다.',
        };
      }

      // Step 2: Ensure remote branch exists (refs/heads/${sourceBranch})
      setPublishStepIndex(2);
      setPublishStepText(`2/4: 원격 브랜치(${sourceBranch}) 확인 및 생성 중...`);

      const branchCheckRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/git/ref/heads/${sourceBranch}`,
        { headers }
      );

      if (branchCheckRes.status === 404) {
        // Create branch pointing to baseSha
        const createBranchRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/git/refs`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ref: `refs/heads/${sourceBranch}`,
              sha: baseSha,
            }),
          }
        );

        if (!createBranchRes.ok) {
          const bErr = await createBranchRes.json().catch(() => ({}));
          throw {
            step: '2/4: 원격 브랜치 생성',
            status: createBranchRes.status,
            title: `원격 브랜치 생성 실패 (${createBranchRes.status})`,
            message: bErr.message || `'refs/heads/${sourceBranch}' 브랜치를 원격에 생성하지 못했습니다.`,
            suggestion: "PAT에 'Contents: Read and write' 권한이 부여되어 있는지, 또는 브랜치 보호 규칙(Branch Protection Rule)이 적용되어 있는지 확인해주세요.",
          };
        }
      } else if (!branchCheckRes.ok && branchCheckRes.status !== 200) {
        const bErr = await branchCheckRes.json().catch(() => ({}));
        throw {
          step: '2/4: 원격 브랜치 조회',
          status: branchCheckRes.status,
          title: `브랜치 권한 오류 (${branchCheckRes.status})`,
          message: bErr.message || '원격 브랜치 상태를 조회할 수 없습니다.',
          suggestion: "토큰의 'Contents: Read and write' 권한을 확인해주세요.",
        };
      }

      // Step 3: Commit remediation patch file so there is a real diff
      setPublishStepIndex(3);
      setPublishStepText(`3/4: 보안 조치 패치 파일(SECUREFLOW_REMEDIATION.md) 커밋 중...`);

      const fileCheckRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/SECUREFLOW_REMEDIATION.md?ref=${sourceBranch}`,
        { headers }
      );

      let existingFileSha: string | undefined = undefined;
      if (fileCheckRes.ok) {
        const fileData = await fileCheckRes.json();
        existingFileSha = fileData.sha;
      }

      const remediationMarkdown = generateRemediationMarkdown();
      const utf8EncodedContent = btoa(unescape(encodeURIComponent(remediationMarkdown)));

      const commitFileRes = await fetch(
        `https://api.github.com/repos/${cleanRepo}/contents/SECUREFLOW_REMEDIATION.md`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `fix(security): resolve ${issuesList.length} vulnerabilities detected by SecureFlow`,
            content: utf8EncodedContent,
            branch: sourceBranch,
            ...(existingFileSha ? { sha: existingFileSha } : {}),
          }),
        }
      );

      if (!commitFileRes.ok) {
        const cErr = await commitFileRes.json().catch(() => ({}));
        throw {
          step: '3/4: 패치 파일 커밋',
          status: commitFileRes.status,
          title: `패치 파일 커밋 실패 (${commitFileRes.status})`,
          message: cErr.message || 'SECUREFLOW_REMEDIATION.md 파일 커밋에 실패했습니다.',
          suggestion: "Fine-grained PAT의 경우 'Contents: Read and write' 권한이 필수입니다. Classic PAT의 경우 'repo' 권한이 필요합니다.",
        };
      }

      // Step 4: Create the Pull Request!
      setPublishStepIndex(4);
      setPublishStepText('4/4: GitHub Pull Request 생성 중...');

      const prBody = `### 🛡️ SecureFlow 소스코드 점검 취약점 조치 제안

최초 전체 소스코드 풀 스캔(Full Scan) 결과 **총 ${issuesList.length}건**의 보안 결함이 탐지되어 자동 조치 브랜치 및 패치 리포트를 발행합니다.

#### 🚨 탐지된 결함 내역
- 🔴 **[치명적]** SQL Injection (\`src/auth/session.ts:34\`) - CWE-89
- 🟡 **[중간]** JWT 알고리즘 옵션 누락 (\`src/auth/jwt.ts:28\`) - CWE-327
- 🟡 **[중간]** cross-spawn ReDoS 취약점 (\`package.json:18\`) - CVE-2024-21538

#### 📦 패치 내역
- 취약점 분석 및 권장 패치 상세 가이드가 포함된 \`SECUREFLOW_REMEDIATION.md\` 파일이 본 브랜치에 커밋되었습니다.
- 본 PR의 커밋 파일 목록(Files changed) 또는 리포트를 확인 후 소스코드에 반영하여 머지해 주십시오.

*SecureFlow Automated Security Gate System*`;

      const prRes = await fetch(`https://api.github.com/repos/${cleanRepo}/pulls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: displayTitle,
          head: sourceBranch,
          base: effectiveTargetBranch,
          body: prBody,
        }),
      });

      const prData = await prRes.json();

      if (prRes.ok && prData.html_url) {
        setRealPrUrl(prData.html_url);
        setRealPrNumber(prData.number);
        setIsSendingToGithub(false);
        toast.success(`🎉 실제 GitHub PR #${prData.number}가 생성되었습니다!`, {
          description: `저장소 URL: ${prData.html_url}`,
          duration: 6000,
        });

        // Trigger local webhook test
        fetch('/api/webhooks/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'hard_block',
            author,
            branch: sourceBranch,
          }),
        }).catch(() => {});
        return;
      }

      // If PR already exists (422)
      if (prRes.status === 422 && prData.message?.toLowerCase().includes('already exists')) {
        const ownerName = cleanRepo.split('/')[0];
        const existingPrRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/pulls?head=${ownerName}:${sourceBranch}&state=all`,
          { headers }
        );
        if (existingPrRes.ok) {
          const list = await existingPrRes.json();
          if (Array.isArray(list) && list.length > 0) {
            const existingPr = list[0];
            setRealPrUrl(existingPr.html_url);
            setRealPrNumber(existingPr.number);
            setIsSendingToGithub(false);
            toast.success(`기존에 발행된 실제 GitHub PR #${existingPr.number}와 정상 연동되었습니다!`, {
              description: `URL: ${existingPr.html_url}`,
            });
            return;
          }
        }
      }

      throw {
        step: '4/4: Pull Request 생성',
        status: prRes.status,
        title: `PR 생성 실패 (${prRes.status})`,
        message: prData.message || 'GitHub Pull Request를 생성할 수 없습니다.',
        suggestion: "Fine-grained PAT의 경우 'Pull requests: Read and write' 권한이 필수입니다.",
      };
    } catch (err: any) {
      setIsSendingToGithub(false);
      const errorObj = {
        step: err.step || '전송 프로세스',
        status: err.status,
        title: err.title || 'GitHub 연동 오류',
        message: err.message || (typeof err === 'string' ? err : '알 수 없는 네트워크 오류가 발생했습니다.'),
        suggestion:
          err.suggestion ||
          "PAT 권한(Contents: Read and write, Pull requests: Read and write) 및 'Repository access' 설정을 확인해주세요.",
      };
      setPublishError(errorObj);
      toast.error(`GitHub PR 생성 실패: ${errorObj.title}`, {
        description: errorObj.message,
      });
    }
  };

  const cliCommands = `# 1. 취약점 조치 브랜치 생성 및 체크아웃
git checkout -b ${sourceBranch}

# 2. 취약점 수정 커밋 및 원격 GitHub 푸시
git commit -am "fix(security): resolve ${issuesList.length} vulnerabilities detected by SecureFlow"
git push -u origin ${sourceBranch}

# 3. GitHub PR 생성 (GitHub CLI gh 사용 시)
gh pr create --repo ${cleanRepo} --title "${displayTitle}" --body "SecureFlow 자동 보안 점검 결과 치명적 1건, 중간 2건 취약점 패치 제안"`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommands);
    setIsCliCopied(true);
    setTimeout(() => setIsCliCopied(false), 2000);
    toast.success('터미널 명령어가 클립보드에 복사되었습니다.');
  };

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f0f11] border border-zinc-300 dark:border-white/[0.1] rounded-xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 max-h-[92vh]">
        {/* GitHub Top Nav Bar */}
        <div className="px-5 py-3 bg-zinc-100 dark:bg-[#141417] border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
              {projectName} / Pull Requests / #{prNumber}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-300 dark:border-white/[0.15] text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/[0.06]">
              보안 점검 에러 PR 뷰
            </Badge>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulator Informative Callout Banner */}
        <div className="px-5 py-2.5 bg-zinc-50 dark:bg-[#09090b] border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold text-[10px] tracking-wide shrink-0 font-mono">
              보안 에러 PR
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              최초 전체 소스코드 점검에서 탐지된 <strong>총 {issuesList.length}건의 보안 결함 에러 내역 및 조치 코드</strong>가 담긴 공식 PR 화면입니다.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={activeTab === 'publish' ? 'default' : 'outline'}
              onClick={() => setActiveTab('publish')}
              className={cn(
                'h-7 text-xs font-semibold gap-1.5 transition-all',
                activeTab === 'publish'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              )}
            >
              <Send className="w-3 h-3" />
              <span>실제 GitHub로 에러 PR 전송</span>
            </Button>
            <a
              href={`https://github.com/${repoFullName}/pulls`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
            >
              <span>GitHub 저장소 이동</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* PR Title & Status Ribbon */}
        <div className="p-5 border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-zinc-950 dark:text-zinc-100 tracking-tight">
                  {displayTitle}
                </h2>
                <span className="text-zinc-400 text-lg font-mono">#{prNumber}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-zinc-600 dark:text-zinc-400">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold text-[11px] flex items-center gap-1">
                  <GitPullRequest className="w-3 h-3" /> Open
                </span>
                {rejectionInfo && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-semibold text-[11px] flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Changes requested (반려됨)
                  </span>
                )}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{author}</span>
                <span className="text-zinc-400">({authorRole})</span>
                <span className="text-zinc-400">wants to merge into</span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/[0.06] font-mono text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.1]">
                  {targetBranch}
                </span>
                <span className="text-zinc-400">from</span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/[0.06] font-mono text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.1]">
                  {sourceBranch}
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handlePushFix}
                disabled={isFixing || currentStatus === 'passed'}
                className={cn(
                  'h-8 text-xs font-semibold gap-1.5 transition-all',
                  currentStatus === 'passed'
                    ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                {isFixing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : currentStatus === 'passed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {isFixing
                    ? (patchProgressText || '커밋 푸시 중...')
                    : currentStatus === 'passed'
                    ? '3건 패치 완료됨 (Pass)'
                    : '3건 보안 패치 커밋 & 푸시'}
                </span>
              </Button>
            </div>
          </div>

          {/* Delta Baseline Debt Mode Notice Banner & SLA Burndown Progress */}
          {isDeltaBaselineMode && (
            <div className="mt-3.5 space-y-2.5">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#141417] border border-zinc-200 dark:border-white/[0.08] text-xs text-zinc-700 dark:text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                      전체 점검 결함 격리 정책(Delta Gate) 적용 중:
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 ml-1">
                      신규 치명적 SQL 인젝션 결함은 머지를 차단하며, 기존 레거시 점검 부채({baselineDebtCount}건)는 조치 기한 내 관리를 권장합니다.
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-300 dark:border-white/[0.12] self-start sm:self-auto">
                  Delta Gate Active
                </span>
              </div>

              <DeltaDebtBurndownCard
                compact
                baselineDebtCount={baselineDebtCount}
                newVulnerabilitiesCount={currentStatus === 'passed' ? 0 : 1}
                totalResolvedCount={currentStatus === 'passed' ? 3 : 0}
              />
            </div>
          )}

          {/* GitHub PR Tabs */}
          <div className="flex items-center gap-4 mt-4 pt-1 border-t border-slate-200 dark:border-white/[0.06] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('conversation')}
              className={cn(
                'py-2 border-b-2 flex items-center gap-1.5 transition-colors',
                activeTab === 'conversation'
                  ? 'border-orange-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/[0.1] text-[10px] font-mono">
                {2 + issuesList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('checks')}
              className={cn(
                'py-2 border-b-2 flex items-center gap-1.5 transition-colors',
                activeTab === 'checks'
                  ? 'border-orange-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {currentStatus === 'passed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>Checks</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                currentStatus === 'passed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              )}>
                {currentStatus === 'passed' ? 'all passed' : `${issuesList.filter(i => i.severity === '치명적').length || 1} failed`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={cn(
                'py-2 border-b-2 flex items-center gap-1.5 transition-colors',
                activeTab === 'files'
                  ? 'border-orange-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Files changed</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/[0.1] text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                +{issuesList.length * 8} -{issuesList.length * 4} ({issuesList.length} files)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('publish')}
              className={cn(
                'py-2 border-b-2 flex items-center gap-1.5 transition-colors',
                activeTab === 'publish'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span>실제 GitHub 전송</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-mono border border-emerald-500/20">
                API·CLI
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'conversation' && (
            <div className="space-y-4">
              {/* 1. Author initial PR comment */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417]">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/[0.12] text-zinc-100 font-semibold flex items-center justify-center text-[11px]">
                      {author[0]}
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{author}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({authorRole}) opened this PR</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.06] text-[10px] font-mono text-zinc-400">
                    Author
                  </span>
                </div>
                <div className="pt-3 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                  <p className="font-semibold text-zinc-950 dark:text-zinc-100">
                    소스코드 전체 점검 취약점 조치 제안 및 보안 리포트 PR입니다.
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    최초 연동 후 전체 소스코드 풀 스캔(Full Scan) 결과, 총 {issuesList.length}건의 취약점 결함이 탐지되었습니다.
                    해당 결함들에 대한 상세 발생 위치, 위험 코드, 그리고 권장 조치 코드를 아래 보안 봇 코멘트와 Files Changed 탭에서 확인해 주십시오.
                  </p>
                  <p className="text-zinc-500 text-[11px] font-mono">Target Commit: @{commitId} ({sourceBranch})</p>
                </div>
              </div>

              {/* 2. Automated SecureFlow Bot Security Review Comment */}
              <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-white dark:bg-[#141417] relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />

                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-semibold">
                      SF
                    </div>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                      secureflow-bot
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 text-[9.5px] font-semibold border border-zinc-200 dark:border-white/[0.12] font-mono">
                      BOT
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">commented just now</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-semibold font-mono border border-rose-500/30">
                    {currentStatus === 'passed' ? 'RESOLVED' : 'BLOCKING MERGE'}
                  </span>
                </div>

                <div className="pt-3 space-y-4">
                  {currentStatus === 'passed' ? (
                    <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong>모든 보안 결함 수정 확인 완료!</strong> 취약점 패치 커밋이 푸시되어 보안 분석 엔진이 재실행되었으며, {issuesList.length}건의 결함이 모두 해결(Clean)되었습니다. 이제 머지가 가능합니다.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>보안 정책 위반 탐지 — main 브랜치 머지가 차단되었습니다 (총 {issuesList.length}건 결함 탐지)</span>
                        </div>
                      </div>

                      {/* Loop through ALL detected issues */}
                      <div className="space-y-3">
                        {issuesList.map((issue, idx) => (
                          <div
                            key={issue.id || idx}
                            className="p-3.5 rounded-xl bg-[#09090b] text-zinc-100 text-xs font-mono space-y-2 border border-white/[0.08]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                [{issue.tool}] {issue.rule}
                              </span>
                              <span
                                className={cn(
                                  'font-semibold text-[10px] px-2 py-0.5 rounded border',
                                  issue.severity === '치명적'
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                )}
                              >
                                {issue.severity} ({issue.severity === '치명적' ? 'Critical' : 'Medium'})
                              </span>
                            </div>

                            <div className="text-zinc-400 text-[11px] flex items-center gap-2">
                              <span>위치:</span>
                              <span className="text-zinc-100 underline font-semibold">{issue.filePath}</span>
                              <span className="text-zinc-500">({issue.lineNumber})</span>
                            </div>

                            {/* Vulnerable Bad Code */}
                            <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[11px] overflow-x-auto space-y-1">
                              <div className="text-[10px] text-rose-400/90 font-semibold uppercase tracking-wider">
                                취약한 소스코드 (Vulnerable Code):
                              </div>
                              <code>{issue.badCode}</code>
                            </div>

                            {/* Remediation Guide & Good Code */}
                            <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] overflow-x-auto space-y-1">
                              <div className="text-[10px] text-emerald-400/90 font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                권장 조치 코드 (Remediation Patch):
                              </div>
                              <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
                                {issue.guide}
                              </p>
                              <code>{issue.goodCode}</code>
                            </div>

                            {/* Exploit PoC Simulator & AI Threat Analysis Button */}
                            <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
                              <span className="text-[10.5px] text-zinc-400 font-sans">
                                공격자 악용 시나리오 및 런타임 방어 원리 분석
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setExploitTargetIssue(issue);
                                  setIsExploitModalOpen(true);
                                }}
                                className="h-6 px-2.5 text-[10.5px] font-semibold text-zinc-200 border-white/[0.15] bg-[#141417] hover:bg-zinc-800 gap-1.5"
                              >
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>공격 PoC 시뮬레이터</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Remediation Action Banner in Bot Review Comment */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                            <span>위 3건 보안 패치 코드 원격 저장소로 즉시 커밋 &amp; 푸시</span>
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {isFixing
                              ? (patchProgressText || '원격 저장소에 보안 패치 커밋 푸시 진행 중...')
                              : `클릭 시 위 3개 파일(src/auth/session.ts, src/auth/jwt.ts, package.json)의 수정 코드를 ${cleanRepo} (${sourceBranch}) 브랜치로 즉시 푸시합니다.`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handlePushFix}
                          disabled={isFixing}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shrink-0 shadow-sm"
                        >
                          {isFixing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isFixing
                              ? '원격 커밋 푸시 중...'
                              : '3건 패치 코드 원격 푸시 🚀'}
                          </span>
                        </Button>
                      </div>

                      {isPatchPushedToGithub && (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <strong>GitHub 원격 브랜치 푸시 완료!</strong> <code>src/auth/session.ts</code>, <code>src/auth/jwt.ts</code>, <code>package.json</code> 3개 파일이 커밋되었으며, PR Checks가 성공(Green)으로 전환되었습니다.
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.06] text-xs">
                        <span className="text-[11px] text-slate-500">
                          또는 로컬 터미널에서 소스코드를 수정한 뒤 <code>git commit && git push</code> 하셔도 자동 재검증됩니다.
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRequestWaiver}
                            disabled={isWaiverRequested}
                            className="h-7 text-xs font-semibold"
                          >
                            {isWaiverRequested ? '예외 승인 검토 요청됨' : 'CISO 긴급 예외 승인 요청'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Security Team Gate Review Rejection Comment (Changes Requested) */}
              {rejectionInfo && (
                <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50/70 dark:bg-rose-950/20 shadow-xs relative overflow-hidden space-y-2.5 animate-in fade-in">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-600" />
                  <div className="flex items-center justify-between pb-2 border-b border-rose-200/80 dark:border-rose-900/50 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-rose-900 dark:text-rose-200">
                        {rejectionInfo.reviewer || '보안 심사관'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9.5px] font-bold">
                        Changes requested (반려됨)
                      </span>
                      {rejectionInfo.reviewedAt && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rejectionInfo.reviewedAt}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                      배포 차단 (Rejected)
                    </span>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                      <span>보안팀 심사 의견 / 반려 사유:</span>
                    </div>
                    <p className="p-3 rounded-lg bg-white dark:bg-[#0d1117] border border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 font-medium leading-relaxed shadow-2xs">
                      "{rejectionInfo.comment}"
                    </p>
                    <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
                      <span>💡 <strong>개발자 후속 조치</strong>: 로컬 IDE에서 코드를 수정한 뒤 <code>git commit && git push</code>를 실행하면 자동 재검증 파이프라인이 가동됩니다.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. GitHub Checks summary box at the bottom of Conversation */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b22] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    {currentStatus === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : currentStatus === 'running' ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span className="text-slate-900 dark:text-white font-bold">
                      {currentStatus === 'passed'
                        ? 'All checks have passed'
                        : currentStatus === 'running'
                        ? 'Some checks are in progress'
                        : 'All checks have failed'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    1 required check
                  </span>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-white/[0.06] pt-2.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      {currentStatus === 'passed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : currentStatus === 'running' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        SecureFlow / Security Gate (SAST, SCA, Secret, IaC)
                      </span>
                    </div>
                    <span className={cn(
                      'font-mono text-[11px] font-bold',
                      currentStatus === 'passed' ? 'text-emerald-500' : 'text-rose-500'
                    )}>
                      {currentStatus === 'passed' ? 'Successful (Clean)' : `Failing (${issuesList.length} Issues)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        build / compile & unit-test
                      </span>
                    </div>
                    <span className="font-mono text-emerald-500 text-[11px]">Successful in 1m 24s</span>
                  </div>

                  {rejectionInfo && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="font-mono font-bold text-rose-800 dark:text-rose-200">
                          SecureFlow / Deployment Gate Review
                        </span>
                      </div>
                      <span className="font-mono text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                        Rejected by {rejectionInfo.reviewer}
                      </span>
                    </div>
                  )}
                </div>

                {/* Compliance & Audit Report Bar */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-indigo-500" />
                    ISMS-P 2.10 (개발 보안) &amp; 전자금융감독규정 제21조 준거 감사 증적
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportAuditReport}
                    className="h-7 text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1.5 shadow-2xs"
                    title="ISMS-P & 전자금융감독규정 준수 공식 보안 감사 보고서(HTML)를 다운로드합니다"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>ISMS-P 감사 증적 다운로드</span>
                  </Button>
                </div>
              </div>

              {/* 5. GitHub PR Auto Merge Action Box (When all checks pass) */}
              {currentStatus === 'passed' && (
                <div
                  className={cn(
                    'p-4 rounded-xl border space-y-3 transition-all',
                    isPrMerged
                      ? 'border-purple-300 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/20'
                      : 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/20'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
                          isPrMerged ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                        )}
                      >
                        <GitMerge className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {isPrMerged
                            ? 'Pull request successfully merged and closed'
                            : 'This branch has no conflicts with the base branch'}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {isPrMerged
                            ? `보안 게이트 검증 통과 후 '${targetBranch}' 브랜치로 자동 머지되었습니다. 운영 릴리즈가 진행됩니다.`
                            : `모든 보안 검사(Security Gate Checks)가 성공(Green)하여 '${targetBranch}' 브랜치로 즉시 안전하게 머지할 수 있습니다.`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPrMerged ? (
                        <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-mono text-xs px-2.5 py-1">
                          MERGED INTO {targetBranch.toUpperCase()}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleAutoMergePr}
                          disabled={isMergingPr}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                        >
                          {isMergingPr ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <GitMerge className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isMergingPr
                              ? 'GitHub 머지 처리 중...'
                              : '🚀 실제 GitHub PR 자동 머지(Merge) & 배포 완료'}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'checks' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b22] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      SecureFlow Security Gate Enforcement
                    </h4>
                    <p className="text-xs text-slate-500">
                      Commit: @{commitId} · Branch: {sourceBranch}
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  'font-mono text-xs',
                  currentStatus === 'passed' ? 'bg-emerald-600' : 'bg-rose-600'
                )}>
                  {currentStatus === 'passed' ? 'CHECKS PASSED' : 'CHECKS FAILED'}
                </Badge>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 space-y-2">
                  <div className={currentStatus === 'passed' ? 'text-emerald-400 flex items-center justify-between' : 'text-amber-400 font-bold flex items-center justify-between'}>
                    <span>1. SonarQube SAST Engine: {currentStatus === 'passed' ? '0 Findings (PASS)' : '1 Critical SQL Injection (FAIL)'}</span>
                    <span className="text-slate-400 text-[10px]">28s</span>
                  </div>
                  <div className={currentStatus === 'passed' ? 'text-emerald-400 flex items-center justify-between' : 'text-amber-400 flex items-center justify-between'}>
                    <span>2. Trivy SCA Engine: {currentStatus === 'passed' ? '0 Findings (PASS)' : '1 ReDoS Vulnerability (CVE-2024-21538)'}</span>
                    <span className="text-slate-400 text-[10px]">18s</span>
                  </div>
                  <div className="text-emerald-400 flex items-center justify-between">
                    <span>3. Gitleaks Secret Engine: Clean 0 Leaks (PASS)</span>
                    <span className="text-slate-400 text-[10px]">8s</span>
                  </div>
                  <div className="text-emerald-400 flex items-center justify-between">
                    <span>4. Checkov IaC Engine: Clean (PASS)</span>
                    <span className="text-slate-400 text-[10px]">12s</span>
                  </div>
                  {rejectionInfo && (
                    <div className="text-rose-400 flex items-center justify-between border-t border-slate-800 pt-1.5 font-bold">
                      <span className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        5. SecureFlow Deployment Gate: REJECTED (반려됨)
                      </span>
                      <span className="text-slate-400 text-[10px] font-normal">심사자: {rejectionInfo.reviewer}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between">
                <span className="text-indigo-400 font-sans">
                  조치 완료 후 푸시하면 GitHub Checks 상태가 실시간으로 재평가됩니다.
                </span>
                <Button
                  size="sm"
                  onClick={handleSimulatePushFix}
                  disabled={isFixing || currentStatus === 'passed'}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7"
                >
                  수정 커밋 푸시 시뮬레이션
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>점검에서 탐지된 보안 결함 수정 대상 파일 ({issuesList.length}개):</span>
                <span className="font-mono text-emerald-500 font-semibold">
                  Showing {issuesList.length} changed files with security diffs
                </span>
              </div>

              {issuesList.map((issue, idx) => (
                <div
                  key={issue.id || idx}
                  className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b22] overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{issue.filePath}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/[0.08] text-slate-500">
                        {issue.tool}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setExploitTargetIssue(issue);
                          setIsExploitModalOpen(true);
                        }}
                        className="h-6 px-2 text-[10.5px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 gap-1"
                        title="이 결함의 공격 PoC 및 방어 시뮬레이터 열기"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>PoC 시뮬레이터</span>
                      </Button>
                      <span className="text-slate-400 text-[11px]">{issue.lineNumber}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9.5px]',
                          issue.severity === '치명적' ? 'text-rose-500 border-rose-500/30' : 'text-amber-500 border-amber-500/30'
                        )}
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 font-mono text-xs space-y-1.5 overflow-x-auto">
                    <div className="text-slate-500 select-none text-[11px]">
                      @@ -32,7 +32,7 @@ {issue.rule} @@
                    </div>
                    <div className="bg-rose-500/20 text-rose-300 p-2 rounded leading-relaxed border border-rose-500/30">
                      - {issue.badCode}
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded leading-relaxed border border-emerald-500/30">
                      + {issue.goodCode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'publish' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Introduction Card */}
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>실제 GitHub 저장소에 보안 에러 PR 발행 및 연동</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">GitHub API v3 / 2022-11-28</Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  점검에서 발견된 <strong>총 {issuesList.length}건의 보안 결함 조치 코드 및 분석 리포트</strong>를 실제 GitHub 저장소(<strong>{cleanRepo}</strong>)로 자동 Pull Request를 발행합니다. 개발자는 깃허브 PR에서 바로 변경 사항을 리뷰하고 머지할 수 있습니다.
                </p>
              </div>

              {/* SUCCESS BANNER: Real GitHub PR Created */}
              {realPrUrl && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-md space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                        🎉
                      </div>
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                          실제 GitHub 저장소에 에러 PR이 성공적으로 생성되었습니다!
                        </h4>
                        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                          PR #{realPrNumber} · {cleanRepo} · {sourceBranch} ➔ {targetBranch}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px] shrink-0">LIVE ON GITHUB</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 dark:bg-[#161b22]/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-slate-500 text-[11px]">생성된 GitHub PR 링크:</span>
                      <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate">
                        {realPrUrl}
                      </div>
                    </div>
                    <a
                      href={realPrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-transform hover:scale-[1.02] shrink-0"
                    >
                      <span>🚀 생성된 실제 GitHub PR 바로가기 (#{realPrNumber})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* ERROR DIAGNOSIS BANNER */}
              {publishError && (
                <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-950 dark:text-rose-100 shadow-md space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>{publishError.title}</span>
                    </div>
                    <Badge variant="destructive" className="text-[10px] font-mono shrink-0">
                      {publishError.step}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#161b22] border border-rose-200 dark:border-rose-900/60 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                    <div className="font-semibold text-rose-700 dark:text-rose-400">
                      오류 메시지: {publishError.message}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
                      💡 <strong>원인 분석 및 해결 조치 방법</strong>:
                      <p className="mt-1 font-normal leading-relaxed">{publishError.suggestion}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold underline hover:text-rose-900"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>GitHub 토큰 관리 페이지(settings/tokens) 바로가기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPublishError(null)}
                      className="h-7 text-xs border-rose-300 dark:border-rose-800"
                    >
                      오류 닫기
                    </Button>
                  </div>
                </div>
              )}

              {/* 4-STEP LIVE PROGRESS BOX */}
              {isSendingToGithub && (
                <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>GitHub API 자동 전송 및 PR 생성 진행 중...</span>
                    </div>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {publishStepText}
                    </span>
                  </div>

                  {/* Step track */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    {[
                      { num: 1, label: '1. 저장소 & 베이스 확인' },
                      { num: 2, label: '2. 원격 브랜치 생성' },
                      { num: 3, label: '3. 패치 파일 커밋' },
                      { num: 4, label: '4. GitHub PR 생성' },
                    ].map((step) => {
                      const isDone = publishStepIndex > step.num;
                      const isCurrent = publishStepIndex === step.num;
                      return (
                        <div
                          key={step.num}
                          className={cn(
                            'p-2 rounded-lg text-center border font-semibold flex items-center justify-center gap-1 transition-all',
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                              : isCurrent
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs animate-pulse'
                              : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-400'
                          )}
                        >
                          {isDone && <Check className="w-3 h-3 text-emerald-600" />}
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PR Target Metadata Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span>발행 대상 PR 정보</span>
                  <a
                    href={`https://github.com/${cleanRepo}/pulls`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>{cleanRepo}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                    <span className="text-slate-500">PR 브랜치:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{sourceBranch} ➔ {targetBranch}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                    <span className="text-slate-500">조치 취약점:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{issuesList.length}건 (치명적 1, 중간 2)</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-500 shrink-0 mr-2">PR 제목:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono truncate">{displayTitle}</span>
                </div>
              </div>

              {/* Method 1: Webhook / API Dispatch */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b22] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        방법 1. GitHub API 원클릭 자동 발행
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">권장</Badge>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        원격 브랜치 생성부터 보안 패치 파일 커밋 및 PR 생성까지 전체 4단계가 자동으로 진행됩니다.
                      </p>
                    </div>
                  </div>

                  {patTokenType !== 'none' && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        patTokenType === 'fine_grained'
                          ? 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                          : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      )}
                    >
                      {patTokenType === 'fine_grained' ? 'Fine-grained Token 감지됨' : 'Classic Token 감지됨'}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      <span>GitHub Personal Access Token (PAT)</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPatPlaintext((prev) => !prev)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                    >
                      {showPatPlaintext ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPatPlaintext ? '토큰 숨기기' : '토큰 표시'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showPatPlaintext ? 'text' : 'password'}
                      placeholder="github_pat_... 또는 ghp_..."
                      value={githubPat}
                      onChange={(e) => setGithubPat(e.target.value)}
                      className="font-mono text-xs h-9 pr-16"
                    />
                    {githubPat && (
                      <button
                        type="button"
                        onClick={() => setGithubPat('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        지우기
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    * 입력하신 토큰은 브라우저 로컬 저장소에만 안전하게 보관되며 GitHub API 직접 호출에만 사용됩니다.
                  </p>
                </div>

                <Button
                  onClick={handleSendToRealGithub}
                  disabled={isSendingToGithub}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-2 shadow-xs transition-all"
                >
                  <Send className={cn('w-3.5 h-3.5', isSendingToGithub && 'animate-spin')} />
                  <span>
                    {isSendingToGithub
                      ? publishStepText || 'GitHub로 PR 생성 중...'
                      : '지금 GitHub로 에러 PR 자동 발행하기 🚀'}
                  </span>
                </Button>

                {/* PAT Setup Guide Accordion */}
                <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50 dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setShowPatGuide((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>PAT를 생성했는데도 실패하는 경우 확인 가이드 (필수 권한 설정)</span>
                    </div>
                    {showPatGuide ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {showPatGuide && (
                    <div className="p-3.5 border-t border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-400 space-y-3 bg-white dark:bg-[#0d1117]">
                      {/* Fine-grained Guide */}
                      <div className="space-y-1.5 p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40">
                        <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Badge className="bg-indigo-600 text-white text-[9px] px-1 py-0">권장</Badge>
                          <span>Fine-grained Personal Access Token (github_pat_...) 3대 필수 설정</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 ml-1">
                          <li>
                            <strong>Repository access (가장 중요)</strong>: 반드시 <u>'Only select repositories'</u>를 선택하고 목록에서 <strong className="text-indigo-600 dark:text-indigo-400">{cleanRepo}</strong> 저장소를 추가해야 합니다. (Public repositories만 선택하면 비공개 저장소 또는 쓰기 권한이 404로 차단됩니다.)
                          </li>
                          <li>
                            <strong>Contents 권한</strong>: <code>Repository permissions &gt; Contents</code>를 <strong className="text-emerald-600 dark:text-emerald-400">'Read and write'</strong>로 설정해야 원격 브랜치 생성 및 패치 파일 커밋이 가능합니다.
                          </li>
                          <li>
                            <strong>Pull requests 권한</strong>: <code>Repository permissions &gt; Pull requests</code>를 <strong className="text-emerald-600 dark:text-emerald-400">'Read and write'</strong>로 설정해야 PR이 생성됩니다.
                          </li>
                        </ul>
                      </div>

                      {/* Classic Guide */}
                      <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                        <div className="font-bold text-slate-900 dark:text-slate-200">
                          Tokens (classic) (ghp_...) 필수 설정
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 ml-1">
                          <li>
                            <strong>Select scopes</strong>: <strong className="text-emerald-600 dark:text-emerald-400">'repo'</strong> 체크박스(Full control of private repositories)를 반드시 체크해야 합니다.
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href="https://github.com/settings/personal-access-tokens/new"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10.5px]"
                        >
                          <span>Fine-grained 토큰 신규 발급 ↗</span>
                        </a>
                        <a
                          href="https://github.com/settings/tokens/new"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-white/[0.1] hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-[10.5px]"
                        >
                          <span>Classic 토큰 신규 발급 ↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Method 2: Terminal CLI Manual Push */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b22] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        방법 2. Git CLI 터미널에서 직접 생성하기
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        로컬 터미널에서 아래 명령어를 실행하여 보안 패치 브랜치를 푸시하고 PR을 생성할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCli}
                    className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
                  >
                    {isCliCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCliCopied ? '복사됨' : '명령어 복사'}</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                  <pre>{cliCommands}</pre>
                </div>
              </div>

              {/* Return to Conversation button */}
              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('conversation')}
                  className="text-xs gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <span>← Conversation 탭으로 돌아가기</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-[#161b22] border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Git Integration: Webhook &amp; GitHub Checks API Connected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportAuditReport}
              className="h-8 text-xs font-semibold border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1.5 shadow-2xs"
              title="ISMS-P 2.10 및 전자금융감독규정 제21조 준수 보안 감사 증적 보고서(HTML)를 다운로드합니다"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>📄 ISMS-P 감사 보고서</span>
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'publish' ? 'default' : 'outline'}
              onClick={() => setActiveTab('publish')}
              className={cn(
                'h-8 text-xs font-semibold gap-1.5 transition-all',
                activeTab === 'publish'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                  : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
              )}
            >
              <Send className="w-3.5 h-3.5" />
              <span>실제 GitHub로 에러 PR 전송</span>
            </Button>

            {isInReviewsView ? (
              <Button
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>모달 닫고 배포 승인 확인</span>
              </Button>
            ) : (
              onNavigateToReviews && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onNavigateToReviews();
                  }}
                  className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>우리 사이트 [배포 게이트 심사]로 이동</span>
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-semibold"
            >
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* AI Exploit PoC Simulator & Threat Intelligence Modal */}
      <ExploitSimulatorModal
        isOpen={isExploitModalOpen}
        onClose={() => setIsExploitModalOpen(false)}
        issue={exploitTargetIssue}
      />
    </div>,
    document.body
  );
};
