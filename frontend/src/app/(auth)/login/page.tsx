'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Monitor,
  CheckCircle2,
  BookOpen,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

// ─── Hero panel: stats with icons ───────────────────────────────────
const STATS = [
  { value: '24 courses', sub: '126 lessons', icon: BookOpen },
  { value: '965 questions', sub: '268 AI drafted', icon: Zap },
  { value: '100% reviewed', sub: 'before publish', icon: ShieldCheck },
];

// ─── Fake C# code for the editor mockup (Syntax Highlighted) ──────────
type CodeToken = { text: string; color: string };
type CodeLine = { indent: number; tokens: CodeToken[] };

const CODE_LINES: CodeLine[] = [
  {
    indent: 0,
    tokens: [
      { text: 'public ', color: 'text-blue-400' },
      { text: 'class ', color: 'text-blue-400' },
      { text: 'Student', color: 'text-emerald-400' },
    ],
  },
  {
    indent: 0,
    tokens: [{ text: '{', color: 'text-slate-400' }],
  },
  {
    indent: 1,
    tokens: [
      { text: 'public ', color: 'text-blue-400' },
      { text: 'string ', color: 'text-blue-400' },
      { text: 'Name ', color: 'text-slate-200' },
      { text: '{ ', color: 'text-slate-400' },
      { text: 'get', color: 'text-blue-400' },
      { text: '; ', color: 'text-slate-400' },
      { text: 'set', color: 'text-blue-400' },
      { text: '; }', color: 'text-slate-400' },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'public ', color: 'text-blue-400' },
      { text: 'int ', color: 'text-blue-400' },
      { text: 'Credits ', color: 'text-slate-200' },
      { text: '{ ', color: 'text-slate-400' },
      { text: 'get', color: 'text-blue-400' },
      { text: '; ', color: 'text-slate-400' },
      { text: 'private ', color: 'text-blue-400' },
      { text: 'set', color: 'text-blue-400' },
      { text: '; }', color: 'text-slate-400' },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      { text: 'public ', color: 'text-blue-400' },
      { text: 'Student', color: 'text-emerald-400' },
      { text: '(', color: 'text-slate-400' },
      { text: 'string ', color: 'text-blue-400' },
      { text: 'name', color: 'text-sky-300' },
      { text: ') ', color: 'text-slate-400' },
      { text: '=> ', color: 'text-blue-400' },
      { text: 'Name ', color: 'text-slate-200' },
      { text: '= ', color: 'text-slate-400' },
      { text: 'name', color: 'text-sky-300' },
      { text: ';', color: 'text-slate-400' },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 1,
    tokens: [
      { text: 'public ', color: 'text-blue-400' },
      { text: 'void ', color: 'text-blue-400' },
      { text: 'Enroll', color: 'text-yellow-200' },
      { text: '(', color: 'text-slate-400' },
      { text: 'int ', color: 'text-blue-400' },
      { text: 'credits', color: 'text-sky-300' },
      { text: ')', color: 'text-slate-400' },
    ],
  },
  {
    indent: 1,
    tokens: [{ text: '{', color: 'text-slate-400' }],
  },
  {
    indent: 2,
    tokens: [
      { text: 'if ', color: 'text-purple-400' },
      { text: '(', color: 'text-slate-400' },
      { text: 'credits ', color: 'text-sky-300' },
      { text: '<= ', color: 'text-slate-400' },
      { text: '0', color: 'text-lime-300' },
      { text: ')', color: 'text-slate-400' },
    ],
  },
  {
    indent: 3,
    tokens: [
      { text: 'throw ', color: 'text-purple-400' },
      { text: 'new ', color: 'text-blue-400' },
      { text: 'ArgumentOutOfRangeException', color: 'text-emerald-400' },
      { text: '(...);', color: 'text-slate-400' },
    ],
  },
  { indent: 0, tokens: [] },
  {
    indent: 2,
    tokens: [
      { text: 'Credits ', color: 'text-slate-200' },
      { text: '+= ', color: 'text-slate-400' },
      { text: 'credits', color: 'text-sky-300' },
      { text: ';', color: 'text-slate-400' },
    ],
  },
  {
    indent: 1,
    tokens: [{ text: '}', color: 'text-slate-400' }],
  },
  {
    indent: 0,
    tokens: [{ text: '}', color: 'text-slate-400' }],
  },
];

