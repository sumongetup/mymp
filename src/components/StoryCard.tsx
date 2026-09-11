import Link from 'next/link';
import PartyBadge from './PartyBadge';
import type { StoryView } from '@/lib/newsView';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/**
 * One news story: the lead headline linking to its outlet, the other outlets
 * that ran the same story as small links, and the member it is about. Reads
 * no site data, so the news page's client-side filter renders it too.
 */
export default function StoryCard({ s, showMember = true, showDate = true }: { s: StoryView; showMember?: boolean; showDate?: boolean }) {
  return (
    <article className="reveal bg-surface border border-rule rounded-card shadow-card p-5 flex flex-col gap-3 hover:border-brandring transition-colors">
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="font-semibold text-inksoft">{s.lead.source}</span>
        {showDate && <span className="shrink-0">{s.dateLabel}</span>}
      </div>
      <a
        href={s.lead.url}
        target="_blank"
        rel="noopener noreferrer"
        className="display text-[17.5px] leading-snug hover:text-brand transition-colors"
      >
        {s.lead.title}
      </a>
      {s.also.length > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t border-rulesoft">
          <span className="text-[13px] text-muted">একই খবর আরও {bn(s.also.length)}টি সংবাদমাধ্যমে</span>
          <div className="flex flex-wrap gap-1.5">
            {s.also.map((a) => (
              <a
                key={a.url}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                title={a.title}
                className="px-2.5 py-1 rounded-full border border-rule bg-paper text-[13px] font-medium text-inksoft hover:border-brand hover:text-brand transition-colors"
              >
                {a.source}
              </a>
            ))}
          </div>
        </div>
      )}
      {showMember && s.member && (
        <Link href={`/mp/${s.member.slug}`} className="self-start flex items-center gap-2 text-[13.5px] font-semibold text-brand hover:underline">
          <PartyBadge abbr={s.member.party} color={s.member.color} />
          {s.member.name}
        </Link>
      )}
    </article>
  );
}
