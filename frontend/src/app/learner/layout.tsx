import React from 'react';
import { LearnerTopbar } from '@/components/learner/topbar';

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8F3] font-[var(--font-plus-jakarta-sans)]">
      {/* Thanh điều hướng ngang */}
      <LearnerTopbar />

      {/* Vùng chứa nội dung các trang con (Dashboard, Practice,...) */}
      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}