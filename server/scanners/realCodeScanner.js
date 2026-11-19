import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  'data',
]);

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java']);
const IAC_EXTS = new Set(['.tf', '.tfvars', '.yaml', '.yml']);

const MAX_FILES = 400;
const MAX_FILE_BYTES = 256 * 1024; // 256KB per file

/**
 * Calculate Shannon entropy to detect high-entropy secrets/tokens.
 */
export function calculateShannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = Object.create(null);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const SAST_RULES = [
  {
    id: 'CWE-89',
    title: 'SQL Injection 취약점 패턴 탐지 (CWE-89)',
    severity: '치명적',
    pattern: /(?:db\.query|pool\.query|sequelize\.query|execute)\s*\(\s*`[^`]*\$\{/,
    description: '템플릿 리터럴(${...})을 통해 사용자 입력값이 SQL 쿼리에 직접 결합되고 있습니다.',
    remediation: '파라미터화된 쿼리(Prepared Statement) 바인딩($1, ?)을 사용하십시오.',
  },
  {
    id: 'CWE-78',
    title: 'OS Command Injection 위험 (CWE-78)',
    severity: '치명적',
    pattern: /(?:child_process\.)?(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{|[^'"\n]+\+)/,
    description: '동적 문자열이 셸 명령어 실행 함수(exec/execSync)에 전달되고 있습니다.',
    remediation: 'execFile / spawnSync에 인자 배열을 전달하고 셸 인터프리터 실행을 피하십시오.',
  },
  {
    id: 'CWE-94',
    title: '동적 코드 실행(eval / new Function) 사용 (CWE-94)',
    severity: '높음',
    pattern: /\b(?:eval|new\s+Function)\s*\(/,
    description: '임의의 문자열을 코드로 실행할 수 있는 eval/Function 생성자가 사용되었습니다.',
    remediation: 'JSON.parse 또는 정적 매핑 테이블로 대체하십시오.',
  },
  {
    id: 'CWE-79',
    title: 'DOM XSS 위험: dangerouslySetInnerHTML / innerHTML (CWE-79)',
    severity: '중간',
    pattern: /(?:dangerouslySetInnerHTML\s*=|\.innerHTML\s*=)/,
    description: '살균(Sanitize)되지 않은 HTML 문자열이 DOM에 직접 삽입될 수 있습니다.',
    remediation: 'DOMPurify 등으로 입력값을 정제하거나 안전한 JSX 텍스트 바인딩을 사용하십시오.',
  },
  {
    id: 'CWE-327',
    title: '취약한 해시 알고리즘(MD5/SHA1) 또는 JWT 알고리즘 미고정 (CWE-327)',
    severity: '중간',
    pattern: /(?:createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)|jwt\.verify\s*\([^,]+,\s*[^,)]+\s*\))/,
    description: '취약한 해시 알고리즘(MD5/SHA1) 또는 JWT 검증 시 algorithms 옵션이 누락되었습니다.',
    remediation: 'SHA-256 이상을 사용하고 jwt.verify 호출 시 { algorithms: ["HS256"] }를 명시하십시오.',
  },
];

const SECRET_RULES = [
  {
    id: 'SEC-AWS-KEY',
    title: 'AWS Access Key ID 하드코딩 유출 (CWE-798)',
    severity: '치명적',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    remediation: 'AWS IAM 키를 즉시 폐기(Revoke)하고 KMS/Vault 또는 환경변수로 이관하십시오.',
  },
  {
    id: 'SEC-GITHUB-PAT',
    title: 'GitHub Personal Access Token 노출 (CWE-798)',
    severity: '치명적',
    pattern: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})\b/,
    remediation: 'GitHub 토큰을 즉시 폐기하고 Secret Vault로 이관하십시오.',
  },
  {
    id: 'SEC-PRIVATE-KEY',
    title: '비공개 암호화 키(Private Key) 하드코딩 (CWE-321)',
    severity: '치명적',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    remediation: '개인키 파일을 저장소에서 제거하고 KMS/Vault에서 동적으로 로드하십시오.',
  },
];

const VULN_PACKAGES = [
  { name: 'cross-spawn', badPrefix: ['^7.0.0', '^7.0.1', '^7.0.2', '^7.0.3', '7.0.3'], cve: 'CVE-2024-21538', severity: '중간', fix: '>= 7.0.6' },
  { name: 'lodash', badPrefix: ['^4.17.15', '^4.17.19', '4.17.15'], cve: 'CVE-2021-23337', severity: '높음', fix: '>= 4.17.21' },
  { name: 'jsonwebtoken', badPrefix: ['^8.', '8.'], cve: 'CVE-2022-23529', severity: '높음', fix: '>= 9.0.0' },
  { name: 'axios', badPrefix: ['^0.', '0.', '^1.5.'], cve: 'CVE-2023-45857', severity: '중간', fix: '>= 1.6.0' },
];

function walkFiles(rootDir, collected = []) {
  if (collected.length >= MAX_FILES) return collected;
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return collected;
  }

  for (const entry of entries) {
    if (collected.length >= MAX_FILES) break;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collected);
    } else if (entry.isFile()) {
      collected.push(fullPath);
    }
  }
  return collected;
}

