import { bn, bnGroup, partyColor } from '@/lib/data';
import { parliamentLabel, type SeatResult } from '@/lib/history';
import { Card, DocLink } from './ui';

/**
 * One election's result for one seat: every candidate, votes and share,
 * with the gazette it was read from. Rendered only from published rows.
 */
export function ResultCard({ r, compact = false }: { r: SeatResult; compact?: boolean }) {
  const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
  const cast = r.totalVotes ?? sorted.reduce((n, c) => n + c.votes, 0);
  const top = sorted[0]?.votes ?? 1;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-rulesoft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="display text-[17px]">{parliamentLabel(r.parliamentNo)}</span>
        <span className="text-[13px] text-muted tnum">
          {cast ? `${bnGroup(cast)} ভোট` : ''}{r.turnout != null ? ` · ভোট পড়েছে ${bn(r.turnout)}%` : ''}
        </span>
      </div>
      <ol className="divide-y divide-rulesoft">
        {(compact ? sorted.slice(0, 3) : sorted).map((c, i) => {
          const share = cast ? (c.votes / cast) * 100 : 0;
          return (
            <li key={`${c.name}-${i}`} className="px-5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <span className="grow min-w-0 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: partyColor(c.party) }}
                  />
                  <span className={`truncate ${i === 0 ? 'font-bold' : 'font-medium'}`}>{c.name}</span>
                  {c.party && <span className="text-[12.5px] text-muted shrink-0">{c.party}</span>}
                  {i === 0 && <span className="shrink-0 px-2 py-0.5 rounded-full bg-brandsoft text-brand text-[11px] font-bold">বিজয়ী</span>}
                </span>
                <span className="tnum text-[14px] font-semibold shrink-0">{bnGroup(c.votes)}</span>
                <span className="tnum text-[12.5px] text-muted w-12 text-end shrink-0">{bn(share.toFixed(1))}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-sunk overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(c.votes / top) * 100}%`, background: partyColor(c.party) }} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="px-5 py-3 bg-paper/60 border-t border-rulesoft flex items-center justify-between gap-3 text-[12.5px] text-muted">
        <span>উৎস: নির্বাচন কমিশনের গেজেট{r.sourceNote ? ` · ${r.sourceNote}` : ''}</span>
        <DocLink href={r.sourceUrl}>গেজেট</DocLink>
      </div>
    </Card>
  );
}
