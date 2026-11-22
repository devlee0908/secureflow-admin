# SecureFlow Enterprise DevSecOps Governance Platform — 이력서 · 포트폴리오 · 자기소개서 작성용 마스터 컨텍스트

> **ChatGPT 전달 가이드**
> 이 파일 전체를 ChatGPT에 업로드하거나 복사해 붙여넣은 뒤, 아래 프롬프트 중 하나를 함께 입력해 주세요.
> - **이력서(경력기술서)용**: `"이 프로젝트 문서를 바탕으로 백엔드/풀스택/보안 엔지니어 포지션 이력서용 핵심 성과(Bullet 5~6개)를 수치와 기술 키워드 중심으로 작성해줘."`
> - **자기소개서(STAR 기법)용**: `"이 문서의 트러블슈팅과 아키텍처 설계 사례를 활용해 [지원 직무/문항]에 맞는 STAR(상황-과제-행동-결과) 자기소개서 초안을 작성해줘."`
> - **포트폴리오 발표/노션용**: `"이 문서를 기반으로 면접관에게 어필할 수 있는 1페이지 프로젝트 소개서(문제정의-아키텍처-핵심구현-트러블슈팅-검증결과)를 정리해줘."`

---

## 1. 프로젝트 개요 (Project Summary)

- **프로젝트명**: **SecureFlow Enterprise DevSecOps Governance Platform (v2.4)**
- **저장소**: `https://github.com/devlee0908/secureflow-admin`
- **한 줄 정의**: 멀티 법인(Multi-Entity) 환경에서 **소스코드 보안점검(SAST·SCA·Secret·IaC) → 보안 정책 게이트 평가 → 직무 분리(SoD) 배포 승인 → KMS 전자서명(SBOM/SLSA) → 불변 감사 로그(SHA-256 체인)**까지 전 과정을 단일 파이프라인으로 통제·시각화하는 엔터프라이즈 DevSecOps 거버넌스 플랫폼.
- **해결하려는 핵심 문제**:
  1. 여러 법인/프로젝트의 보안 취약점 점검 결과와 배포 심사 증적이 흩어져 있어 운영 배포 전 보안 게이트 통제가 누락되는 문제
  2. 관리자·심사관·개발자 간 권한 혼재로 인한 보안 거버넌스(직무 분리, SoD) 위반 위험
  3. 보안 자격증명(GitHub PAT 등) 평문 저장 위험 및 감사 로그/SBOM 증적의 사후 위변조 검증 부재

---

## 2. 기술 스택 (Tech Stack)

- **Frontend**: React `18.3.1`, TypeScript `5.6.3`, Vite `5.4.8`, Tailwind CSS `3.4.13`, Radix UI (`Dialog`, `AlertDialog`, `Sheet`, `Tabs`, `Tooltip`, `Select`, `Popover`, `DropdownMenu`), TanStack Table `8.20.5`, Mermaid `11.3.0`, Sonner `1.5.0`, Lucide React
- **Backend & Security**: Node.js (v22+ 네이티브 `node:sqlite`, `node:worker_threads`, `node:crypto`, `node:test`), 커스텀 API 미들웨어 (`server/apiMiddleware.js`), SSE(Server-Sent Events) 실시간 이벤트 버스 (`server/sse.js`)
- **Infra & CI/CD**: Docker & `docker-compose.yml` (영구 볼륨 및 헬스체크), GitHub Actions (`.github/workflows/devsecops-ci.yml`)

---

## 3. 핵심 아키텍처 및 구현 기능 (Core Engineering Highlights)

### A. 실파일 & Git Clone 기반 4대 보안 스캐너 + Worker Thread 격리 풀
- **구현 파일**: `server/scanners/realCodeScanner.js`, `server/workers/scannerPool.js`, `server/workers/scanWorker.js`
- **설계 및 구현**:
  - Node.js `node:worker_threads` 기반 멀티스레드 워커 풀(`ScannerWorkerPool`)을 지연 초기화(Lazy Init)로 구성해, 정적 분석 작업이 메인 HTTP 이벤트 루프를 블로킹하지 않도록 격리.
  - `allowClone` 활성화 시 Vault에 저장된 GitHub PAT를 안전하게 주입(`GIT_TERMINAL_PROMPT=0`, `http.extraheader`)해 원격 저장소를 `git clone --depth 1`로 클론한 뒤 실제 소스코드를 스캔하고 종료 시 임시 디렉토리를 정리.
  - 실제 파일 시스템 순회(`scanDirectory`)를 통해 4대 영역을 라인 단위로 검사:
    - **SAST**: SQL Injection(`CWE-89`), OS Command Injection(`CWE-78`), 동적 코드 실행(`CWE-94`), DOM XSS(`CWE-79`), 취약한 해시/JWT `algorithms` 미고정(`CWE-327`)
    - **Secret**: AWS Access Key(`AKIA...`), GitHub PAT(`ghp_`/`github_pat_`), Private Key 헤더 탐지(로그/스니펫 마스킹) 및 Shannon Entropy 계산
    - **SCA**: `package.json` 파싱을 통한 취약 의존성 버전(`cross-spawn`, `lodash`, `jsonwebtoken`, `axios` 등) 탐지
    - **IaC**: `Dockerfile` 비루트 `USER` 미지정(`CKV_DOCKER_3`), Terraform `.tf` S3 `public-read` ACL(`CKV_AWS_20`) 탐지

