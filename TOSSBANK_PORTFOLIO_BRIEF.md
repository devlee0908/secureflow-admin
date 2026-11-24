# 프로젝트 브리프: SecureFlow Enterprise DevSecOps Governance Platform (v2.4)

> **문서 성격**: 개인 프로젝트 기반 포트폴리오 슬라이드 제작용 브리프  
> **지원 대상**: 토스뱅크 보안레드팀 · 오픈소스 보안 전문가 (Security Researcher)  
> **기준 저장소**: `https://github.com/devlee0908/secureflow-admin` (공개 여부: **Public 저장소**, 개인 GitHub 계정 `devlee0908` 운영)

---

## 1. 프로젝트 개요

- **프로젝트명**: SecureFlow Enterprise DevSecOps Governance Platform (v2.4)
- **개발 기간**: `2026-10-25` (초기 커밋) ~ `2026-11-24` (약 1개월)
- **프로젝트 성격**: **개인 프로젝트**
  - 회사 업무(사내 Git 서버 구축·운영 경험)에서 *"저장소별 보안 점검 결과와 배포 심사 증적이 파편화되어 운영 배포 전 통제가 어렵다"*는 문제의식에서 아이디어를 얻어, 실제 사내망이 아닌 **개인 GitHub 계정(`devlee0908/agentgate`, `devlee0908/secureflow-admin`)과 로컬 Node.js/SQLite 환경**에서 단독 설계·구현한 프로젝트입니다. (회사 내부 코드·데이터·인프라는 일체 사용하지 않음)
- **한 줄 정의**: 개발자의 코드 커밋/PR 단계부터 **실제 파일 기반 4대 보안 점검(SAST·SCA·Secret·IaC) → 보안 정책 게이트 차단 → 예외/조치 추적 → CycloneDX v1.5 SBOM & SLSA v1.0 KMS 서명 발급 → SHA-256 불변 감사 로그**까지 전 과정을 통합 관제하는 Shift-Left DevSecOps 거버넌스 플랫폼.
- **시작 배경 (해결하려던 문제)**:
  1. 오픈소스 취약점(CVE)이나 시크릿 유출이 배포 이후에야 인지되어 사후 대응 비용이 커지는 문제
  2. 프로젝트별 사용 중인 오픈소스 의존성 현황(SBOM)과 취약점 조치 이력(`해결` / `오탐` / `예외 승인`)을 감사 증적 수준으로 일원화해 추적하기 어려운 문제
  3. 보안 담당자·심사관·개발자 간 권한이 혼재될 경우 발생할 수 있는 직무 분리(SoD) 위반 및 자격증명(GitHub PAT 등) 평문 노출 위험

---

## 2. 기술 스택 및 구성 요소

| 구분 | 실제 구현 구성 요소 | 상태 |
|---|---|---|
| **Git 저장소** | GitHub (`devlee0908/secureflow-admin`, 연동 테스트 저장소 `devlee0908/agentgate`), GitLab Enterprise 연동 어댑터 설정 UI | `[완료]` |
| **CI/CD 도구** | GitHub Actions (`.github/workflows/devsecops-ci.yml`: `npm ci` → `npm test` → `npm run build`), 자체 5단계 파이프라인/브랜치 라이프사이클 관제 엔진(`PipelineCanvasModal.tsx`, `BranchLifecycleCanvas.tsx`) | `[완료]` |
| **SCA·SAST·시크릿·IaC 스캐너** | Node.js `node:worker_threads` 격리 풀(`server/workers/scannerPool.js`, `scanWorker.js`) + 자체 실파일 정적 스캐너(`server/scanners/realCodeScanner.js`: SAST/SCA/Secret/IaC 정규식·`package.json` 파싱·Shannon Entropy) | `[완료]` |
| **외부 상용/CLI 스캐너 연동** | SonarQube·Trivy·Gitleaks·Checkov는 현재 UI/메타데이터 및 자체 Node 엔진으로 대체 구현됨 (실제 외부 바이너리 CLI 직접 호출은 미설치) | `[계획]` |
| **SBOM & Provenance** | 자체 CycloneDX v1.5 + VEX + SLSA v1.0 생성기(`server/sbomGenerator.js`), KMS 서브키 HMAC 서명·위변조 검증 API(`/api/sbom`, `/api/sbom/verify`) | `[완료]` |
| **암호화 금고 & KMS** | 2-Tier 봉투 암호화(`AES-256-GCM` DEK + `AES-256-KW` KEK, `server/vault.js`), Local Software HSM / Vault Transit / AWS KMS 프로바이더 추상화(`server/kms/providers.js`) | `[완료]` |
| **DB & 감사 로그** | SQLite WAL(`server/db/sqliteAdapter.js`) & PostgreSQL 풀 어댑터(`server/db/postgresAdapter.js`), SHA-256 해시 체인 감사 검증(`/api/audit-logs/verify`) | `[완료]` |
| **프론트엔드 관제 콘솔** | React `18.3.1`, TypeScript `5.6.3`, Vite `5.4.8`, Tailwind CSS `3.4.13`, Radix UI, TanStack Table `8.20.5` | `[완료]` |

