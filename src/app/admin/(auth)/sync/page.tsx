import type { Metadata } from 'next';
import { meta, bn, dateBn, members, getMemberById } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { listSyncRuns, listPostRuns, listPostAliases } from '@/lib/admin/store';
import { resolvePostName, resolvePostNamesNotMp } from '@/app/admin/actions';
import { rankMatches } from '@/lib/matching/nameMatch';
import { NAME_IDF } from '@/lib/matching/nameIdf';
import { brokenSources } from '@/lib/posts/sync';
import { POST_SOURCES } from '../../../../../config/sync-sources';
import { AdminPage, Panel, Table, Td, Badge, Empty, Notice, when } from '@/app/admin/ui';
import PublishButton from '../PublishButton';
import PostsSyncButton from '../PostsSyncButton';

export const metadata: Metadata = { title: 'সিঙ্ক ও প্রকাশ' };

const TRIGGER_BN: Record<string, string> = { cron: 'Vercel, দৈনিক', github: 'GitHub, ৬ ঘণ্টা', admin: 'অ্যাডমিন', cli: 'টার্মিনাল' };
/** Advisers are usually technocrats, so 'not an MP' is the likely answer for them. */
const ADVISER = 'উপদেষ্টা';
const sourceLabel = (key: string) => POST_SOURCES.find((s) => s.key === key)?.label ?? key;

