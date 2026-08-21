import React from 'react';
import { AdminShell } from '@/components/content-manager/admin-shell';

export const metadata = {
  title: 'Content Manager',
  description: 'Manage learning content and questions',
};

export default function ContentManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}