---

## 3. 전체 구조 (Shift-Left 파이프라인 & 차단 기준)

### 단계별 실행 흐름
1. **1단계: Git 이벤트 / 수동 점검 트리거** `[완료]`
   - GitHub Webhook(`POST /api/webhooks/github`, HMAC-SHA256 상수 시간 검증 `verifyGitHubSignature`) 또는 콘솔 `[수동 점검 실행]`(`POST /api/scanners/run`) 호출
   - `allowClone: true` 설정 시 Vault에 암호화 저장된 GitHub PAT(`github_pat`)를 `GIT_TERMINAL_PROMPT=0` 및 `http.extraheader`로 주입해 `git clone --depth 1` 수행 후 임시 디렉토리(`/tmp/secureflow-scan-*`) 스캔 및 정리 (`server/scanners/realCodeScanner.js`)
2. **2단계: 격리된 Worker Thread 4대 보안 점검 실행** `[완료]`
   - `ScannerWorkerPool`(`os.cpus()` 기반 2~4코어 풀)이 `node:worker_threads`로 스캔을 격리 실행하여 메인 이벤트 루프 블로킹 방지
   - 최대 400개 파일(파일당 최대 256KB)을 순회하며 SAST(SQLi `CWE-89`, Command Injection `CWE-78`, `eval` `CWE-94`, XSS `CWE-79`, 약한 해시/JWT `CWE-327`), Secret(`AKIA...`, `ghp_...`, Private Key), SCA(`package.json` 취약 버전), IaC(`Dockerfile` 비루트 `USER` 미지정, Terraform `public-read`) 검사
3. **3단계: 보안 정책 게이트 자동 평가 및 차단** `[완료]`
   - 기본 정책 기준 (`INITIAL_SECURITY_POLICY`, `src/mock/mockData.ts`):
     - `blockOnCritical: true`: **치명적(Critical) 결함 1건 이상 시 즉시 배포 차단**
     - `highThresholdForBlock: 1`: **높음(High) 결함 1건 이상 시 즉시 배포 차단**
     - `mediumThresholdForReview: 3`: **중간(Medium) 결함 3건 이상 시 배포 심사 대기(검토 필요)**
     - 요청 커밋과 점검 커밋 불일치(`!commitMatch`) 또는 필수 점검 미완료/실패 시 즉시 차단
   - **SLA 조치 기한 기본값**: 치명적 `3일` / 높음 `7일` / 중간 `30일` / 낮음 `90일`
4. **4단계: 배포 심사 및 직무 분리(SoD) 인가** `[완료]`
   - RBAC(`server/auth.js`): `group_admin`(CISO/보안총괄)만 최종 배포 승인·반려·예외 승인 가능, `entity_manager`/`developer`의 승인 요청은 서버 단에서 `HTTP 403` 차단 및 프론트엔드 낙관적 업데이트 자동 롤백