export default async function SyncAdmin() {
  await requireAdmin();
  const [runs, { runs: postRuns, missing }, aliases] = await Promise.all([listSyncRuns(40), listPostRuns(30), listPostAliases().catch(() => [])]);

  const finished = postRuns.filter((r) => r.status !== 'running');
  const broken = brokenSources(finished);
  const known = new Set(aliases.map((a) => a.name_key));
  const queue = (finished.find((r) => r.status === 'ok')?.unmatched_names ?? []).filter(
    (u, i, all) => !known.has(u.key) && all.findIndex((x) => x.key === u.key) === i,
  );
  const picker = [...members].sort((a, b) => (a.nameBn ?? '').localeCompare(b.nameBn ?? '', 'bn'));
  // Candidates are ranked here rather than read from the run, so an older run's
  // suggestions can never outlive the rules that rejected them.
  const memberIndex = members.map((m) => ({ id: m.id, nameBn: m.nameBn }));
  const advisers = queue.filter((u) => u.title === ADVISER);

  return (
    <AdminPage
      title="সিঙ্ক ও প্রকাশ"
      lede={`সাইট এখন যে তথ্য দেখাচ্ছে তা ${dateBn(meta.syncedAt)}-এ সংসদের তথ্যভান্ডার থেকে আনা। প্রতিটি প্রকাশে তা নতুন করে আনা হয়।`}
      actions={<PublishButton />}
    >
      {broken.map((s) => (
        <Notice key={s} tone="bad">
          <strong>{sourceLabel(s)}</strong> টানা তিনবার পড়া যায়নি। পাতার গঠন বা ঠিকানা বদলেছে কিনা দেখে config/sync-sources.ts হালনাগাদ করতে হবে।
          সর্বশেষ ত্রুটি: {finished[0]?.errors?.find((e) => e.source === s)?.message}
        </Notice>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="প্রকাশ চাপলে কী হয়">
          <ol className="flex flex-col gap-2 text-[14px] leading-relaxed text-inksoft list-decimal ps-5">
            <li>parliament.gov.bd থেকে সব সদস্য ও কমিটি নতুন করে আনা হয়।</li>
            <li>আপনার হাতে-সম্পাদিত প্রতিটি ফিল্ড তার উপরে বসানো হয়, তাই সংসদের তথ্য বদলালেও আপনার সম্পাদনা থাকে।</li>
            <li>লুকানো সদস্য ও কমিটি বাদ পড়ে; প্রকাশিত সংবাদ ও সরকারি পদ যুক্ত হয়।</li>
            <li>সব পাতা নতুন করে তৈরি হয়ে mymp.bd-তে যায়। ২-৩ মিনিট লাগে।</li>
          </ol>
          <p className="mt-3 text-[13px] text-muted">সংসদের সার্ভার না পাওয়া গেলে আগের তথ্যই থাকে, সাইট ভাঙে না। নিচের তালিকায় সেটি “ব্যর্থ” হিসেবে লেখা থাকে।</p>
        </Panel>
        <Panel title="রাতের স্বয়ংক্রিয় সিঙ্ক">
          <p className="text-[14px] leading-relaxed text-inksoft">
            প্রতিদিন বাংলাদেশ সময় রাত ৩টায় সাইট নিজে নিজে একবার প্রকাশ হয়, যাতে সংসদের নতুন তথ্য কারো
            মনে করার অপেক্ষায় না থাকে। কয়েক দিন পরপর “কিছুই বদলায়নি” দেখলে তা স্বাভাবিক; টানা ব্যর্থ দেখলে
            সংসদের সাইট বদলেছে কিনা দেখতে হবে।
          </p>
        </Panel>
      </div>

      <Panel title="সরকারি পদ: মন্ত্রিসভা ও সংসদের পদ">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <p className="text-[14px] leading-relaxed text-inksoft max-w-[640px]">
              মন্ত্রিপরিষদ বিভাগের মন্ত্রী, প্রতিমন্ত্রী, উপমন্ত্রী ও উপদেষ্টার তালিকা এবং সংসদের স্পিকার, হুইপ ও নেতাদের তালিকা
              প্রতি ৬ ঘণ্টায় মেলানো হয় (GitHub Actions; Vercel দিনে একবার বাড়তি)। নতুন পদ যুক্ত হয়, তালিকা থেকে সরে গেলে পদ শেষ
              হয়; কিছুই মুছে ফেলা হয় না, আর হাতে যোগ করা পদ সিঙ্ক ছোঁয় না। কিছু বদলালে বা ব্যর্থ হলে {`mymp.bangladesh@gmail.com`}-এ
              ইমেইল যায় এবং সাইট নতুন করে তৈরি হয়।
            </p>
            <PostsSyncButton />
          </div>
          {missing ? (
            <Notice tone="warn">
              সরকারি পদের টেবিল এখনো তৈরি হয়নি। Supabase → SQL Editor-এ supabase/migrations/003_posts.sql চালান, তারপর “এখনই মেলান” চাপুন।
            </Notice>
          ) : postRuns.length === 0 ? (
            <Empty>প্রথম সিঙ্কের পর এখানে হিসাব জমা হবে।</Empty>
          ) : (
            <Table head={['কখন', 'কে চালাল', 'ফল', 'পড়া', 'যুক্ত', 'শেষ', 'অপরিবর্তিত', 'মেলেনি', 'ত্রুটি']} minWidth={860}>
              {postRuns.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{when(r.started_at)}</Td>
                  <Td className="whitespace-nowrap text-[13px]">{TRIGGER_BN[r.trigger ?? ''] ?? r.trigger}</Td>
                  <Td>
                    <Badge tone={r.status === 'ok' ? 'good' : r.status === 'failed' ? 'bad' : 'warn'}>
                      {r.status === 'ok' ? 'সফল' : r.status === 'failed' ? 'ব্যর্থ' : 'চলছে'}
                    </Badge>
                  </Td>
                  <Td className="tnum">{r.parsed !== null ? bn(r.parsed) : 'নেই'}</Td>
                  <Td className="tnum">{bn(r.added)}</Td>
                  <Td className="tnum">{bn(r.closed)}</Td>
                  <Td className="tnum">{bn(r.unchanged)}</Td>
                  <Td className="tnum">{bn(r.unmatched)}</Td>
                  <Td className="text-[12.5px] text-muted max-w-[300px] break-words">
                    {(r.errors ?? []).map((e) => `${e.source}: ${e.message}`).join('; ')}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>

      <Panel title={`মেলানো যায়নি (${bn(queue.length)})`}>
        {queue.length === 0 ? (
          <Empty>{missing ? 'টেবিল তৈরি ও প্রথম সিঙ্কের পর এখানে নাম আসবে।' : 'সব নাম মিলেছে বা আগেই ঠিক করা হয়েছে।'}</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] text-muted leading-relaxed max-w-[760px]">
              তালিকার এই নামগুলো কোনো সংসদ সদস্যের সঙ্গে নিশ্চিতভাবে মেলেনি, তাই সিঙ্ক এদের কারও পাতায় বসায়নি। শুধু পদবি এক হলে
              (রহমান, ইসলাম, হক) আর কোনো নাম দেখানো হয় না; ডাক নামও মিললে তবেই সম্ভাব্য নাম আসে। কিছুই বেছে না দেওয়া থাকে,
              তাই মেলানোটা সবসময় আপনার নিজের সিদ্ধান্ত। বাছাই মনে রাখা হয় এবং সঙ্গে সঙ্গে সিঙ্ক চলে।
            </p>

            {advisers.length > 1 && (
              <details className="rounded-lg border border-rule bg-paper px-3.5 py-2.5">
                <summary className="cursor-pointer text-[13.5px] font-semibold">
                  সবগুলো উপদেষ্টা এমপি নন ({bn(advisers.length)} জন)
                </summary>
                <div className="pt-3 flex flex-col gap-2.5">
                  <p className="text-[13px] text-muted leading-relaxed">
                    নিচের সবার পাশে “সংসদ সদস্য নন” লেখা হবে, আর পরের সিঙ্কে আর জিজ্ঞেস করা হবে না। কারও নাম যদি আসলে
                    সংসদ সদস্যের হয়, আগে তাকে আলাদা করে মিলিয়ে নিন।
                  </p>
                  <ul className="text-[13.5px] flex flex-col gap-1 ps-4 list-disc">
                    {advisers.map((u) => <li key={u.key}>{u.name_bn}<span className="text-muted">{u.ministry_bn ? `, ${u.ministry_bn}` : ''}</span></li>)}
                  </ul>
                  <form action={resolvePostNamesNotMp}>
                    {advisers.map((u) => <input key={u.key} type="hidden" name="entry" value={JSON.stringify([u.key, u.name_bn])} />)}
                    <button type="submit" className="h-9 px-3.5 rounded-lg bg-brand text-white text-[13.5px] font-semibold hover:bg-branddark">
                      নিশ্চিত করুন, {bn(advisers.length)} জনকে এমপি নন লিখুন
                    </button>
                  </form>
                </div>
              </details>
            )}

            {queue.map((u) => {
              const adviser = u.title === ADVISER;
              const suggestions = rankMatches(u.name_bn, memberIndex, NAME_IDF);
              const pick = (
                <form action={resolvePostName} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="name_key" value={u.key} />
                  <input type="hidden" name="name_bn" value={u.name_bn} />
                  <select name="member_id" required defaultValue="" className="h-9 max-w-[280px] rounded-lg border border-rule bg-surface px-2 text-[13.5px]">
                    <option value="" disabled>সংসদ সদস্য বাছুন</option>
                    {picker.map((m) => <option key={m.id} value={m.id}>{m.nameBn} ({m.seat?.nameBn ?? 'নেই'})</option>)}
                  </select>
                  <button type="submit" className="h-9 px-3.5 rounded-lg border border-rule text-[13.5px] font-semibold hover:border-ink">মেলান</button>
                </form>
              );

              return (
                <div key={u.key} className="border border-rule rounded-lg p-3.5 flex flex-col gap-3">
                  <div>
                    <div className="font-semibold text-[15px]">{u.name_bn}</div>
                    <div className="text-[13px] text-muted">
                      {u.title}{u.ministry_bn ? `, ${u.ministry_bn}` : ''}
                      {u.stored_as_non_mp ? ', আপাতত সংসদ সদস্য নন হিসেবে দেখানো হচ্ছে' : ''}
                    </div>
                  </div>

                  {suggestions.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {suggestions.map((s) => {
                        const m = getMemberById(s.id);
                        return (
                          <li key={s.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px]">
                            <Badge tone={s.strength === 'সম্ভাব্য' ? 'good' : 'warn'}>{s.strength}</Badge>
                            <span className="font-semibold">{s.nameBn}</span>
                            <span className="text-muted">{m?.seat?.nameBn ?? 'আসন নেই'}, {m?.party?.abbr ?? 'দল নেই'}</span>
                            <form action={resolvePostName}>
                              <input type="hidden" name="name_key" value={u.key} />
                              <input type="hidden" name="name_bn" value={u.name_bn} />
                              <input type="hidden" name="member_id" value={s.id} />
                              <button type="submit" className="h-8 px-3 rounded-lg border border-rule text-[13px] font-semibold hover:border-ink">ইনিই</button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-muted">সম্ভাব্য কোনো সদস্য পাওয়া যায়নি।</p>
                  )}

                  {adviser ? (
                    <div className="flex flex-col gap-2">
                      <form action={resolvePostName} className="flex items-center gap-3">
                        <input type="hidden" name="name_key" value={u.key} />
                        <input type="hidden" name="name_bn" value={u.name_bn} />
                        <input type="hidden" name="member_id" value="" />
                        <button type="submit" className="h-9 px-3.5 rounded-lg bg-brand text-white text-[13.5px] font-semibold hover:bg-branddark">এমপি নন</button>
                        <span className="text-[12.5px] text-muted">উপদেষ্টারা সাধারণত সংসদ সদস্য নন।</span>
                      </form>
                      <details>
                        <summary className="cursor-pointer text-[13px] font-semibold text-brand">তবুও মেলান</summary>
                        <div className="pt-2.5">{pick}</div>
                      </details>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {pick}
                      <form action={resolvePostName}>
                        <input type="hidden" name="name_key" value={u.key} />
                        <input type="hidden" name="name_bn" value={u.name_bn} />
                        <input type="hidden" name="member_id" value="" />
                        <button type="submit" className="h-9 px-3.5 rounded-lg border border-rule text-[13.5px] font-semibold hover:border-ink">এমপি নন</button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      {aliases.length > 0 && (
        <Panel title="মনে রাখা নাম">
          <Table head={['তালিকার নাম', 'যা ঠিক করা হয়েছে', 'কে', 'কখন']}>
            {aliases.map((a) => (
              <tr key={a.name_key}>
                <Td>{a.name_bn}</Td>
                <Td>{a.member_id ? getMemberById(a.member_id)?.nameBn ?? a.member_id : 'সংসদ সদস্য নন'}</Td>
                <Td className="text-[13px] text-muted">{a.created_by}</Td>
                <Td className="whitespace-nowrap text-muted">{when(a.created_at)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      <Panel title="সিঙ্কের ইতিহাস">
        {runs.length === 0 ? (
          <Empty>ডেটাবেস যুক্ত হওয়ার পর প্রথম প্রকাশ থেকে এখানে হিসাব জমা হবে।</Empty>
        ) : (
          <Table head={['কখন', 'ফল', 'সদস্য', 'কমিটি', 'সম্পাদনা প্রয়োগ', 'বার্তা']}>
            {runs.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{when(r.started_at)}</Td>
                <Td><Badge tone={r.ok ? 'good' : 'bad'}>{r.ok ? 'সফল' : 'ব্যর্থ'}</Badge></Td>
                <Td className="tnum">{r.members !== null ? bn(r.members) : 'নেই'}</Td>
                <Td className="tnum">{r.committees !== null ? bn(r.committees) : 'নেই'}</Td>
                <Td className="tnum">{r.overrides_applied !== null ? bn(r.overrides_applied) : 'নেই'}</Td>
                <Td className="text-[13px] text-muted max-w-[320px] break-words">{r.message ?? ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