/**
 * Resolve repository URL to a local directory (clones to /tmp if remote URL & allowClone=true,
 * otherwise scans localWorkspaceDir).
 */
export function resolveScanTarget({ repository, branch = 'main', localWorkspaceDir, allowClone = false }) {
  if (allowClone && repository && (repository.startsWith('http://') || repository.startsWith('https://') || repository.startsWith('github.com/'))) {
    const cloneUrl = repository.startsWith('http') ? repository : `https://${repository}.git`;
    const slug = crypto.createHash('sha1').update(`${cloneUrl}:${branch}`).digest('hex').slice(0, 10);
    const targetDir = path.join('/tmp', `secureflow-scan-${slug}`);
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      execFileSync('git', ['clone', '--depth', '1', '--branch', branch, cloneUrl, targetDir], {
        timeout: 15000,
        stdio: 'pipe',
      });
      return { dir: targetDir, cloned: true, cleanup: () => fs.rmSync(targetDir, { recursive: true, force: true }) };
    } catch {
      // Fallback to local workspace if remote clone fails (offline/private repo)
    }
  }
  return { dir: localWorkspaceDir || process.cwd(), cloned: false, cleanup: () => {} };
}

/**
 * Scan real files in targetDir for SAST, Secret, SCA, and IaC vulnerabilities.
 */