5. **5단계: 배포 완료 · SBOM/SLSA 증명서 발급 · 감사 체인 기록** `[완료]`
   - 모든 변경 사항을 SHA-256 해시 체인 감사 로그에 기록하고 CycloneDX v1.5 SBOM + SLSA v1.0 Provenance 서명 검증 제공
   - *(단, 5단계 K8s 클러스터 `4/4 Pods Active` 상태는 실제 클러스터 배포가 아닌 파이프라인 캔버스 시뮬레이션 상태임)* `[계획]`

---

## 4. 오픈소스 관리 (SBOM · CVE · 예외 처리 · 라이선스)

### 4-1. SBOM 생성 방식, 형식 및 저장·관리 방법 `[완료]`
- **형식**: **CycloneDX v1.5** JSON (`bomFormat: 'CycloneDX'`, `specVersion: '1.5'`) + **SLSA v1.0 Provenance** (`server/sbomGenerator.js`)
- **생성 방식**:
  - `GET /api/sbom?projectId=<ID>` 호출 시 프로젝트의 최신 스캔 결과·결함 상태를 반영해 표준 컴포넌트 목록(`STANDARD_COMPONENTS`, `7개` 기본 npm 패키지: `express@4.19.2`, `jsonwebtoken@9.0.0`, `cross-spawn@7.0.3`→패치 시 `7.0.6`, `pg@8.11.5`, `zod@3.23.8`, `helmet@7.1.0`, `@opentelemetry/api@1.9.0`)에 대해 `purl`, `SHA-256` 해시, 라이선스(`MIT`, `Apache-2.0`), **VEX(`analysis.state`)**를 동적으로 매핑해 생성합니다.
  - **무결성 증명**: 생성된 SBOM의 SHA-256 다이제스트에 대해 KMS 루트 마스터 시크릿에서 파생한 서브키(`deriveAttestationSubkey`)로 HMAC-SHA256 서명을 발급하고, `POST /api/sbom/verify` 및 UI(`SbomInspectorModal.tsx`)에서 서명 위조 및 컴포넌트 버전 변조를 즉시 검증합니다.
- **저장·관리 한계(솔직한 현 상태)**:
  - 현재는 생성된 SBOM JSON을 파일/DB 스냅샷으로 영구 버전별 아카이빙하는 기능 대신 요청 시 실시간 생성·다운로드·검증하는 구조이며, 전체 `package-lock.json` 트리 기반 자동 SBOM 추출(Trivy/Syft CLI 연동)은 `[계획]` 단계입니다.

### 4-2. CVE 탐지 → 우선순위 판단 → 조치 → 재검증 흐름 `[완료]`
1. **탐지**: `realCodeScanner.js`가 `package.json`을 파싱해 알려진 취약 버전(`cross-spawn < 7.0.6 / CVE-2024-21538`, `lodash < 4.17.21 / CVE-2021-23337`, `jsonwebtoken < 9.0.0 / CVE-2022-23529`, `axios < 1.6.0 / CVE-2023-45857`)을 검출 (`[완료]`, 단 실시간 NVD/OSV DB API 동기화 대신 내장 룰 테이블 기반 `[진행 중]`)
2. **우선순위 판단**: 심각도(`치명적` / `높음` / `중간` / `낮음`)별 정책 임계치 및 SLA 만료일(`3/7/30/90일`) 부여
3. **조치 및 재검증**:
   - `FindingsView`에서 담당자 지정·조치 기한 관리·단독 재점검 시뮬레이션(`simulateRescanFinding`) 또는 `PipelineCanvasModal`에서 `fix/` 조치 브랜치 분기 → 재점검(`0건` 확인) → PR 머지(`POST /api/github/orchestrate`) 수행
   - `AgentGate` 기준 최초 `cross-spawn@^7.0.3` 등 3건 탐지(`차단`) → 패치 후 `cross-spawn@7.0.6` 반영 및 3건 전수 `해결` 전환(`통과` / `승인`)

