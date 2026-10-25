import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  Server,
  Activity,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDevSecOps } from '@/context/DevSecOpsContext';

export const LoginView: React.FC = () => {
  const { login } = useDevSecOps();

  // Form states
  const [email, setEmail] = useState('ciso@corp.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        login('group_admin');
      }
    }, 450);
  };

  return (
    <div className="min-h-screen w-full bg-[#080b11] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* 2026 Precision Ambient Spotlight & Subtle Tech Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-center soft conic/radial light spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[340px] bg-gradient-to-b from-indigo-500/12 via-indigo-900/5 to-transparent blur-[100px]" />
        {/* Ambient bottom warm dark glow */}
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[250px] bg-cyan-950/15 blur-[120px]" />

        {/* Micro-dot matrix grid: Crisp & Professional */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Subtle vignette border gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(8,11,17,0.75)_100%)]" />
      </div>

      {/* Top Telemetry Header */}
      <header className="relative z-10 w-full border-b border-white/[0.06] bg-[#080b11]/70 backdrop-blur-xl px-6 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SYSTEM NORMAL</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">/</span>
          <span className="text-slate-400 hidden sm:inline font-mono text-[11px] tracking-tight">
            k8s-cluster-seoul-01 · zero-trust policy v2.4
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span className="hidden md:flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>NODE_ID: sec-ap-northeast-2</span>
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="text-slate-400">TLS 1.3 ENCRYPTED</span>
        </div>
      </header>

      {/* Main Content Area: Centered High-Trust Console */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Main Card Container */}
          <div className="relative rounded-2xl bg-[#0c1017]/90 border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_64px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-7 sm:p-9 space-y-6">
            
            {/* Top Brand Identity */}
            <div className="flex flex-col items-center text-center space-y-3">
              {/* Ultra-sharp Geometric Logo Emblem */}
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.12] p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] flex items-center justify-center">
                  <img
                    src="/assets/secureflow_symbol.png?v=2"
                    alt="SecureFlow Enterprise Emblem"
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>

              {/* Title & Micro-badge */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-black tracking-wider text-white font-mono">
                    SECURE<span className="text-indigo-400">FLOW</span>
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.2 rounded-md">
                    Console
                  </span>
                </div>
                <h1 className="text-sm font-semibold text-slate-200">
                  보안 파이프라인 관리자 로그인
                </h1>
                <p className="text-xs text-slate-400">
                  사내 보안 정책에 따라 인가된 사번 계정으로 접속하세요.
                </p>
              </div>
            </div>

            {/* Divider line */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Corporate ID */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>사내 이메일 또는 사번</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">@corp.internal</span>
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@corp.internal"
                    className="pl-10 bg-[#06080d]/80 border-white/[0.09] text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 h-10.5 rounded-xl transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  비밀번호
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-[#06080d]/80 border-white/[0.09] text-xs text-slate-100 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 h-10.5 rounded-xl font-mono transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember ID Option */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="rounded border-white/[0.15] bg-[#06080d] text-indigo-600 focus:ring-indigo-500/40 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-slate-300 group-hover:text-white transition-colors text-xs">
                    아이디 저장
                  </span>
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  SESSION: SECURE
                </span>
              </div>

              {/* 2026 Next-Gen Button: Indigo with subtle glass inner bevel */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_20px_-4px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-indigo-400/30 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="font-mono text-xs">AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>로그인</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                  </>
                )}
              </Button>
            </form>

            {/* Bottom Security Compliance & Audit Note */}
            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 leading-relaxed space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  AUDIT LOGGING ACTIVE
                </span>
                <span>ISO 27001 / ISMS-P</span>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-tight">
                접속 시 모든 파이프라인 제어 권한과 변경 내역이 실시간 감사 로그에 기록됩니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Precision Enterprise Bar */}
      <footer className="relative z-10 w-full border-t border-white/[0.06] bg-[#080b11]/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span>SECUREFLOW DEVSECOPS ORCHESTRATION</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-400">ENTERPRISE EDITION</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:text-slate-200 transition-colors cursor-pointer">Security Policy</span>
          <span>·</span>
          <span className="hover:text-slate-200 transition-colors cursor-pointer">SOC Operational Status</span>
          <span>·</span>
          <span className="hover:text-slate-200 transition-colors cursor-pointer">Internal Helpdesk</span>
        </div>
      </footer>
    </div>
  );
};