export function scanDirectory({
  targetDir,
  projectId = 'PRJ-AGENTGATE',
  projectName = 'AgentGate 보안 게이트웨이',
  entityId = 'ENT-01',
  entityName = '테크솔루션즈',
  scanRunId = `SCN-${Date.now()}`,
  commitId = 'HEAD',
  scanTypes = ['소스코드 정적 분석', '의존성 취약점 분석', '비밀정보 탐지', '설정 오류 분석'],
}) {
  const t0 = performance.now();
  const files = walkFiles(targetDir);
  const findings = [];
  const counts = { sast: 0, sca: 0, secret: 0, iac: 0 };
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let codeFilesScanned = 0;
  let packagesChecked = 0;

  const enableSast = scanTypes.includes('소스코드 정적 분석');
  const enableSca = scanTypes.includes('의존성 취약점 분석');
  const enableSecret = scanTypes.includes('비밀정보 탐지');
  const enableIac = scanTypes.includes('설정 오류 분석');

  for (const fullPath of files) {
    const relPath = path.relative(targetDir, fullPath).replace(/\\/g, '/');
    const baseName = path.basename(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    let stat;
    try {
      stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_BYTES) continue;
    } catch {
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    // Skip scanner rule definitions themselves to avoid self-matching regex literals
    if (relPath.endsWith('realCodeScanner.js') || relPath.endsWith('security.test.js')) {
      continue;
    }

    // 1. SCA: package.json dependency audit
    if (enableSca && baseName === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        packagesChecked += Object.keys(allDeps).length;
        for (const [depName, ver] of Object.entries(allDeps)) {
          const rule = VULN_PACKAGES.find(
            (v) => v.name === depName && v.badPrefix.some((p) => String(ver).startsWith(p))
          );
          if (rule) {
            counts.sca += 1;
            findings.push({
              id: `FND-REAL-${crypto.createHash('sha1').update(`${scanRunId}:${relPath}:${depName}`).digest('hex').slice(0, 8).toUpperCase()}`,
              projectId,
              projectName,
              entityId,
              entityName,
              scanRunId,
              commitId,
              scanType: '의존성 취약점 분석',
              tool: 'Trivy SCA',
              title: `${rule.cve}: ${depName} 취약 버전 (${ver})`,
              description: `${relPath}에 선언된 ${depName}@${ver} 패키지에서 알려진 보안 취약점(${rule.cve})이 탐지되었습니다.`,
              severity: rule.severity,
              filePath: relPath,
              lineNumber: 'dependencies',
              codeSnippet: `"${depName}": "${ver}"`,
              remediationGuide: `${depName} 버전을 ${rule.fix} 이상으로 업그레이드하십시오.`,
              assignee: '보안담당자',
              status: '신규',
              createdAt: nowStr,
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              history: [{ timestamp: nowStr, actor: 'RealCodeScanner (SCA)', action: '실제 package.json 의존성 분석으로 탐지' }],
              rescanResult: '미실행',
            });
          }
        }
      } catch {
        // Ignore malformed package.json
      }
      continue;
    }

    // 2. IaC: Dockerfile / Terraform / K8s YAML checks
    if (enableIac && (baseName === 'Dockerfile' || IAC_EXTS.has(ext))) {
      const lines = content.split(/\r?\n/);
      if (baseName === 'Dockerfile' && !/^\s*USER\s+(?!root\b)\S+/m.test(content)) {
        counts.iac += 1;
        findings.push({
          id: `FND-REAL-${crypto.createHash('sha1').update(`${scanRunId}:${relPath}:docker-root`).digest('hex').slice(0, 8).toUpperCase()}`,
          projectId,
          projectName,
          entityId,
          entityName,
          scanRunId,
          commitId,
          scanType: '설정 오류 분석',
          tool: 'Checkov IaC',
          title: 'CKV_DOCKER_3: Dockerfile 비루트(Non-Root) USER 미지정',
          description: `${relPath}에 비루트 실행 사용자(USER) 지시문이 없어 컨테이너가 root 권한으로 실행될 수 있습니다.`,
          severity: '중간',
          filePath: relPath,
          lineNumber: `Line ${lines.length}`,
          codeSnippet: lines[0]?.trim().slice(0, 120) || 'FROM ...',
          remediationGuide: 'Dockerfile 하단에 `USER node` 등 비루트 계정을 명시하십시오.',
          assignee: '보안담당자',
          status: '신규',
          createdAt: nowStr,
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          history: [{ timestamp: nowStr, actor: 'RealCodeScanner (IaC)', action: '실제 IaC 설정 분석으로 탐지' }],
          rescanResult: '미실행',
        });
      }
      lines.forEach((line, idx) => {
        if (ext === '.tf' && /acl\s*=\s*["']public-read["']/.test(line)) {
          counts.iac += 1;
          findings.push({
            id: `FND-REAL-${crypto.createHash('sha1').update(`${scanRunId}:${relPath}:${idx + 1}:acl`).digest('hex').slice(0, 8).toUpperCase()}`,
            projectId,
            projectName,
            entityId,
            entityName,
            scanRunId,
            commitId,
            scanType: '설정 오류 분석',
            tool: 'Checkov IaC',
            title: 'CKV_AWS_20: S3 버킷 Public Read ACL 설정 탐지',
            description: `${relPath}:${idx + 1}에서 S3 버킷이 public-read로 노출되어 있습니다.`,
            severity: '높음',
            filePath: relPath,
            lineNumber: `Line ${idx + 1}`,
            codeSnippet: line.trim().slice(0, 120),
            remediationGuide: 'acl = "private"로 변경하고 Public Access Block을 활성화하십시오.',
            assignee: '보안담당자',
            status: '신규',
            createdAt: nowStr,
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
            history: [{ timestamp: nowStr, actor: 'RealCodeScanner (IaC)', action: '실제 Terraform 파일 분석으로 탐지' }],
            rescanResult: '미실행',
          });
        }
      });
    }

    // 3. Code files: SAST & Secret scanning
    if (CODE_EXTS.has(ext) || baseName.startsWith('.env')) {
      codeFilesScanned += 1;
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
          continue;
        }

        if (enableSecret) {
          for (const rule of SECRET_RULES) {
            if (rule.pattern.test(line)) {
              counts.secret += 1;
              findings.push({
                id: `FND-REAL-${crypto.createHash('sha1').update(`${scanRunId}:${relPath}:${i + 1}:${rule.id}`).digest('hex').slice(0, 8).toUpperCase()}`,
                projectId,
                projectName,
                entityId,
                entityName,
                scanRunId,
                commitId,
                scanType: '비밀정보 탐지',
                tool: 'Gitleaks',
                title: rule.title,
                description: `${relPath}:${i + 1}에서 실제 비밀키/토큰 패턴이 탐지되었습니다.`,
                severity: rule.severity,
                filePath: relPath,
                lineNumber: `Line ${i + 1}`,
                codeSnippet: `${trimmed.slice(0, 32)}***[MASKED]`,
                remediationGuide: rule.remediation,
                assignee: '보안담당자',
                status: '신규',
                createdAt: nowStr,
                dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
                history: [{ timestamp: nowStr, actor: 'RealCodeScanner (Secret)', action: '실제 소스파일 시크릿 스캔으로 탐지' }],
                rescanResult: '미실행',
              });
            }
          }
        }

        if (enableSast && CODE_EXTS.has(ext)) {
          for (const rule of SAST_RULES) {
            if (rule.pattern.test(line)) {
              counts.sast += 1;
              findings.push({
                id: `FND-REAL-${crypto.createHash('sha1').update(`${scanRunId}:${relPath}:${i + 1}:${rule.id}`).digest('hex').slice(0, 8).toUpperCase()}`,
                projectId,
                projectName,
                entityId,
                entityName,
                scanRunId,
                commitId,
                scanType: '소스코드 정적 분석',
                tool: 'SonarQube SAST',
                title: rule.title,
                description: `${relPath}:${i + 1} — ${rule.description}`,
                severity: rule.severity,
                filePath: relPath,
                lineNumber: `Line ${i + 1}`,
                codeSnippet: trimmed.slice(0, 140),
                remediationGuide: rule.remediation,
                assignee: '보안담당자',
                status: '신규',
                createdAt: nowStr,
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                history: [{ timestamp: nowStr, actor: 'RealCodeScanner (SAST)', action: '실제 소스파일 정적 분석으로 탐지' }],
                rescanResult: '미실행',
              });
            }
          }
        }
      }
    }
  }

  const executionDurationMs = Math.max(1, Math.round(performance.now() - t0));

  return {
    findings,
    counts,
    filesScannedCount: files.length,
    codeFilesScanned,
    packagesChecked,
    executionDurationMs,
  };
}