### 4-3. 오탐(False Positive) 및 조치 불가 취약점(예외 승인) 처리 `[완료]`
- **오탐 처리 (`markAsFalsePositive`)**: 사유(`falsePositiveReason`) 입력이 필수이며 상태를 `오탐`으로 전환하고 처리 이력(`history`)에 기록합니다.
- **조치 불가/긴급 배포 예외 처리 (`requestSecurityException` / CISO Override)**: 예외 사유(`exceptionReason`)와 **만료일(`exceptionExpiresAt`)**을 필수로 지정해 `예외 승인` 상태로 전환합니다.
- **CycloneDX VEX 연동**: `sbomGenerator.js`에서 `해결` 건은 `analysis.state = 'resolved'`, `오탐` 및 `예외 승인` 건은 `analysis.state = 'not_affected'`로 매핑해 미조치(`exploitable`) 건과 명확히 구분하며, 미해결 건수 집계 및 게이트 차단 계산에서도 일관되게 제외합니다.

### 4-4. 라이선스 점검 여부와 기준
- **SBOM 내 라이선스 필드(`MIT`, `Apache-2.0`) 표기 및 조회**: `[완료]`
- **GPL 등 카피레프트(Copyleft) 라이선스 자동 차단 정책**: **해당 없음 (`[계획]`)** — 현재 정책 엔진은 보안 취약점(Critical/High/Medium)과 커밋 일치성 기준 차단만 구현되어 있으며, 라이선스 유형별 자동 차단 룰은 미구현입니다.

### 4-5. 오픈소스 반입 정책 / 가이드라인 초안 여부
- **시스템 정책 기준(`PoliciesView.tsx`, `INITIAL_SECURITY_POLICY`)**: Critical `1건` 이상·High `1건` 이상 반입/배포 자동 차단, Medium `3건` 이상 수동 검토, 취약점 조치 SLA(`3/7/30/90일`) 및 예외 승인 만료일 강제 규칙을 코드와 UI에 반영했습니다. `[완료]`
- **별도 사내 규정 문서(PDF/사내 위키형 오픈소스 반입 가이드라인) 초안**: **해당 없음** (플랫폼 내 정책 설정 및 시뮬레이터 형태로만 구현)

---

## 5. 트러블슈팅 사례 (STAR 형식)

### 사례 1. 실코드 스캐너의 자기 자신 오탐(False Positive) 11건 및 재점검 시 결함 중복 누적 해결 `[완료]`
- **상황 (Situation)**: `realCodeScanner.js`를 구현한 뒤 현재 워크스페이스(`secureflow-admin`)를 대상으로 실제 스캔을 실행하자, 취약점이 아닌 데모용 샘플 문자열에서 11건의 결함이 탐지되고 재점검할 때마다 동일 결함이 DB에 중복 적재되는 문제가 발생했습니다.
- **과제 (Task)**: 실제 소스코드 취약점은 정확히 탐지하면서도, 데모/시드 코드로 인한 오탐과 반복 스캔 시 결함 ID 중복을 제거해야 했습니다.
- **행동 (Action)**:
  1. 워크스페이스 스캔 출력(`filePath`, `lineNumber`)을 직접 역추적해 `src/mock/mockData.ts`, `server/db/sqliteAdapter.js`, `server/db/postgresAdapter.js`, `*Modal.tsx` 내부의 데모 예시 코드가 원인임을 규명했습니다.
  2. 스캐너 순회 대상에서 모의 데이터·DB 시드·데모 모달 경로를 제외하고, 결함 ID 해시 생성 키에서 매 실행마다 바뀌는 `scanRunId`를 제거해 `projectId + filePath + line/ruleId` 기반의 결정적(Deterministic) ID로 변경했습니다.
- **결과 (Result)**: 워크스페이스 `107개` 파일 실스캔 기준 **오탐 11건 → 0건**으로 제거했고, 임시 취약 코드 픽스처 4종(SQLi·AWS Key·`cross-spawn@^7.0.3`·루트 `Dockerfile`) 탐지 테스트를 통과해 멱등성과 탐지 정확도를 동시에 확보했습니다.

