import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminPage, Panel } from '@/app/admin/ui';
import PasswordForm from './PasswordForm';

export const metadata: Metadata = { title: 'পাসওয়ার্ড' };

export default async function PasswordPage() {
  const me = await requireAdmin();
  return (
    <AdminPage title="পাসওয়ার্ড বদলান" lede={`${me.email} অ্যাকাউন্টের পাসওয়ার্ড। বদলানোর পর অন্য ডিভাইসে আবার লগইন লাগবে।`}>
      <Panel>
        <PasswordForm />
      </Panel>
    </AdminPage>
  );
}
