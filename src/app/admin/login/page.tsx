import { redirect } from 'next/navigation';
import { adminConfigured, adminIdentity, currentUser } from '@/lib/admin/auth';
import { signOut } from '@/app/admin/actions';
import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  if (!adminConfigured()) redirect('/admin/setup');
  const { denied } = await searchParams;

  // Signed in and an admin: straight through.
  const me = await adminIdentity();
  if (me) redirect('/admin');

  // Signed in but not on the admin list: say so, offer sign-out, never a form loop.
  const user = await currentUser();

  return (
    <div className="grow flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold tracking-[1.5px] text-brand">অ্যাডমিন প্যানেল</span>
          <h1 className="serif text-[30px] font-extrabold">লগইন</h1>
        </div>

        {user ? (
          <div className="bg-surface border border-rule rounded-xl p-5 flex flex-col gap-3">
            <p className="text-[14.5px] leading-relaxed">
              <strong>{user.email}</strong> হিসেবে লগইন আছেন, কিন্তু এই ঠিকানাটি অ্যাডমিন তালিকায় নেই।
              একজন সুপার অ্যাডমিন আপনাকে যোগ করলে ঢুকতে পারবেন।
            </p>
            <form action={signOut}>
              <button type="submit" className="h-11 px-5 rounded-lg bg-surface border border-rule font-semibold text-[14.5px] hover:border-brand">
                লগআউট
              </button>
            </form>
          </div>
        ) : (
          <>
            {denied && (
              <p className="px-4 py-3 rounded-lg bg-warnsoft border-s-[3px] border-warn text-[14px] text-warn">
                এই পাতাটি দেখতে লগইন লাগবে।
              </p>
            )}
            <LoginForm />
          </>
        )}
      </div>
    </div>
  );
}