### 사례 2. 실서버 SQLite 저장 단계 런타임 에러(`NOT NULL` 제약조건 충돌) 및 DB 어댑터 간 감사 체인 불일치 해결 `[완료]`
- **상황 (Situation)**: 실서버(`http://localhost:3000/api/scanners/run`)를 직접 호출해 엔드투엔드 검증을 진행하던 중 `HTTP 500 (NOT NULL constraint failed: pipeline_runs.cluster)` 에러가 발생했고, SQLite와 PostgreSQL 어댑터 간 감사 로그 해시 검증 로직에도 차이가 있었습니다.
- **과제 (Task)**: 기존 디스크 SQLite DB(`server/data/secureflow.db`)와 신규 테이블 스키마·어댑터 간 정합성을 맞추고, 두 DB 엔진 모두에서 감사 로그 무결성이 깨지지 않게 통일해야 했습니다.
- **행동 (Action)**:
  1. `PRAGMA table_info(pipeline_runs)`로 실제 DB 스키마를 점검해 `cluster`, `namespace`, `replicas` 컬럼이 `NOT NULL`로 존재하나 `saveRun` `INSERT` 문에서 누락된 것을 확인하고 기본값(`k8s-prod-seoul` 등)을 추가했습니다.
  2. SQLite와 PostgreSQL 어댑터의 SHA-256 감사 로그 해시 계산 시 페이로드 직렬화 포맷을 동일하게 통일했습니다.
- **결과 (Result)**: `POST /api/scanners/run` 호출이 **HTTP 500 → HTTP 201**로 정상화되었고, E2E 검증에서 **61건** 감사 로그 전체 해시 체인 검증(`verified: true`)을 통과했습니다.

### 사례 3. 파이프라인 조치·예외 승인 후 화면 간 상태 불일치 및 `BranchLifecycleCanvas` 미조치 오표시 해결 `[완료]`
- **상황 (Situation)**: 파이프라인 캔버스에서 `clean_pass`·`fix/` 조치·CISO 예외 승인 시나리오로 5단계 운영 배포까지 완료한 뒤 모달을 닫아도 프로젝트 목록에 `미해결`이 남아 있거나, `BranchLifecycleCanvas.tsx`에서 아직 차단 상태인데도 `TRACK 2/3`과 SVG 케이블이 초록색(`배포 성공`)으로 표시되는 문제가 있었습니다.
- **과제 (Task)**: 시뮬레이션/조치/예외 승인 결과가 전역 결함·심사 상태 및 브랜치 시각화 UI와 100% 일치하도록 단일 진실 공급원(SSOT) 흐름을 복구해야 했습니다.
- **행동 (Action)**:
  1. 전역 컨텍스트에 `resolveProjectRemediation`을 구현해 `clean_pass`·`fix/` 브랜치·CISO 예외 승인 완료 시 결함 상태(`해결`/`예외 승인`)와 배포 심사(`통과`/`승인`)를 함께 갱신하도록 연결했습니다.
  2. `BranchLifecycleCanvas.tsx`의 Track 1~3 헤더·노드·SVG 케이블 색상과 점선 여부를 `gateStatus` 및 `deployStatus` 기반으로 동적 분기하고, 전 화면의 미해결 필터에 `오탐` 및 `예외 승인` 제외 조건을 일관 적용했습니다.
- **결과 (Result)**: `차단` ↔ `조치 완료` ↔ `예외 승인` 전 시나리오에서 목록·상세 시트·파이프라인 캔버스·브랜치 라이프사이클 화면 간 상태 불일치를 해소했습니다.

---

## 6. 성과 (숫자 중심) 및 향후 계획 / 금융권 적용 인사이트

### 정량적 검증 성과 (`[완료]`)
- **백엔드 보안·스캐너 단위 테스트** (`npm test` / `node --test server/tests/security.test.js`): **7개 스위트 전체 통과 (`pass 7, fail 0`)**
- **실서버 E2E 실데이터 검증**: `AgentGate` 초기화(`0건`) → 베이스라인(`3건` 결함, `SCN-AGENTGATE-01`) → 실파일 스캔(`107개` 파일, `HTTP 201`) → PR 조치 병합(`3건` 전수 `해결`) → 감사 로그 체인(`61건`, `verified: true`) → SBOM/SLSA KMS 서명 검증(`7개` 컴포넌트, `verified: true`) 전 구간 통과
- **프론트엔드 프로덕션 빌드** (`npm run build`): TypeScript 타입 오류 **0건**, **1,720개** 모듈 번들링 통과

