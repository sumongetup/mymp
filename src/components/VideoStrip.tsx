import Link from 'next/link';
import type { StoryView } from '@/lib/newsView';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const duration = (s: number | null | undefined) =>
  s ? `${bn(Math.floor(s / 60))}:${bn(String(s % 60).padStart(2, '0'))}` : null;

/**
 * The newest videos, as a row that scrolls sideways on a phone and sits in a
 * grid on a desktop. Each opens on the channel it came from: the site links to
 * a broadcaster's video, it does not host or embed anyone's.
 */
export default function VideoStrip({ videos, moreHref }: { videos: StoryView[]; moreHref: string }) {
  if (!videos.length) return null;
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="display text-[19px] font-bold flex items-baseline gap-2.5">
          ভিডিও
          <span className="text-[13px] font-medium text-muted">{bn(videos.length)}টি সর্বশেষ</span>
        </h2>
        <Link href={moreHref} className="text-[14px] font-semibold text-brand hover:underline shrink-0">সব ভিডিও</Link>
      </div>

      <ul className="flex gap-3.5 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
        {videos.slice(0, 6).map((v) => (
          <li key={v.id} className="w-[230px] shrink-0 sm:w-auto">
            <a
              href={v.lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2.5 h-full"
            >
              <span className="block aspect-video rounded-xl border border-rule bg-paper overflow-hidden relative">
                {v.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : null}
                <span className="absolute inset-0 grid place-items-center bg-ink/25 group-hover:bg-ink/35 transition-colors">
                  <span className="w-11 h-11 rounded-full bg-white/90 grid place-items-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-ink" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
                {duration(v.durationSeconds) && (
                  <span className="absolute bottom-1.5 end-1.5 px-1.5 rounded bg-ink/80 text-white text-[11.5px] tnum">{duration(v.durationSeconds)}</span>
                )}
              </span>
              <span className="font-semibold text-[14.5px] leading-snug line-clamp-2 group-hover:text-brand transition-colors">{v.lead.title}</span>
              <span className="text-[12.5px] text-muted flex flex-wrap items-center gap-x-2">
                <span>{v.lead.source}</span>
                {v.member && <span className="truncate">{v.member.name}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
