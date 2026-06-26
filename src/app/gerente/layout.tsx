import React from 'react';
import { AlarmListener } from '@/components/gerente/AlarmListener';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AlarmListener />
      {children}
    </>
  );
}
