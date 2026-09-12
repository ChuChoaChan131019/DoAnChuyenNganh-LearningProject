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
      delta: '2 in progress',
      icon: BookOpen,
    },
    {
      label: 'Learning time',
      value: '28.5 hrs',
      delta: '+4.2 hrs this week',
      icon: Clock,
    },
    {
      label: 'Daily streak',
      value: '12 days',
      delta: 'Personal best!',
      icon: Flame,
    },
    {
      label: 'Practice accuracy',
      value: '84.6%',
      delta: '168 questions solved',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sẵn sàng tiếp tục lộ trình làm chủ ngôn ngữ C# và .NET của bạn hôm nay chưa?
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/learner/practice"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"
          >
            <PlayCircle className="h-4 w-4" />
            Luyện tập ngay
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold">{stat.value}</p>
              {stat.delta && (
                <p className="mt-1 text-xs text-success">{stat.delta}</p>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-3">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Khóa học đang học dở
            </h2>
            <h3 className="text-xl font-bold">
              Object-Oriented Programming in C#
            </h3>
            <p className="text-sm text-muted-foreground">
              Bài học tiếp theo: <span className="font-semibold text-foreground">Chương 3 - Abstract Classes & Interfaces trong C#</span>
            </p>

            <div className="w-full max-w-md pt-4">
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Tiến độ hoàn thành</span>
                <span className="font-bold text-foreground">70%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: '70%' }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <Link
              href="/learner/courses"
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
            >
              Học tiếp ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
