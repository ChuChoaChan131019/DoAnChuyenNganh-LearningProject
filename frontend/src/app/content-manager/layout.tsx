import React from 'react';
import { AdminShell } from '@/components/content-manager/admin-shell';

export const metadata = {
  title: 'Quản lý nội dung',
  description: 'Quản lý nội dung học tập và câu hỏi',
};

export default function ContentManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}