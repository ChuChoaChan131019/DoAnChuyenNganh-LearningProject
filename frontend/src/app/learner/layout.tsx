import React from 'react';
import { LearnerShell } from '@/components/learner/shell';

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearnerShell>{children}</LearnerShell>;
}
