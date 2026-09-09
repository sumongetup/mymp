import Link from 'next/link';
import { bn, dateBn, initial, partyColor, getMemberById, type Member, type Party, type NewsPost } from '@/lib/data';
import MemberPhoto from './MemberPhoto';

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1200px] px-5">{children}</div>;
}

export function PageHead({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="pt-9 sm:pt-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="flex flex-col gap-2.5">
        {eyebrow && (
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{eyebrow}</span>
        )}
        <h1 className="serif text-[34px] sm:text-[46px] leading-[1.1] font-extrabold text-balance">
          {title}
        </h1>
        {lede && <p className="text-[16px] sm:text-[17px] text-inksoft max-w-[660px] text-pretty">{lede}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-rule rounded-xl ${className}`}>{children}</div>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-5 flex flex-col gap-1.5">
      <span className="text-[12px] font-bold tracking-[1px] text-muted">{label}</span>
      <span className="serif tnum text-[34px] sm:text-[38px] font-extrabold leading-none">{value}</span>
      {note && <span className="text-[13px] text-muted leading-snug">{note}</span>}
    </Card>
  );
}

export function PartyDot({ abbr }: { abbr: string | null | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ background: partyColor(abbr) }}
    />
  );
}

export function MemberCard({ m }: { m: Member }) {
  return (
    <Link
      href={`/mp/${m.slug}`}
      className="bg-surface border border-rule rounded-xl p-5 flex flex-col gap-3.5 hover:border-brand transition-colors"
    >
      <MemberPhoto src={m.photoUrl} alt="" initial={initial(m)} size={56} />
      <span className="flex flex-col gap-1">
        <span className="serif text-[17px] font-bold leading-snug min-h-[2.6em]">
          {m.nameBn || m.nameEn}
        </span>
        <span className="text-[13.5px] text-muted">
          {m.seat?.nameBn ?? 'আসন নেই'}
        </span>
      </span>
      <span className="flex items-center gap-2 text-[13px] font-semibold text-inksoft mt-auto">
        <PartyDot abbr={m.party?.abbr} />
        {m.party?.nameBn ?? m.party?.abbr ?? '—'}
      </span>
    </Link>
  );
}

export function MemberRow({ m }: { m: Member }) {
  return (
    <Link
      href={`/mp/${m.slug}`}
      className="bg-surface border border-rule rounded-xl px-4 py-3 flex items-center gap-3.5 hover:border-brand transition-colors"
    >
      <MemberPhoto src={m.photoUrl} alt="" initial={initial(m)} size={44} />
      <span className="grow min-w-0 flex flex-col gap-0.5">
        <span className="serif text-[15.5px] font-bold truncate">{m.nameBn || m.nameEn}</span>
        <span className="text-[13px] text-muted truncate">
          {[m.seat?.nameBn, m.party?.abbr].filter(Boolean).join(' · ')}
        </span>
      </span>
      <PartyDot abbr={m.party?.abbr} />
    </Link>
  );
}

/**
 * Seat composition. The caption has to say which of the two counts this is:
 * the constituency result and the seated parliament are different numbers,
 * because the fifty reserved seats are allocated after the general result.
 */
export function CompositionBar({
  parties,
  total,
  majority,
}: {
  parties: Party[];
  total: number;
  majority: number;
}) {
  const top = parties.slice(0, 4);
  const restSeats = parties.slice(4).reduce((n, p) => n + p.seats, 0);
  const rows = [
    ...top.map((p) => ({ label: p.nameBn ?? p.abbr, abbr: p.abbr, seats: p.seats })),
    ...(restSeats
      ? [{ label: `অন্য ${bn(parties.length - 4)} দল`, abbr: 'other', seats: restSeats }]
      : []),
  ];
  const majorityPct = (majority / total) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative pt-5">
        <div
          className="absolute top-3.5 bottom-0 border-l-[1.5px] border-dashed border-ink"
          style={{ left: `${majorityPct}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute top-0 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap"
          style={{ left: `${majorityPct}%` }}
        >
          সংখ্যাগরিষ্ঠতা {bn(majority)}
        </div>
        <div
          className="flex gap-0.5 h-[30px] rounded-md overflow-hidden"
          role="img"
          aria-label={rows.map((r) => `${r.label} ${r.seats}`).join(', ')}
        >
          {rows.map((r) => (
            <div
              key={r.abbr}
              className="flex items-center ps-2.5 text-[13px] font-bold tnum overflow-hidden"
              style={{
                flex: `${r.seats} 1 0`,
                background: partyColor(r.abbr === 'other' ? null : r.abbr),
                color: r.abbr === 'BJEI' ? 'var(--color-ink)' : '#fff',
              }}
            >
              {r.seats / total > 0.06 ? bn(r.seats) : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[14px]">
        {rows.map((r) => (
          <div key={r.abbr} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-[3px] shrink-0"
              style={{ background: partyColor(r.abbr === 'other' ? null : r.abbr) }}
            />
            <span className="grow truncate">{r.label}</span>
            <span className="font-bold tnum">{bn(r.seats)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Headline, masthead, date and a link out. The article body is never reproduced. */
export function NewsCard({ n }: { n: NewsPost }) {
  const member = n.memberId ? getMemberById(n.memberId) : undefined;
  return (
    <a
      href={n.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-surface border border-rule rounded-xl p-5 flex flex-col gap-2 hover:border-brand transition-colors"
    >
      <span className="text-[13px] text-muted">{n.sourceName} · {dateBn(n.publishedOn)}</span>
      <span className="serif text-[17px] font-bold leading-snug">{n.titleBn}</span>
      {n.excerptBn && <span className="text-[14px] text-inksoft leading-relaxed">{n.excerptBn}</span>}
      <span className="flex items-center gap-2 text-[13px] font-semibold text-brand">
        {member ? <><PartyDot abbr={member.party?.abbr} />{member.nameBn ?? member.nameEn}</> : n.seatSlug ? n.seatSlug : 'মূল সংবাদ পড়ুন ↗'}
      </span>
    </a>
  );
}

/** Used wherever a source has no data, so a gap never looks like a zero. */
export function Empty({ title, body }: { title: string; body?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-6 rounded-xl border-[1.5px] border-dashed border-[#d4cfc1] bg-[#fbfaf6]">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0 mt-0.5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
      </svg>
      <div className="flex flex-col gap-1">
        <span className="text-[15.5px] font-semibold">{title}</span>
        {body && <span className="text-[14px] text-muted leading-relaxed">{body}</span>}
      </div>
    </div>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-5 bg-warnsoft border-s-[3px] border-warn rounded-e-lg">
      <span className="block font-semibold text-warn mb-1">{title}</span>
      <span className="block text-[14px] leading-relaxed text-inksoft">{children}</span>
    </div>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="পথ" className="flex flex-wrap gap-2 text-[14px] text-muted pt-7">
      {items.map((it, i) => (
        <span key={it.label} className="flex gap-2">
          {it.href ? <Link href={it.href} className="hover:underline">{it.label}</Link>
            : <span className="text-ink">{it.label}</span>}
          {i < items.length - 1 && <span aria-hidden="true">›</span>}
        </span>
      ))}
    </nav>
  );
}
