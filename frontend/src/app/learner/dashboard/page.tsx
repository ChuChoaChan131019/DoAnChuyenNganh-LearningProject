'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  BookOpen,
  Clock,
  Flame,
  CheckCircle2,
  PlayCircle,
  Compass,
  Target,
  Bot,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function LearnerDashboardPage() {
  const { user } = useAuth();

  const displayName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Learner';

  const stats = [
    {
      label: 'Enrolled courses',
      value: '4',
      subtext: '2 in progress',
      icon: BookOpen,
      iconColor: 'text-[#145a68]',
      bgColor: 'bg-cyan-50',
    },
    {
      label: 'Learning time',
      value: '28.5 hrs',
      subtext: '+4.2 hrs this week',
      icon: Clock,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Daily streak',
      value: '12 days',
      subtext: 'Personal best!',
      icon: Flame,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Practice accuracy',
      value: '84.6%',
      subtext: '168 questions solved',
      icon: TrendingUp,
      iconColor: 'text-[#f7444e]',
      bgColor: 'bg-rose-50',
    },
  ];

  const quickLinks = [
    {
      title: 'Browse Courses',
      description: 'Explore C# fundamentals, OOP, LINQ, and ASP.NET Core courses.',
      href: '/learner/courses',
      icon: Compass,
      buttonText: 'View catalog',
    },
    {
      title: 'Practice Bank',
      description: 'Challenge yourself with targeted question drills and weak topic reviews.',
      href: '/learner/practice',
      icon: Target,
      buttonText: 'Start practice',
    },
    {
      title: 'AI Tutor',
      description: 'Get instant explanations, code reviews, and debugging help 24/7.',
      href: '/learner/ai-tutor',
      icon: Bot,
      buttonText: 'Ask AI',
    },
  ];

  return (
    <div className="mx-auto max-w-[1216px] space-y-8">
      {/* 1. Header & Personalized Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe6df]/80 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#145a68]">
            Học viên CSharpHub
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f3741] sm:text-4xl">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sẵn sàng tiếp tục lộ trình làm chủ ngôn ngữ C# và .NET của bạn hôm nay chưa?
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/learner/practice"
            className="flex items-center gap-2 rounded-xl bg-[#f7444e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
          >
            <PlayCircle className="h-4 w-4" />
            Luyện tập ngay
          </Link>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] transition hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bgColor} ${stat.iconColor}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-bold text-[#0f3741]">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Continue Learning Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-[0_8px_24px_rgba(0,44,62,0.04)] sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Khóa học đang học dở
            </div>
            <h2 className="text-xl font-bold text-[#0f3741] sm:text-2xl">
              Object-Oriented Programming in C#
            </h2>
            <p className="text-sm text-slate-600">
              Bài học tiếp theo: <span className="font-semibold text-slate-800">Chương 3 - Abstract Classes & Interfaces trong C#</span>
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Tiến độ hoàn thành</span>
                <span className="font-bold text-[#0f3741]">70% (14/20 bài)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#f47c83,#78bcc4)]"
                  style={{ width: '70%' }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <Link
              href="/learner/courses"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f3741] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#145a68] sm:w-auto"
            >
              Học tiếp ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Quick Shortcuts */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[#0f3741]">Phím tắt điều hướng nhanh</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {quickLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-[0_6px_20px_rgba(0,44,62,0.03)] transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0f3741]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#0f3741]">{link.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {link.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#145a68] transition hover:text-[#f7444e]"
                  >
                    {link.buttonText}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
