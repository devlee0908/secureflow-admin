import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Server,
  ShieldCheck,
  KeyRound,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { UserRole } from '@/types';

const DEMO_PROFILES: {
  role: UserRole;
  label: string;
  subLabel: string;
  email: string;
  scope: string;
}[] = [
  {
    role: 'group_admin',
    label: 'CISO (그룹 관리자)',
    subLabel: 'Group Admin',
    email: 'ciso@corp.internal',
    scope: '전 계열사 정책·예외승인·감사 전권',
  },
  {
    role: 'entity_manager',
    label: '법인 보안담당자',
    subLabel: 'SecOps Lead',
    email: 'park.finance@corp.internal',
    scope: '소속 법인 프로젝트 및 배포 게이트 심사',
  },
  {
    role: 'developer',
    label: '프로젝트 개발자',
    subLabel: 'Tech Lead',
    email: 'minho.dev@corp.internal',
    scope: '배정 프로젝트 스캔 실행 및 취약점 패치',
  },
];

export const LoginView: React.FC = () => {
  const { login, theme, setTheme } = useDevSecOps();

  // Form states
  const [selectedRole, setSelectedRole] = useState<UserRole>('group_admin');
  const [email, setEmail] = useState('ciso@corp.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectProfile = (profile: (typeof DEMO_PROFILES)[number]) => {
    setSelectedRole(profile.role);
    setEmail(profile.email);
  };

  // Standard login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      if (email.includes('park') || email.includes('finance')) {
        login('entity_manager');
      } else if (email.includes('minho') || email.includes('dev')) {
        login('developer');
      } else {
        login(selectedRole);
      }
    }, 350);
  };

  const activeProfile =
    DEMO_PROFILES.find((p) => p.role === selectedRole) || DEMO_PROFILES[0];

  return (
    <div className="min-h-screen w-full bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-950 transition-colors duration-200">
      {/* Vercel Geist Architectural Hairline Grid Frame */}
      <div className="absolute inset-0 pointer-events-none flex justify-center">
        <div className="w-full max-w-5xl h-full border-x border-dashed border-zinc-200/70 dark:border-white/[0.05] relative">
          <div className="absolute top-24 left-0 right-0 border-t border-dashed border-zinc-200/70 dark:border-white/[0.05]" />
          <div className="absolute bottom-20 left-0 right-0 border-t border-dashed border-zinc-200/70 dark:border-white/[0.05]" />
        </div>
      </div>

      {/* Top Navigation & Telemetry Bar */}
      <header className="relative z-10 w-full h-14 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-white/[0.08] border border-zinc-800 dark:border-white/[0.12] flex items-center justify-center overflow-hidden p-1">
            <img
              src="/assets/secureflow_symbol.png?v=2"
              alt="SecureFlow"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-950 dark:text-white">
            SECUREFLOW
          </span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.08]">
            ENT
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#121214] font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ap-northeast-2</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>TLS 1.3</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 rounded-md border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#121214] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 shadow-none"
            title="테마 전환"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area: Centered Geist Authentication Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[420px]">
          <div className="rounded-xl bg-white dark:bg-[#0f0f11] border border-zinc-200/90 dark:border-white/[0.08] shadow-xs p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>ZERO-TRUST ACCESS GATEWAY</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                보안 관제 콘솔 로그인
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                인가된 사내 계정으로 접속하거나 역할별 데모 프로필을 선택하세요.
              </p>
            </div>

            {/* Quick Role Persona Selector (Geist Segmented Control) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  데모 접속 역할 (RBAC 프리셋)
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {activeProfile.subLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-zinc-100/80 dark:bg-[#161618] border border-zinc-200/70 dark:border-white/[0.06]">
                {DEMO_PROFILES.map((profile) => {
                  const isActive = selectedRole === profile.role;
                  return (
                    <button
                      key={profile.role}
                      type="button"
                      onClick={() => handleSelectProfile(profile)}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all text-center cursor-pointer truncate ${
                        isActive
                          ? 'bg-white dark:bg-[#222226] text-zinc-950 dark:text-white shadow-2xs border border-zinc-200/80 dark:border-white/[0.08]'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {profile.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-[#141417] border border-zinc-200/60 dark:border-white/[0.05] text-[11px] text-zinc-600 dark:text-zinc-400">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{activeProfile.scope}</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Corporate ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>사내 이메일 계정</span>
                  <span className="text-[10px] text-zinc-400 font-mono font-normal">
                    SSO / LDAP
                  </span>
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@corp.internal"
                    className="pl-9 h-9 rounded-md bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 shadow-none font-mono"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  인증 토큰 / 비밀번호
                </Label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-9 rounded-md bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-900 dark:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 shadow-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    aria-label="비밀번호 표시 전환"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Session Option */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-white/[0.2] bg-white dark:bg-[#141417] text-zinc-900 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400 text-xs">
                    신뢰 기기 세션 유지
                  </span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  MFA VERIFIED
                </span>
              </div>

              {/* Primary Geist Monochrome Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium text-xs rounded-md shadow-none transition-colors flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="font-mono text-xs">인증 확인 중...</span>
                  </>
                ) : (
                  <>
                    <span>콘솔 로그인</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>

              {/* Secondary Enterprise Passkey / SAML SSO Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleLogin}
                disabled={isSubmitting}
                className="w-full h-9 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#141417] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-md shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>사내 SAML 2.0 SSO로 계속하기</span>
              </Button>
            </form>

            {/* Bottom Compliance Metadata */}
            <div className="pt-4 border-t border-zinc-100 dark:border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  AUDIT LOGGING ACTIVE
                </span>
                <span>ISMS-P / ISO 27001</span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
                접속 시 모든 파이프라인 제어 및 정책 변경 이력이 불변 감사 로그에 기록됩니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Precision Enterprise Bar */}
      <footer className="relative z-10 w-full border-t border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#09090b] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            SECUREFLOW™
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>v2.4.8 Enterprise DevSecOps</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Server className="w-3 h-3" />
            <span>SQLite WAL / PostgreSQL Ready</span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>Zero-Trust Enforced</span>
        </div>
      </footer>
    </div>
  );
};