### B. 2-Tier 봉투 암호화 금고(Vault) & KMS 키 회전
- **구현 파일**: `server/vault.js`, `server/kms/providers.js`, `server/kms/index.js`
- **설계 및 구현**:
  - 민감 자격증명(GitHub PAT 등)을 `AES-256-GCM`(DEK) + `AES-256-KW`(KEK) 2계층 봉투 암호화로 보호하고, 복호화 직후 버퍼 메모리 제로화(`dek.fill(0)`) 적용.
  - Local Software HSM, HashiCorp Vault Transit, AWS Cloud KMS 프로바이더 추상화 및 무중단 마스터 키 회전(`rotateVaultMasterKey`)·Cross-KMS 재래핑 지원.

### C. 불변 감사 로그(SHA-256 해시 체인) & 공급망 보안(CycloneDX SBOM / SLSA v1.0)
- **구현 파일**: `server/db/sqliteAdapter.js`, `server/db/postgresAdapter.js`, `server/sbomGenerator.js`, `src/components/common/SbomInspectorModal.tsx`
- **설계 및 구현**:
  - 모든 보안 정책 변경·배포 승인·스캔 이벤트를 `previousHash`와 연결된 SHA-256 해시 체인으로 기록하고, `GET /api/audit-logs/verify`에서 전체 레코드의 해시 체인 및 본문 위변조 여부를 검증.
  - CycloneDX v1.5 SBOM(PURL/라이선스/VEX 매핑) 및 SLSA v1.0 Provenance 번들 생성 시 KMS 서브키(`deriveAttestationSubkey`) 기반 HMAC 전자서명을 발급하고, `POST /api/sbom/verify`에서 서명 위조 및 컴포넌트 버전 변조를 즉시 탐지.

### D. Zero-Trust API 보안, 직무 분리(SoD) RBAC & 알림 DLQ
- **구현 파일**: `server/auth.js`, `server/securityGuard.js`, `server/apiMiddleware.js`, `server/notifications.js`, `server/sse.js`
- **설계 및 구현**:
  - RFC 7519 HS256 JWT 상수 시간 서명 검증, GitHub Webhook HMAC-SHA256 엄격 검증(`verifyGitHubSignature`), 버킷별(`webhook`, `vault`, `general`) 슬라이딩 윈도우 Rate Limiter, OWASP 보안 헤더 적용.
  - `group_admin` / `entity_manager` / `developer` 역할 기반 접근 통제(SoD) 적용 및 SSE 클라이언트 IP별 연결 상한 적용.
  - Webhook 알림 전송 실패 시 Full-Jitter Exponential Backoff(최대 3회 재시도) 및 영구 실패 건 `notification_dlq` 격리·수동/일괄 재전송(Redrive) 지원.

### E. 듀얼 DB 어댑터 & 프론트엔드 파이프라인 시각화 / 상태 정합성
- **구현 파일**: `server/db/index.js`, `src/context/DevSecOpsContext.tsx`, `src/components/projects/PipelineCanvasModal.tsx`, `src/components/projects/StandardPipelineTracks.tsx`, `src/components/projects/BranchLifecycleCanvas.tsx`, `src/components/projects/GitHubPrChecksModal.tsx`
- **설계 및 구현**:
  - `DB_ENGINE=sqlite | postgres` 전환이 가능한 Pluggable DB 프록시(`SQLite WAL 모드` vs `PostgreSQL 풀 어댑터`).
  - `/api/sync/state` SWR 동기화 + SSE 실시간 이벤트 수신 + RBAC `403` 등 API 실패 시 스냅샷 기반 자동 낙관적 롤백(`executeOptimisticMutation`).
  - 5단계 CI/CD 파이프라인 캔버스(게이트 차단 → CISO 긴급 예외 승인 / `fix/` 조치 브랜치 분기 → 운영 배포)와 3-트랙 브랜치 라이프사이클 시각화 구현.
  - 사이드바 실시간 미해결/심사 대기 배지, URL 해시 라우팅(`F5` 새로고침·브라우저 뒤로가기 지원), 파괴적 데이터 초기화/리셋 액션에 대한 `AlertDialog` 휴먼 에러 방지 가드 적용.

---

## 4. 핵심 트러블슈팅 사례 (Troubleshooting — 자소서/면접 활용 추천)