### 향후 계획 (`[계획]`)
1. **실제 외부 SCA/SBOM CLI 및 실시간 CVE 피드 연동**: `Trivy`/`Syft` CLI 실행 및 NVD/OSV API 연동(오프라인 DB 미러 포함) 확장
2. **오픈소스 라이선스 반입 정책 엔진 추가**: GPL/AGPL 등 카피레프트 라이선스 탐지 시 정책 게이트 자동 차단 및 법무 검토 워크플로우 연동
3. **실제 `package-lock.json` 전체 의존성 트리 기반 SBOM 자동 생성** 연결

### 금융권 환경(망분리 · 전자금융감독규정) 적용 시 변경·보완 사항 (설계 견해)
1. **망분리 대응 (Offline Air-Gapped Vulnerability DB Mirror)**: DMZ 또는 반입 중계 구간에 사내 CVE DB 미러(Trivy DB / OSV offline bundle)와 사설 패키지 프록시(Nexus Repository)를 두고 스캐너가 내부 미러만 조회하도록 변경
2. **오픈소스 반입 통제 및 증적 장기 보관 (전자금융감독규정 대응)**: 외부 오픈소스 최초 반입 시 취약점·라이선스 검증 통과 버전만 Allowlist 반입, 배포 승인자와 개발자 간 직무 분리(SoD) 및 불변 감사 로그·서명된 SBOM 장기 보관
3. **KMS / HSM 실물 연동**: 소프트웨어 HSM 추상화 계층(`server/kms/providers.js`)을 금융권 망 내 물리 HSM 또는 사내 Vault KMS로 교체

---

## 7. AI 도구 활용 사례

- **활용 도구**: **Google Antigravity (AI 코딩 에이전트)** 및 **ChatGPT**
- **활용 상황 및 이유**: React/TypeScript 기반 파이프라인 시각화, Node.js 네이티브 암호화·감사 체인 구현, 화면 간 상태 불일치/엣지 케이스 전수 점검 속도를 높이기 위해 활용
- **AI 생성 코드·설정에 대한 직접 검증 방법**:
  1. **단위 테스트 직접 실행 및 실패 케이스 주입**: `node --test server/tests/security.test.js`에서 공개 `keyId`를 악용한 위조 서명 거부(`INVALID_KMS_SIGNATURE`), SBOM 버전 변조 시 다이제스트 불일치(`SBOM_DIGEST_MISMATCH`), 잘못된 Webhook 서명 차단 등을 직접 검증
  2. **실서버 & 실파일 대상 직접 호출 검증**: `realCodeScanner.js`를 워크스페이스에 직접 실행해 데모 코드 11건 오탐 버그를 잡아냈고, `POST /api/scanners/run`을 직접 호출해 SQLite `NOT NULL` 런타임 에러를 발견·수정
  3. **빌드·UI 시나리오 대조 검증**: `npm run build` 및 실제 브라우저 캡처 기반 상태 불일치 교차 검증

---

## 8. 캡처 화면 목록 (실제 저장 경로)

모든 캡처 화면은 `docs/screenshots/` 디렉토리에 고해상도(1440×900, 2x Retina) PNG 파일로 저장되어 있습니다.

1. **`docs/screenshots/01_projects_baseline_blocked.png`** (`프로젝트 자산 & AgentGate 목록`)
   - *증명 내용*: 프로젝트별 운영 상태, 미해결 결함 건수, Git 저장소 연동 현황 및 파이프라인 캔버스 진입점 확인
2. **`docs/screenshots/02_pipeline_canvas_blocked.png`** (`파이프라인 캔버스 5단계 뷰`)
   - *증명 내용*: Git 이벤트 → 보안점검 엔진 → 정책 게이트 → 배포 심사 → 클러스터 배포까지 5단계 플로우와 노드 속성 검사기 확인
3. **`docs/screenshots/03_branch_lifecycle_canvas.png`** (`브랜치 라이프사이클 3-트랙 뷰`)
   - *증명 내용*: Feature 브랜치 → `fix/` 조치 브랜치 → `main` 프로덕션 머지로 이어지는 Shift-Left 브랜치 단위 거버넌스 흐름 확인
