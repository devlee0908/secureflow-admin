export type EntityId = 'ENT-01' | 'ENT-02' | 'ENT-03' | 'ENT-04';

export interface CorporateEntity {
  id: EntityId;
  name: string;
  code: string;
  departments: string[];
  description: string;
  securityContact: string;
}

export type ProjectStatus = '운영 중' | '개발 중' | '유지보수' | '보관(보류)';
export type ScanOverallStatus = '통과' | '주의' | '위험' | '미점검' | '점검 중' | '실패';

export interface Project {
  id: string;
  name: string;
  entityId: EntityId;
  entityName: string;
  department: string;
  owner: string;
  ownerEmail: string;
  repository: string;
  defaultBranch: string;
  serviceType: string; // e.g. 개인정보·금융결제, 대고객 서비스, 사내 플랫폼
  status: ProjectStatus;
  createdAt: string;
  description: string;
}

export type ScanTrigger = '수동' | 'Push' | 'PR/MR' | '정기';
export type ScanRunStatus = '대기' | '실행 중' | '완료' | '실패' | '취소';
export type ScanType = '소스코드 정적 분석' | '의존성 취약점 분석' | '비밀정보 탐지' | '설정 오류 분석';

export interface ToolExecutionStatus {
  name: string; // SonarQube, Snyk, Gitleaks, Checkov, Trivy
  category: ScanType;
  status: '대기' | '진행 중' | '성공' | '경고' | '오류';
  findingsCount: number;
  durationSeconds: number;
}

export interface ScanRun {
  id: string;
  projectId: string;
  projectName: string;
  entityId: EntityId;
  entityName: string;
  branch: string;
  commitId: string;
  trigger: ScanTrigger;
  scanTypes: ScanType[];
  status: ScanRunStatus;
  startedAt: string;
  durationSeconds: number;
  findingsCount: number;
  failureReason?: string;
  toolStatuses: ToolExecutionStatus[];
  executionLogs: string[];
}

export type SeverityLevel = '치명적' | '높음' | '중간' | '낮음' | '정보';
export type FindingStatus = '신규' | '검토 중' | '조치 중' | '해결' | '오탐' | '예외 승인';

export interface FindingHistoryEntry {
  timestamp: string;
  actor: string;
  action: string;
  comment?: string;
}

export interface Finding {
  id: string;
  projectId: string;
  projectName: string;
  entityId: EntityId;
  entityName: string;
  scanRunId: string;
  commitId: string;
  scanType: ScanType;
  tool: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  filePath: string;
  lineNumber?: string; // or package version
  codeSnippet?: string;
  maskedSecret?: string;
  remediationGuide: string;
  assignee: string;
  status: FindingStatus;
  createdAt: string;
  dueDate: string;
  falsePositiveReason?: string;
  exceptionReason?: string;
  exceptionExpiresAt?: string;
  history: FindingHistoryEntry[];
  rescanResult?: '확인 완료(해결)' | '재발견(미해결)' | '미실행';
}

export type DeploymentEnvironment = '개발' | '검증' | '운영';
export type SecurityVerdict = '미점검' | '검토 필요' | '통과' | '차단';
export type ApprovalStatus = '대기' | '승인' | '반려';

export interface DeploymentReview {
  id: string;
  projectId: string;
  projectName: string;
  entityId: EntityId;
  entityName: string;
  targetEnvironment: DeploymentEnvironment;
  requestCommitId: string;
  scanCommitId: string;
  scanCompletedAt: string;
  requiredScansCompleted: boolean;
  securityVerdict: SecurityVerdict;
  verdictReason: string;
  approvalStatus: ApprovalStatus;
  reviewer?: string;
  reviewComment?: string;
  reviewedAt?: string;
  requester: string;
  requestedAt: string;
}

export interface SecurityPolicy {
  blockOnCritical: boolean;
  highThresholdForBlock: number; // e.g. 1개 이상이면 차단
  mediumThresholdForReview: number; // e.g. 3개 이상이면 검토 필요
  criticalSlaDays: number; // 3
  highSlaDays: number; // 7
  mediumSlaDays: number; // 30
  lowSlaDays: number; // 90
  requiredScanTypes: ScanType[];
}

export type GitServerType = 'GitLab Enterprise' | 'GitHub Enterprise' | 'Bitbucket Server';

export interface GitIntegrationConfig {
  serverType: GitServerType;
  serverUrl: string;
  webhookUrl: string;
  connectionStatus: '연결됨' | '오류' | '미연결';
  lastEventAt: string;
  lastEventType: string;
  apiVersion: string;
}

export type UserRole = 'group_admin' | 'entity_manager' | 'developer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  entityId?: EntityId;
  entityName?: string;
  assignedProjectIds?: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  linkMenu?: string;
}

export interface DemoFaultFlags {
  failNextScan: boolean;
  failNextSave: boolean;
  failNextLoad: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'system';