### 사례 1. 실코드 스캐너의 자기 자신 오탐(False Positive) 11건 및 재점검 중복 생성 해결
- **상황**: `realCodeScanner.js`를 워크스페이스에 실제 실행했을 때 `mockData.ts`, DB 시드 파일, 데모 모달에 포함된 취약점 예시 문자열까지 실제 결함으로 11건 오탐되고, 재점검할 때마다 `scanRunId`가 해시에 포함되어 동일 결함이 중복 적재되는 문제가 발생.
- **원인 분석**: 스캔 대상 필터에 데모/시드 경로 제외 규칙이 없었고, 결함 ID 생성 해시에 매 실행마다 달라지는 `scanRunId`를 포함시킨 것이 원인.
- **해결**: 데모/시드/모달 경로를 스캐너 제외 대상으로 지정하고, 결함 ID 해시 키를 `projectId + filePath + line/ruleId` 기반의 결정적(Deterministic) 구조로 변경.
- **결과**: 워크스페이스 107개 파일 실스캔 기준 **오탐 0건** 달성 및 반복 재점검 시 결함 ID 멱등성 확보.

### 사례 2. SQLite 스키마·어댑터 간 제약조건 충돌 및 PostgreSQL/SQLite 감사 해시 체인 불일치 해결
- **상황**: 실서버에서 `POST /api/scanners/run` 호출 시 `500 Internal Server Error (NOT NULL constraint failed: pipeline_runs.cluster)` 발생 및 두 DB 어댑터 간 감사 로그 해시 검증 불일치 확인.
- **원인 분석**: 기존 SQLite DB의 `pipeline_runs` 테이블에는 `cluster`, `namespace`, `replicas`가 `NOT NULL`로 정의되어 있었으나 `saveRun` `INSERT` 문에서 누락되어 있었고, 감사 로그 페이로드 직렬화 포맷이 어댑터마다 미세하게 달랐음.
- **해결**: `sqliteAdapter.js` 테이블 정의와 `saveRun`에 `cluster`/`namespace`/`replicas` 기본값을 포함하고, PostgreSQL·SQLite 양쪽의 SHA-256 감사 체인 페이로드 직렬화 규격을 통일.
- **결과**: `POST /api/scanners/run` `HTTP 201` 정상 저장 및 전체 61건 감사 로그 체인 무결성 검증(`verified: true`) 통과.

### 사례 3. 파이프라인 캔버스·브랜치 라이프사이클·전역 컨텍스트 간 상태 불일치 해결
- **상황**: 파이프라인 캔버스에서 `clean_pass`·`fix/` 조치·예외 승인 시나리오로 5단계 운영 배포까지 성공한 뒤 모달을 닫아도 프로젝트 목록에 `미해결`로 남거나, `BranchLifecycleCanvas`에서 미조치 상태인데도 `TRACK 2/3` 및 SVG 케이블이 초록색(`배포 성공`)으로 표시되는 UX 불일치 발견.
- **원인 분석**: 모달 내부 로컬 `runs` 상태만 갱신하고 전역 `DevSecOpsContext`의 `findings`/`reviews` 상태를 동기화하지 않았으며, `예외 승인`/`오탐` 상태 필터가 일부 뷰에서 누락되어 있었음.
- **해결**: `resolveProjectRemediation` 전역 동기화 함수를 도입해 모든 배포 성공/예외 승인 경로와 연결하고, `BranchLifecycleCanvas`의 트랙·노드·SVG 케이블 색상과 `예외 승인`/`오탐` 필터를 전 화면에 일관되게 적용.

---

## 5. 검증 및 테스트 결과 (Verified Evidence)

- **백엔드 보안·스캐너 자동화 테스트 (`npm test`, `node --test server/tests/security.test.js`)**: **7개 스위트 전체 통과 (`pass 7, fail 0`)**
  1. Vault 2-Tier 봉투 암호화(AES-256-GCM + AES-256-KW) & Cross-KMS 키 재래핑
  2. PostgreSQL & SQLite 불변 SHA-256 감사 로그 해시 체인 및 페이로드 변조 탐지
  3. Zero-Trust RFC 7519 JWT 인증, 서명 위조 차단 & RBAC 권한 통제
  4. GitHub Webhook HMAC-SHA256 엄격 서명 검증(우회 차단)
  5. Sliding-Window Rate Limiter & OWASP Zero-Trust 보안 헤더
  6. CycloneDX v1.5 SBOM & SLSA v1.0 Provenance KMS 서명 검증 및 변조 탐지
  7. 실제 코드베이스 SAST(SQLi)·Secret(AWS Key)·SCA(`cross-spawn`)·IaC(`Dockerfile`) 파일 스캐너 탐지 검증
- **프론트엔드 프로덕션 빌드 (`npm run build`, `tsc && vite build`)**: TypeScript 타입 에러 0건, 1,720개 모듈 번들링 통과
- **실서버 E2E 라이프사이클 검증 (`http://localhost:3000`)**:
  - `AgentGate` 초기화 → 베이스라인(3건 결함, `차단`) → 실파일 스캔(`107개 파일`, `HTTP 201`) → PR 조치 병합(`해결`/`통과`/`승인`) → 감사 로그 체인(`61건`, `verified: true`) → SBOM KMS 서명(`7개 컴포넌트`, `verified: true`) 전 구간 통과 확인
