'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildIndex, search, type Entry, type IndexRow } from '@/lib/search';

const TYPE_LABEL: Record<string, string> = {
  seat: 'আসন',
  member: 'সংসদ সদস্য',
  party: 'দল',
  district: 'জেলা',
  division: 'বিভাগ',
};

/** The index is fetched once per visit and shared by every search box on the page. */
let cached: Promise<Entry[]> | null = null;
function loadIndex(): Promise<Entry[]> {
  if (!cached) {
    cached = fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: IndexRow[]) => buildIndex(rows))
      .catch(() => []);
  }
  return cached;
}

export default function SiteSearch({
  compact = false,
  autoFocus = false,
  placeholder = 'আসন, জেলা, এমপি বা দলের নাম লিখুন',
}: {
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadIndex().then((idx) => alive && setIndex(idx));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const hits = useMemo(() => (index && q.trim() ? search(index, q, 8) : []), [index, q]);

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    setQ('');
    router.push(entry.url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  const showResults = open && q.trim().length > 0;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">খুঁজুন</label>
      <div
        className={
          compact
            ? 'flex items-center gap-2 h-10 w-[128px] sm:w-[260px] px-3 rounded-[10px] border border-rule bg-paper'
            : 'flex items-center gap-3 h-14 sm:h-[62px] px-4 sm:px-5 rounded-[14px] border-[1.5px] border-ink bg-surface'
        }
      >
        <svg width={compact ? 16 : 20} height={compact ? 16 : 20} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-muted shrink-0" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id={`${listId}-input`}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={compact ? 'খুঁজুন…' : placeholder}
          className={`grow min-w-0 w-full bg-transparent outline-none placeholder:text-muted ${compact ? 'text-[14px]' : 'text-[16px] sm:text-[18px]'}`}
        />
      </div>

      {showResults && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 end-0 w-full min-w-[300px] max-h-[380px] overflow-y-auto rounded-xl border border-rule bg-surface shadow-lg py-1"
        >
          {hits.length === 0 && (
            <li className="px-4 py-3 text-[14px] text-muted">
              {index === null ? 'খোঁজা হচ্ছে…' : 'কিছু পাওয়া যায়নি। বাংলা বা ইংরেজি, দুইভাবেই লেখা যায়।'}
            </li>
          )}
          {hits.map((h, i) => (
            <li key={h.url} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`w-full text-start px-4 py-2.5 flex items-baseline gap-3 ${i === active ? 'bg-brandsoft' : ''}`}
              >
                <span className="grow min-w-0">
                  <span className="display block text-[15px] font-bold truncate">{h.bn || h.en}</span>
                  {h.sub && <span className="block text-[12.5px] text-muted truncate">{h.sub}</span>}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-muted">{TYPE_LABEL[h.type] ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
