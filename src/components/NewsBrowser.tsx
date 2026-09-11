'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import StoryCard from './StoryCard';
import type { StoryView } from '@/lib/newsView';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/**
 * Headline text for matching: whole words, vowel signs kept. (search.ts's
 * normalise drops the signs, which splits a Bangla word into letters and would
 * let "ব্রিকস" match nearly any headline.) Joiners and the hasanta go, since
 * outlets write "বাক্‌স্বাধীনতা" and "বাকস্বাধীনতা" alike.
 */
const fold = (s: string) =>
  s.normalize('NFC').replace(/[\u200B-\u200D\uFEFF\u09CD]/g, '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

const PAGE = 30;

/** The member filter lives in the address ("/songbad#mp=<slug>"), so a member page can link to its own news. */
const subscribeHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const memberFromHash = () => {
  const m = window.location.hash.match(/^#mp=([\w-]+)$/);
  return m ? m[1]! : '';
};
function setMemberHash(slug: string) {
  window.history.replaceState(null, '', slug ? `#mp=${slug}` : window.location.pathname);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export default function NewsBrowser({
  stories,
  members,
  outlets,
}: {
  stories: StoryView[];
  members: { slug: string; name: string; count: number }[];
  outlets: { name: string; count: number }[];
}) {
  const member = useSyncExternalStore(subscribeHash, memberFromHash, () => '');
  const [outlet, setOutlet] = useState('');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const top = useRef<HTMLDivElement>(null);

  // A member picked from the side list lower down brings the list back into view.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const box = top.current?.getBoundingClientRect();
    if (box && box.top < 0) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [member]);

  const keyed = useMemo(
    () => stories.map((s) => ({ s, key: fold([s.lead.title, ...s.also.map((a) => a.title), s.member?.name ?? ''].join(' ')) })),
    [stories],
  );

  const filtered = useMemo(() => {
    const words = fold(q).split(' ').filter(Boolean);
    return keyed
      .filter(({ s, key }) => {
        if (member && s.member?.slug !== member) return false;
        if (outlet && s.lead.source !== outlet && !s.also.some((a) => a.source === outlet)) return false;
        return words.every((w) => key.includes(w));
      })
      .map((x) => x.s);
  }, [keyed, q, member, outlet]);

  const visible = filtered.slice(0, shown);
  const days: { date: string; label: string; items: StoryView[] }[] = [];
  for (const s of visible) {
    const last = days[days.length - 1];
    if (last?.date === s.date) last.items.push(s);
    else days.push({ date: s.date, label: s.dateLabel, items: [s] });
  }
  const perDay = new Map<string, number>();
  for (const s of filtered) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);

  const filtering = !!(member || outlet || q.trim());
  const field = 'h-11 rounded-[10px] border border-rule bg-surface px-3 text-[14.5px] outline-none focus:border-brand';

  return (
    <div ref={top} className="flex flex-col gap-6 scroll-mt-24">
      <div className="grid grid-cols-2 sm:flex gap-2.5">
        <label className={`${field} col-span-2 flex items-center gap-2 grow min-w-0`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">শিরোনামে খুঁজুন</span>
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="শিরোনামে খুঁজুন"
            className="grow min-w-0 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        <select
          aria-label="সংসদ সদস্য"
          value={member}
          onChange={(e) => { setMemberHash(e.target.value); setShown(PAGE); }}
          className={`${field} min-w-0 sm:w-[220px] sm:shrink-0`}
        >
          <option value="">সব সংসদ সদস্য</option>
          {members.map((m) => <option key={m.slug} value={m.slug}>{m.name} ({bn(m.count)})</option>)}
        </select>
        <select
          aria-label="সংবাদমাধ্যম"
          value={outlet}
          onChange={(e) => { setOutlet(e.target.value); setShown(PAGE); }}
          className={`${field} min-w-0 sm:w-[200px] sm:shrink-0`}
        >
          <option value="">সব সংবাদমাধ্যম</option>
          {outlets.map((o) => <option key={o.name} value={o.name}>{o.name} ({bn(o.count)})</option>)}
        </select>
      </div>

      <p className="text-[14px] text-muted flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
        <span>{bn(filtered.length)}টি খবর</span>
        {filtering && (
          <button
            type="button"
            onClick={() => { setMemberHash(''); setOutlet(''); setQ(''); setShown(PAGE); }}
            className="font-semibold text-brand hover:underline"
          >
            সব খবর দেখুন
          </button>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">এই খোঁজে কোনো খবর পাওয়া যায়নি।</p>
      ) : (
        days.map((d) => (
          <section key={d.date} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-2.5 text-[15px] font-bold text-ink">
              {d.label}
              <span className="text-[13px] font-medium text-muted">{bn(perDay.get(d.date) ?? d.items.length)}টি খবর</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {d.items.map((s) => <li key={s.id}><StoryCard s={s} showDate={false} /></li>)}
            </ul>
          </section>
        ))
      )}

      {filtered.length > visible.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="self-center px-6 h-12 rounded-full border border-ink font-semibold text-[15px] hover:bg-surface"
        >
          আরও দেখুন
        </button>
      )}
    </div>
  );
}
