'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Monitor,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

const BENEFITS = [
  'Access all C# & OOP courses',
  'AI-powered quiz generator',
  'Track your learning progress',
  'Human-reviewed content quality',
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'manager' | 'student'>('student');
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!email.includes('@')) newErrors.email = 'Please enter a valid email.';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (!agreed) newErrors.agreed = 'You must agree to the terms.';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    // TODO: connect to backend register
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = role === 'manager' ? '/content-manager/dashboard' : '/learner';
    }, 1200);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-[var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,sans-serif]">

      {/* ── LEFT: Registration form ──────────────────────────── */}
      <section className="relative flex w-full flex-col justify-center px-8 py-10 sm:px-14 lg:w-[46%] xl:w-[42%] bg-[#051d28] overflow-y-auto">

        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-rose-500 shadow-lg shadow-rose-900/40">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-white leading-none">CSharpHub</p>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">C# & OOP learning platform</p>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-bold text-white leading-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Join the platform and start learning C# today.
        </p>

        {/* Role selector */}
        <div className="mt-6 flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
          <button
            type="button"
            id="register-role-student"
            onClick={() => setRole('student')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              role === 'student'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Student
          </button>
          <button
            type="button"
            id="register-role-manager"
            onClick={() => setRole('manager')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              role === 'manager'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Content Manager
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-sm transition focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-500/60 focus:ring-rose-500/20'
                    : 'border-white/10 focus:border-rose-500/60 focus:ring-rose-500/20'
                }`}
              />
            </div>
            {errors.fullName && <p className="text-xs text-rose-400">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className={`w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-sm transition focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-500/60 focus:ring-rose-500/20'
                    : 'border-white/10 focus:border-rose-500/60 focus:ring-rose-500/20'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-400">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`w-full rounded-xl border bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 backdrop-blur-sm transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-rose-500/60 focus:ring-rose-500/20'
                    : 'border-white/10 focus:border-rose-500/60 focus:ring-rose-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            <div className="flex gap-1 pt-0.5">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= level * 2
                      ? password.length >= 8
                        ? 'bg-emerald-500'
                        : 'bg-amber-400'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            {errors.password && <p className="text-xs text-rose-400">{errors.password}</p>}
          </div>

          {/* Terms */}
          <label className="flex cursor-pointer items-start gap-2.5 select-none">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                agreed
                  ? 'border-rose-500 bg-rose-500'
                  : errors.agreed
                  ? 'border-rose-500/60 bg-white/5'
                  : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
            >
              {agreed && <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
            </div>
            <span className="text-xs leading-relaxed text-slate-400">
              I agree to the{' '}
              <Link href="/terms" className="text-rose-400 hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-rose-400 hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.agreed && <p className="-mt-2 text-xs text-rose-400">{errors.agreed}</p>}

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:from-rose-500 hover:to-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Create account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-rose-400 hover:text-rose-300 transition-colors">
            Sign in
          </Link>
        </p>
      </section>

      {/* ── RIGHT: Benefits panel ─────────────────────────────── */}
      <section className="relative hidden lg:flex lg:flex-1 flex-col justify-between overflow-hidden bg-[#0d2e3f] px-12 py-12">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-rose-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-600/10 blur-3xl" />

        {/* Badge */}
        <div className="flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <ShieldCheck className="h-3 w-3" />
            Free for university students
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h2 className="max-w-sm text-4xl font-bold leading-tight text-white">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
              master C#
            </span>{' '}
            fast.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            Structured courses, interactive quizzes, AI-generated questions with expert review,
            and real-time progress tracking — all in one place.
          </p>
        </div>

        {/* Benefits list */}
        <div className="space-y-3">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm text-slate-300">{b}</span>
            </div>
          ))}
        </div>

        {/* Testimonial card */}
        <div className="rounded-2xl border border-white/8 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-slate-300 italic">
            &quot;The AI question generator saved us hundreds of hours. Every question still goes
            through human review — so quality is never compromised.&quot;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-teal-500 text-xs font-bold text-white">
              TK
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Trần Anh Khoa</p>
              <p className="text-xs text-slate-500">Content Manager · OOP Module</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
