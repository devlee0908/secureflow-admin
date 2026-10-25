# SecureFlow Enterprise DevSecOps Governance Platform (v2.4)

엔터프라이즈 멀티 법인(Multi-Entity) 보안점검 파이프라인, 배포 게이트 심사, KMS 봉투 암호화 금고(Vault), CycloneDX v1.5 SBOM & SLSA v1.0 증명서, 불변 감사 로그(SHA-256 Hash Chain) 통합 관제 플랫폼입니다.

---

## 1. 요구 사항 (Prerequisites)
다른 PC에서 프로젝트를 이어서 개발하려면 아래 환경이 필요합니다.
- **Node.js v22.5.0 이상 권장** (내장 `node:sqlite`, `node:worker_threads`, `node:crypto` 모듈을 무설치 네이티브로 사용합니다)
- **npm** (Node.js 설치 시 기본 포함)

---

## 2. 다른 PC에서 설치 및 실행 방법

### Step 1. 프로젝트 클론 및 패키지 설치
```bash
git clone <YOUR_GIT_REPO_URL>
cd secureflow-admin
npm install
```

### Step 2. 개발 서버 실행
Vite 개발 서버에 백엔드 API 미들웨어(`server/apiMiddleware.js`)가 내장되어 있어 **단 하나의 명령어**로 프론트엔드와 백엔드가 동시에 실행됩니다.
```bash
npm run dev -- --host 0.0.0.0 --port 3000
```
- 브라우저 접속: `http://localhost:3000`
- (선택) 독립형 백엔드 데몬(`3001` 포트)을 별도로 띄우려면:
  ```bash
  npm run server
  ```

### Step 3. 프로덕션 빌드 검증
```bash
npm run build
```

---

## 3. 핵심 아키텍처 요약 (AI 에이전트 인수인계용 컨텍스트)
다른 PC에서 AI 코딩 어시스턴트(Antigravity, Cursor, Claude Code 등)에게 작업을 이어서 지시할 때 아래 파일 구조를 참고하도록 안내하세요.

1. **멀티 엔진 DB 어댑터 (Pluggable Multi-Engine DB)**:
   - `server/db/index.js`: DB 프록시 파사드 (`DB_ENGINE=sqlite | postgres` 환경변수로 무중단 전환)
   - `server/db/sqliteAdapter.js`: SQLite WAL 모드(`PRAGMA journal_mode = WAL`) 어댑터 (`server/data/secureflow.db`)
   - `server/db/postgresAdapter.js`: 엔터프라이즈 PostgreSQL Connection Pool 어댑터
2. **듀얼 스테이트 정합성 & 낙관적 롤백 (Dual-State Consistency)**:
   - `src/context/DevSecOpsContext.tsx`: `/api/sync/state` SWR 동기화, SSE 실시간 이벤트 수신, API 실패 시 자동 스냅샷 롤백(`executeOptimisticMutation`)
3. **멀티스레드 스캐너 워커 풀 (Worker Thread Isolation)**:
   - `server/workers/scannerPool.js` & `server/workers/scanWorker.js`: 4-Core `node:worker_threads` 스레드 풀 격리로 이벤트 루프 블로킹 0ms 보장
4. **지수 백오프 & 알림 Dead-Letter Queue (DLQ)**:
   - `server/notifications.js`: Full-Jitter Exponential Backoff (최대 3회 자동 재시도) + 영구 실패 건 `notification_dlq` 격리 및 수동/일괄 재전송(Redrive)
5. **2-Tier 봉투 암호화 (Envelope Encryption DEK+KEK) & KMS 연동**:
   - `server/kms/providers.js` & `server/kms/index.js`: Local Software HSM, HashiCorp Vault Transit, AWS Cloud KMS 프로바이더
   - `server/vault.js`: AES-256-GCM(DEK) + AES-256-KW(KEK) 2계층 봉투 암호화, 메모리 제로화(`dek.fill(0)`), 무중단 KEK 키 회전(`rotateVaultMasterKey`)
6. **CycloneDX v1.5 SBOM & SLSA v1.0 Provenance 증명서**:
   - `server/sbomGenerator.js` & `src/components/common/SbomInspectorModal.tsx`: PURL/라이선스/VEX 매핑 및 KMS 전자서명 증명서 발급
7. **Zero-Trust API Security Guard & Rate Limiter**:
   - `server/securityGuard.js`: 버킷별(`webhook`, `vault`, `general`) 슬라이딩 윈도우 Rate Limiting + OWASP 보안 헤더 강제 주입
