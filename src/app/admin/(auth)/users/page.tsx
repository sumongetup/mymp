import { requireSuperAdmin } from '@/lib/admin/auth';
import { listAdmins } from '@/lib/admin/store';
import { deleteAdmin } from '@/app/admin/actions';
import { AdminPage, Panel, Table, Td, Badge, when } from '@/app/admin/ui';
import AddAdminForm from './AddAdminForm';

export default async function UsersAdmin() {
  const me = await requireSuperAdmin();
  const admins = await listAdmins();

  return (
    <AdminPage
      title="ব্যবহারকারী"
      lede="সুপার অ্যাডমিন ব্যবহারকারী ও সেটিংস সামলান; সম্পাদক তথ্য ও সংবাদ সম্পাদনা করেন কিন্তু কাউকে যোগ বা বাদ দিতে পারেন না।"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        <Table head={['ইমেইল', 'ভূমিকা', 'যোগ হয়েছেন', '']}>
          {admins.map((a) => (
            <tr key={a.user_id}>
              <Td className="font-semibold">{a.email}{a.user_id === me.id && <span className="ms-2 text-[12px] text-muted">(আপনি)</span>}</Td>
              <Td><Badge tone={a.role === 'super_admin' ? 'good' : 'neutral'}>{a.role === 'super_admin' ? 'সুপার অ্যাডমিন' : 'সম্পাদক'}</Badge></Td>
              <Td className="text-muted whitespace-nowrap">{when(a.created_at)}</Td>
              <Td className="text-end">
                {a.user_id !== me.id && (
                  <form action={deleteAdmin}>
                    <input type="hidden" name="user_id" value={a.user_id} />
                    <button type="submit" className="text-[13px] font-semibold text-[#a8323d] hover:underline">সরান</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>

        <Panel title="নতুন ব্যবহারকারী">
          <AddAdminForm />
          <p className="mt-3 text-[12.5px] text-muted leading-relaxed">
            নতুন ইমেইল হলে একটি সাময়িক পাসওয়ার্ড তৈরি হবে, যা একবারই দেখানো হবে। ব্যবহারকারী লগইনের পর
            Supabase-এর পাসওয়ার্ড বদলের লিংক দিয়ে নিজের পাসওয়ার্ড ঠিক করে নেবেন।
          </p>
        </Panel>
      </div>
    </AdminPage>
  );
}
