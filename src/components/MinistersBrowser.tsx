'use client';

import { useQueryParam } from '@/lib/useQueryParam';
import Link from 'next/link';
import MemberPhoto from './MemberPhoto';
import PartyBadge from './PartyBadge';
import Icon from './Icon';

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

/** One line under each rank, so a reader knows what the rank means. */
const RANK_NOTE: Record<string, string> = {
  প্রধানমন্ত্রী: 'সরকারপ্রধান, মন্ত্রিসভার সভাপতি।',
  মন্ত্রী: 'মন্ত্রণালয়ের পূর্ণ দায়িত্বে।',
  প্রতিমন্ত্রী: 'মন্ত্রীর সঙ্গে বা একাই কোনো মন্ত্রণালয়ের দায়িত্বে, পদমর্যাদায় মন্ত্রীর পরে।',
  উপমন্ত্রী: 'প্রতিমন্ত্রীর পরের ধাপ।',
  উপদেষ্টা: 'নির্দিষ্ট বিষয়ে প্রধানমন্ত্রীকে পরামর্শ দেন; বেশিরভাগ উপদেষ্টা সংসদ সদস্য নন।',
};

function PersonCard({ p, hero = false }: { p: MinisterPerson; hero?: boolean }) {
  const name = p.href ? (
    <Link href={p.href} className={`display font-bold leading-snug hover:text-brand ${hero ? 'text-[24px] sm:text-[28px]' : 'text-[17px]'}`}>{p.name}</Link>
  ) : (
    <span className={`display font-bold leading-snug ${hero ? 'text-[24px] sm:text-[28px]' : 'text-[17px]'}`}>{p.name}</span>
  );

  return (
    <div className={`h-full bg-surface border rounded-card shadow-card flex items-start ${hero ? 'border-brandring p-5 sm:p-7 gap-5 sm:gap-6' : 'border-rule p-4 sm:p-5 gap-4'}`}>
      <MemberPhoto src={p.photo} alt="" initial={p.initial} size={hero ? 92 : 56} />
      <div className="grow min-w-0 flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          {name}
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
            {p.party && (
              <span className="flex items-center gap-1.5 font-semibold text-inksoft">
                <PartyBadge abbr={p.party.abbr} color={p.party.color} size={16} />
                {p.party.name}
              </span>
            )}
            {p.seat && <span>{p.seat}</span>}
            {!p.isMp && (
              <span className="px-1.5 py-px rounded border border-rule text-[12px]">
                {p.pending ? 'সংসদ সদস্য কিনা যাচাই হচ্ছে' : 'সংসদ সদস্য নন'}
              </span>
            )}
            {p.rankNote && <span>{p.rankNote}</span>}
          </span>
        </div>

        {/* The head of government holds several portfolios, so they sit side by
            side rather than in a narrow column with the card half empty. */}
        <ul className={hero ? 'flex flex-wrap gap-2 pt-1' : 'flex flex-col gap-1.5'}>
          {p.ministries.map((m) => (
            <li
              key={m.key}
              className={hero
                ? 'rounded-lg border border-rule bg-paper px-3 py-2 flex flex-col gap-0.5'
                : 'flex flex-wrap items-baseline gap-x-2 text-[14.5px] leading-snug'}
            >
              <span className={hero ? 'font-semibold text-[14.5px] leading-snug' : 'font-semibold'}>{m.name}</span>
              {m.since && <span className="text-[12.5px] text-muted">{m.since} থেকে</span>}
            </li>
          ))}
          {p.ministries.length === 0 && <li className="text-[13.5px] text-muted">মন্ত্রণালয় লেখা নেই</li>}
        </ul>
        {hero && p.href && (
          <Link href={p.href} className="self-start inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
            পুরো পরিচিতি, সংবাদ ও ভিডিও
            <Icon name="arrow" size={15} />
          </Link>
        )}
      </div>
      {p.sourceUrl && (
        <a
          href={p.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[12.5px] text-muted hover:text-brand"
          title="মন্ত্রিপরিষদ বিভাগের তালিকা"
        >
          সূত্র ↗
        </a>
      )}
    </div>
  );
}

/** The cabinet by rank, with a ministry filter. Plain props only: it reads no site data. */
export default function MinistersBrowser({
  groups,
  ministries,
}: {
  groups: MinisterGroup[];
  ministries: { key: string; label: string; count: number }[];
}) {
  const [ministry, setMinistry] = useQueryParam('ministry');
  const shown = groups.map((g) => ({
    ...g,
    people: ministry ? g.people.filter((p) => p.ministries.some((m) => m.key === ministry)) : g.people,
  }));
  const total = shown.reduce((n, g) => n + g.people.length, 0);
  const label = ministries.find((m) => m.key === ministry)?.label;

  // The head of government gets the whole width; everyone else shares a grid.
  const pm = shown[0]?.title === 'প্রধানমন্ত্রী' ? shown[0] : null;
  const rest = pm ? shown.slice(1) : shown;

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-card border border-rule bg-surface px-4 py-3">
        <label className="flex items-center gap-2.5 grow min-w-0">
          <Icon name="search" size={17} className="text-muted shrink-0" />
          <span className="sr-only">মন্ত্রণালয় বা বিভাগ</span>
          <select
            aria-label="মন্ত্রণালয় বা বিভাগ"
            value={ministry}
            onChange={(e) => setMinistry(e.target.value)}
            className="h-10 grow min-w-0 rounded-lg border border-rule bg-paper px-3 text-[14.5px] outline-none focus:border-brand focus:ring-4 focus:ring-brandring"
          >
            <option value="">সব মন্ত্রণালয় ও বিভাগ</option>
            {ministries.map((m) => <option key={m.key} value={m.key}>{m.label} ({bn(m.count)})</option>)}
          </select>
        </label>
        <p className="text-[14px] text-muted shrink-0" aria-live="polite">
          {ministry ? <>{label}: {bn(total)} জন</> : <>{bn(total)} জন</>}
          {ministry && (
            <button type="button" onClick={() => setMinistry('')} className="ms-3 font-semibold text-brand hover:underline">সবাইকে দেখুন</button>
          )}
        </p>
      </div>

      {pm && pm.people.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="display text-[22px]">{pm.title}</h2>
            <p className="text-[13.5px] text-muted">{RANK_NOTE[pm.title]}</p>
          </div>
          {pm.people.map((p) => <PersonCard key={p.key} p={p} hero />)}
        </section>
      )}

      {rest.map((g) =>
        !ministry || g.people.length ? (
          <section key={g.title} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="display text-[22px] flex items-baseline gap-2.5">
                {g.title}
                <span className="text-[13px] font-semibold text-brand bg-brandsoft rounded-full px-2.5 py-0.5">{bn(g.people.length)} জন</span>
              </h2>
              <p className="text-[13.5px] text-muted">{RANK_NOTE[g.title]}</p>
            </div>
            {g.people.length === 0 ? (
              <p className="text-[14.5px] text-muted rounded-card border border-dashed border-rule bg-surface/60 px-4 py-5">
                মন্ত্রিপরিষদ বিভাগের তালিকায় এখন কোনো {g.title} নেই।
              </p>
            ) : (
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                {g.people.map((p) => <li key={p.key}><PersonCard p={p} /></li>)}
              </ul>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
