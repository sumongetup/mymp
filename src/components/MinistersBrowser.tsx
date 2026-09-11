'use client';

import { useQueryParam } from '@/lib/useQueryParam';
import Link from 'next/link';
import MemberPhoto from './MemberPhoto';
import PartyBadge from './PartyBadge';

export interface MinisterPerson {
  key: string;
  title: string;
  name: string;
  href: string | null;
  photo: string | null;
  initial: string;
  party: { abbr: string; name: string; color: string } | null;
  seat: string | null;
  rankNote: string | null;
  isMp: boolean;
  /** On the cabinet list, not yet placed by an editor as an MP or not. */
  pending: boolean;
  ministries: { name: string; key: string; since: string | null }[];
  sourceUrl: string | null;
}

export interface MinisterGroup {
  title: string;
  people: MinisterPerson[];
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** The cabinet by rank, with a ministry filter. Plain props only: it reads no site data. */
export default function MinistersBrowser({ groups, ministries }: { groups: MinisterGroup[]; ministries: { key: string; label: string; count: number }[] }) {
  const [ministry, setMinistry] = useQueryParam('ministry');
  const shown = groups.map((g) => ({ ...g, people: ministry ? g.people.filter((p) => p.ministries.some((m) => m.key === ministry)) : g.people }));
  const total = shown.reduce((n, g) => n + g.people.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          aria-label="মন্ত্রণালয় বা বিভাগ"
          value={ministry}
          onChange={(e) => setMinistry(e.target.value)}
          className="h-11 rounded-[10px] border border-rule bg-surface px-3 text-[14.5px] outline-none focus:border-brand sm:w-[420px] min-w-0"
        >
          <option value="">সব মন্ত্রণালয় ও বিভাগ</option>
          {ministries.map((m) => <option key={m.key} value={m.key}>{m.label} ({bn(m.count)})</option>)}
        </select>
        <p className="text-[14px] text-muted" aria-live="polite">
          {bn(total)} জন
          {ministry && (
            <button type="button" onClick={() => setMinistry('')} className="ms-3 font-semibold text-brand hover:underline">সবাইকে দেখুন</button>
          )}
        </p>
      </div>

      {shown.map((g) =>
        !ministry || g.people.length ? (
          <section key={g.title} className="flex flex-col gap-3">
            <h2 className="display text-[22px] flex items-baseline gap-2.5">
              {g.title}
              <span className="text-[14px] font-semibold text-muted">{bn(g.people.length)} জন</span>
            </h2>
            {g.people.length === 0 ? (
              <p className="text-[14.5px] text-muted">মন্ত্রিপরিষদ বিভাগের তালিকায় এখন কোনো {g.title} নেই।</p>
            ) : (
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {g.people.map((p) => (
                  <li key={p.key} className="bg-surface border border-rule rounded-card shadow-card p-4 sm:p-5 flex gap-4 items-start">
                    <MemberPhoto src={p.photo} alt="" initial={p.initial} size={56} />
                    <div className="grow min-w-0 flex flex-col gap-2">
                      <div className="flex flex-col gap-0.5">
                        {p.href ? (
                          <Link href={p.href} className="display text-[17px] font-bold leading-snug hover:text-brand">{p.name}</Link>
                        ) : (
                          <span className="display text-[17px] font-bold leading-snug">{p.name}</span>
                        )}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                          {p.party && (
                            <span className="flex items-center gap-1.5 font-semibold text-inksoft">
                              <PartyBadge abbr={p.party.abbr} color={p.party.color} size={16} />
                              {p.party.name}
                            </span>
                          )}
                          {p.seat && <span>{p.seat}</span>}
                          {!p.isMp && <span>{p.pending ? 'সংসদ সদস্য কিনা যাচাই হচ্ছে' : 'সংসদ সদস্য নন'}</span>}
                          {p.rankNote && <span>{p.rankNote}</span>}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {p.ministries.map((m) => (
                          <li key={m.key} className="text-[14.5px] leading-snug">
                            <span className="font-semibold">{m.name}</span>
                            {m.since && <span className="text-[13px] text-muted">, {m.since} থেকে</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {p.sourceUrl && (
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[12.5px] text-muted hover:text-brand" title="মন্ত্রিপরিষদ বিভাগের তালিকা">
                        সূত্র ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