4. **`docs/screenshots/04_scans_worker_logs.png`** (`보안점검 파이프라인 실행 이력 & 상세 시트`)
   - *증명 내용*: `실행 메타데이터`, `스캐너 도구별 검사 결과`, `컨테이너 실행 터미널 로그` 및 `본 점검 보고 결함` 확인
5. **`docs/screenshots/05_sbom_slsa_inspector.png`** (`CycloneDX v1.5 SBOM & SLSA v1.0 증명서 모달`)
   - *증명 내용*: 7개 표준 npm 컴포넌트(`purl`, SPDX 라이선스 `MIT`/`Apache-2.0`, SHA-256 다이제스트), VEX 취약점 영향도, KMS KEK 전자서명 완료 상태 확인
6. **`docs/screenshots/06_findings_management.png`** (`취약점·결함 관리 화면`)
   - *증명 내용*: 심각도(치명적/높음/중간)별 SLA 기한 관리, `오탐`/`예외 승인` 처리, 담당자 지정 및 재점검 추적 확인
7. **`docs/screenshots/07_audit_logs_hash_chain.png`** (`보안 감사 및 SHA-256 해시 체인 검증 화면`)
   - *증명 내용*: 정책 변경·스캔 실행·배포 승인 이력의 SHA-256 해시 체인 무결성 실시간 검증 결과 확인

---

## 9. 면접 예상 질문 5개와 답변 요지

1. **Q1. 외부 상용 SCA(Trivy, Nexus IQ, Snyk)가 아닌 자체 Node 스캐너로 구현하신 이유와 한계는?**
   - 외부 바이너리 없이 Node.js v22 네이티브 환경에서 Shift-Left 파이프라인·정책 게이트·VEX·SBOM 증명 흐름을 End-to-End로 구현·검증하기 위함. 전이 의존성 전체 트리와 실시간 NVD/OSV 피드 반영을 위해 실무에서는 `Trivy`/`Syft`/`Nexus IQ`를 `ScannerWorkerPool` 어댑터에 연결하는 구조가 적합함.
2. **Q2. SBOM 생성 시 취약점 조치 불가 건(패치 없음)이나 오탐을 어떻게 구분·관리했나요?**
   - `오탐`은 사유 필수, `예외 승인`은 사유+만료일(`exceptionExpiresAt`) 필수. CycloneDX v1.5 VEX(`analysis.state`)에 미해결=`exploitable`, 조치 완료=`resolved`, 오탐/예외=`not_affected`로 매핑해 감사 추적 가능.
3. **Q3. 직접 만든 스캐너에서 오탐이나 버그를 겪고 해결한 구체적인 사례는?**
   - 워크스페이스 실스캔 시 `mockData.ts`·DB 시드·데모 모달 문자열로 인한 11건 오탐과 `scanRunId` 포함 해시로 인한 중복 적재 문제를 경로 필터링 및 결정적 해시 키(`projectId + filePath + line/ruleId`)로 해결(오탐 0건).
4. **Q4. 개발자가 보안 게이트를 우회하거나 본인 배포를 자가 승인하는 문제를 어떻게 막았나요?**
   - GitHub Webhook `timingSafeEqual` HMAC-SHA256 서명 검증, 커밋 일치성 검증, 서버 API 단(`enforceRbac`) 직무 분리(SoD) RBAC `HTTP 403` 차단 및 프론트엔드 낙관적 UI 자동 롤백.
5. **Q5. 금융권 망분리·전자금융감독규정 환경에 적용한다면 무엇을 바꿔야 하나요?**
   - DMZ 중계 구간을 통한 사내 CVE 미러 DB·사설 패키지 프록시(Nexus 등) 구성, 외부 오픈소스 반입 단계 Allowlist 및 카피레프트 라이선스 차단 게이트 추가, 소프트웨어 HSM을 망 내 물리 HSM/KMS로 교체 및 서명된 SBOM·감사 로그 장기 보관.
