'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export default function ForgotPasswordPage() {
  const { isDark } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form submission handlers
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Fake API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(4);
    }, 1200);
  };

  // OTP input logic for auto-focus and backspace
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + pasted.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      // Move to previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Helper to render the right Hero Panel to keep it consistent
  const renderHeroPanel = () => (
    <section className={`relative hidden lg:flex lg:flex-1 flex-col justify-center overflow-hidden px-12 py-12 transition-colors duration-300 ${isDark ? 'bg-[#0b2535]' : 'bg-[#0f2d3e]'}`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-rose-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-600/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-500/20 to-teal-400/20 shadow-2xl backdrop-blur-md border border-white/10">
          <ShieldCheck className="h-12 w-12 text-teal-400" />
        </div>
        <h2 className="mb-4 max-w-sm text-[32px] font-bold leading-tight text-white">
          Secure Password Recovery
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-400">
          We use industry-standard encryption and OTP verification to ensure that only you can access and reset your CSharpHub account credentials.
        </p>
      </div>
    </section>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden font-[var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,sans-serif]">
      {/* ── LEFT: Multi-step Form ─────────────────────────────────── */}
      <section className={`relative flex w-full flex-col justify-center overflow-y-auto px-8 py-12 sm:px-14 lg:w-[46%] xl:w-[42%] transition-colors duration-300 ${isDark ? 'bg-[#061a24]' : 'bg-[#f0f4f8]'}`}>
        {/* Subtle left-panel blob */}
        <div className={`pointer-events-none absolute -left-16 top-1/3 h-72 w-72 rounded-full blur-3xl transition-colors duration-300 ${isDark ? 'bg-rose-700/10' : 'bg-rose-400/8'}`} />

        {/* Back to login button (except on success step) */}
        {step !== 4 && (
          <Link
            href="/login"
            className={`absolute left-8 top-8 sm:left-14 sm:top-10 flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to login
          </Link>
        )}

        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="relative mb-10 flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-rose-500 shadow-lg shadow-rose-900/40">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className={`relative text-[28px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {step === 1 && 'Forgot Password?'}
                {step === 2 && 'Check Your Email'}
                {step === 3 && 'Create New Password'}
                {step === 4 && 'Password Reset!'}
              </h1>
              <p className={`relative mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {step === 1 && "No worries, we'll send you reset instructions."}
                {step === 2 && `We sent a 6-digit code to ${email || 'your email'}.`}
                {step === 3 && 'Your new password must be different from previous used passwords.'}
                {step === 4 && 'Your password has been successfully reset. Click below to log in magically.'}
              </p>
            </div>
          </div>

          {/* Form Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="relative mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:bg-white/8'
                        : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-all hover:shadow-rose-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Send Instructions
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="relative mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`h-12 w-12 rounded-xl border text-center text-lg font-bold backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                        isDark
                          ? 'border-white/10 bg-white/5 text-white focus:border-rose-500/50 focus:bg-white/8'
                          : 'border-slate-200 bg-white text-slate-800 shadow-sm focus:border-rose-400'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-center text-sm">
                  <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Didn't receive the email? </span>
                  <button type="button" className="font-semibold text-rose-400 hover:text-rose-300 transition-colors">
                    Click to resend
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-all hover:shadow-rose-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Verify Code
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="relative mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:bg-white/8'
                        : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:bg-white/8'
                        : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || password !== confirmPassword}
                className="group mt-8 relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-all hover:shadow-rose-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Reset Password
                    <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form Step 4: Success */}
          {step === 4 && (
            <div className="relative mt-8 animate-in zoom-in-95 duration-500">
              <Link
                href="/login"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:shadow-emerald-500/30 hover:shadow-xl"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                Back to Login
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}

        </div>
      </section>

      {/* ── RIGHT: Hero panel ────────────────────────────────── */}
      {renderHeroPanel()}
    </div>
  );
}