export default function LoginPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('lan.nguyen@university.edu');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: connect to backend auth
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/content-manager/dashboard';
    }, 1200);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-[var(--font-plus-jakarta-sans),ui-sans-serif,system-ui,sans-serif]">

      {/* ── LEFT: Login form ─────────────────────────────────── */}
      <section className={`relative flex w-full flex-col justify-center overflow-y-auto px-8 py-12 sm:px-14 lg:w-[46%] xl:w-[42%] transition-colors duration-300 ${isDark ? 'bg-[#061a24]' : 'bg-white'}`}>

        {/* Subtle left-panel blob */}
        <div className={`pointer-events-none absolute -left-16 top-1/3 h-72 w-72 rounded-full blur-3xl transition-colors duration-300 ${isDark ? 'bg-rose-700/10' : 'bg-rose-400/8'}`} />

        {/* Logo */}
        <div className="relative mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-rose-500 shadow-lg shadow-rose-900/40">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <p className={`text-[15px] font-semibold tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>CSharpHub</p>
            <p className={`text-[11px] leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>C# &amp; OOP learning platform</p>
          </div>
        </div>

        {/* Heading */}
        <h1 className={`relative text-[28px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Welcome back</h1>
        <p className={`relative mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Sign in to continue managing and learning C# content.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">

          {/* Email */}
          <div className="space-y-1.5">
            <label className={`block text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${isDark
                  ? 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:bg-white/8'
                  : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400'
                  }`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={`block text-[11px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`w-full rounded-xl border py-3 pl-10 pr-10 text-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${isDark
                  ? 'border-white/10 bg-white/5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:bg-white/8'
                  : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-rose-400'
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
          </div>

          {/* Keep signed in */}
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <div
              onClick={() => setKeepSignedIn(!keepSignedIn)}
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all`}
            >
              {keepSignedIn && <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
            </div>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Keep me signed in</span>
          </label>

          {/* Sign in button — Content Manager only */}
          <button
            id="login-submit-manager"
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-all hover:shadow-rose-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/* Shimmer on hover */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Monitor className="h-4 w-4" />
                Sign in as Content Manager
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className={`relative mt-8 text-center text-[11px] leading-relaxed ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
          Protected by the University SSO gateway · Accounts are provisioned by the User module.
        </p>

        {/* Sign up link */}
        <p className="relative mt-3 text-center text-sm text-slate-500">
          <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Don&apos;t have an account?</span>{' '}
          <Link href="/register" className="font-semibold text-rose-400 hover:text-rose-300 transition-colors">
            Sign up
          </Link>
        </p>
      </section>

      {/* ── RIGHT: Hero panel ────────────────────────────────── */}
      <section className="relative hidden lg:flex lg:flex-1 flex-col justify-between overflow-hidden px-12 py-8 transition-colors duration-300 bg-gradient-to-br from-[#f7444e]/45 to-[#78bcc4]/45">

        {/* Background decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-rose-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-600/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-48 w-48 rounded-full bg-violet-600/8 blur-3xl" />


        {/* Headline */}
        <div className="space-y-4">
          <h2 className="max-w-xl text-[38px] font-bold leading-tight text-black ">
            Build, review and publish C# curriculum in one place.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-800">
            Courses, chapters, lessons, resources, question banks and tests —
            with an AI generator whose output always passes through human
            review before publishing.
          </p>
        </div>

        {/* Code editor mockup */}
        <div className="w-[750px] h-[550px] mt-4 rounded-2xl bg-[#071722]/90 backdrop-blur-sm overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-slate-500/5 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-rose-500/90" />
            <span className="h-3 w-3 rounded-full bg-amber-400/90" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/90" />
            <span className="ml-3 text-[11px] text-slate-500">Student.cs</span>
          </div>
          {/* Code */}
          <div className="px-5 py-4 font-mono text-[12px] leading-[1.8] select-none">
            {CODE_LINES.map((line, i) => (
              <div key={i} style={{ paddingLeft: `${line.indent * 18}px` }}>
                {line.tokens.length > 0 ? (
                  line.tokens.map((token, j) => (
                    <span key={j} className={token.color}>
                      {token.text}
                    </span>
                  ))
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats row — với icon + khoảng cách rộng hơn */}
        <div className="mt-auto flex items-stretch gap-0 rounded-2xl py-4">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex items-center gap-3.5 ${i === 0 ? 'pl-6 pr-8' : i === STATS.length - 1 ? 'pl-8 pr-6' : 'px-8'
                  }`}
              >
                {/* Icon badge */}
                <div className="flex flex-shrink-0 items-center justify-center">
                  <Icon className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none text-black">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
