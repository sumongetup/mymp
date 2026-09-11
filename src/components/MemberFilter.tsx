'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { normalise } from '@/lib/search';
import { RESERVED_HASH } from '@/lib/nav';
import { useQueryParam } from '@/lib/useQueryParam';
import MemberPhoto from './MemberPhoto';

export interface FilterMember {
  id: string;
  slug: string;
  nameBn: string | null;
  nameEn: string | null;
  photoUrl: string | null;
  party: string | null;
  partyBn: string | null;
  seatBn: string | null;
  seatNo: number | null;
  reserved: boolean;
  gender: string | null;
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const PARTY_COLOR: Record<string, string> = {
  BNP: 'var(--color-pbnp)',
  BJEI: 'var(--color-pjamaat)',
  Ind: 'var(--color-pind)',
  NCP: 'var(--color-pncp)',
};

const initialOf = (m: FilterMember) => {
  const name = (m.nameBn || m.nameEn || '?').trim();
  return (name.replace(/^(মোঃ|মো\.|ব্যারিস্টার|ড\.|অ্যাডভোকেট)\s*/, '') || name).charAt(0);
};

type SeatKind = 'all' | 'territorial' | 'reserved';

/** The home page once linked the reserved-seat filter as a hash; those links still work. */
const legacyKind = (hash: string) => (hash === RESERVED_HASH ? 'reserved' : null);

export default function MemberFilter({
  members,
  parties,
}: {
  members: FilterMember[];
  parties: { abbr: string; label: string; seats: number }[];
}) {
  // Every filter lives in the address, so a filtered list can be shared and comes back on back/forward.
  const [q, setQ] = useQueryParam('q');
  const [partyParam, setPartyParam] = useQueryParam('party');
  const party = partyParam || null;
  const setParty = (p: string | null) => setPartyParam(p ?? '');
  const [kindParam, setKindParam] = useQueryParam('kind', legacyKind);
  const kind: SeatKind = kindParam === 'territorial' || kindParam === 'reserved' ? kindParam : 'all';
  const setKind = (k: SeatKind) => setKindParam(k === 'all' ? '' : k);
  const [shown, setShown] = useState(60);

  // Match keys are built once for the whole list, then reused on every keystroke.
  const keyed = useMemo(
    () => members.map((m) => ({
      m,
      key: [normalise(m.nameBn ?? ''), normalise(m.nameEn ?? ''), normalise(m.seatBn ?? '')].join(' '),
    })),
    [members],
  );

  const results = useMemo(() => {
    const nq = normalise(q);
    const words = nq.split(' ').filter(Boolean);
    return keyed
      .filter(({ m, key }) => {
        if (party && m.party !== party) return false;
        if (kind === 'territorial' && m.reserved) return false;
        if (kind === 'reserved' && !m.reserved) return false;
        if (!words.length) return true;
        return words.every((w) => key.includes(w));
      })
      .map((x) => x.m);
  }, [keyed, q, party, kind]);

  const visible = results.slice(0, shown);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-[10px] border border-rule bg-surface lg:w-[300px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(60); }}
            type="search"
            placeholder="নাম বা আসন, বাংলা বা ইংরেজি"
            aria-label="সদস্য খুঁজুন"
            className="grow bg-transparent outline-none text-[14px] placeholder:text-muted"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {([['all', 'সব'], ['territorial', 'আসনভিত্তিক'], ['reserved', 'সংরক্ষিত']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setKind(k); setShown(60); }}
              aria-pressed={kind === k}
              className={`px-3.5 h-11 rounded-full text-[14px] font-medium border ${
                kind === k ? 'bg-brand text-white border-brand' : 'bg-surface border-rule'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* One row that scrolls sideways on a phone, rather than three rows of party names. */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap lg:ms-auto">
          <button
            type="button"
            onClick={() => { setParty(null); setShown(60); }}
            aria-pressed={party === null}
            className={`shrink-0 px-3.5 h-11 rounded-full text-[14px] font-medium border ${
              party === null ? 'bg-brand text-white border-brand' : 'bg-surface border-rule'
            }`}
          >
            সব দল
          </button>
          {parties.slice(0, 4).map((p) => (
            <button
              key={p.abbr}
              type="button"
              onClick={() => { setParty(p.abbr); setShown(60); }}
              aria-pressed={party === p.abbr}
              className={`shrink-0 px-3.5 h-11 rounded-full text-[14px] font-medium border flex items-center gap-2 ${
                party === p.abbr ? 'bg-brand text-white border-brand' : 'bg-surface border-rule'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: party === p.abbr ? '#fff' : (PARTY_COLOR[p.abbr] ?? 'var(--color-pother)') }}
              />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[14px] text-muted tnum" aria-live="polite">
        {bn(results.length)} জন সদস্য
        {results.length > visible.length ? `, ${bn(visible.length)} জন দেখানো হচ্ছে` : ''}
      </p>

      {results.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">
          কিছু পাওয়া যায়নি। নাম বাংলা বা ইংরেজি দুইভাবেই লেখা যায়।
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((m) => (
            <li key={m.id}>
              <Link
                href={`/mp/${m.slug}`}
                className="bg-surface border border-rule rounded-xl px-4 py-3 flex items-center gap-3.5 hover:border-brand transition-colors"
              >
                <MemberPhoto src={m.photoUrl} alt="" initial={initialOf(m)} size={44} />
                <span className="grow min-w-0 flex flex-col gap-0.5">
                  <span className="display text-[15.5px] font-bold truncate">{m.nameBn || m.nameEn}</span>
                  <span className="text-[13px] text-muted truncate">
                    {[m.seatBn, m.partyBn ?? m.party].filter(Boolean).join(', ')}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: PARTY_COLOR[m.party ?? ''] ?? 'var(--color-pother)' }}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results.length > visible.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + 90)}
          className="self-center px-6 h-12 rounded-full border border-ink font-semibold text-[15px] hover:bg-surface"
        >
          আরও দেখুন
        </button>
      )}
    </div>
  );
}
