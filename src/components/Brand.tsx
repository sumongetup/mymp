import Link from 'next/link';

/**
 * The mark: a dome over a plinth inside a rounded square, a nod to the
 * geometry of the Jatiya Sangsad Bhaban without copying any emblem.
 */
export function Mark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path d="M9 17.5a7 7 0 0 1 14 0v.5H9z" fill="#fff" />
      <rect x="8" y="20" width="16" height="2.4" rx="1.2" fill="#fff" />
      <rect x="10.5" y="24" width="11" height="2" rx="1" fill="#fff" opacity=".65" />
      <circle cx="16" cy="8.6" r="1.6" fill="#fff" />
    </svg>
  );
}

export default function Brand({ tone = 'dark', href = '/' }: { tone?: 'dark' | 'light'; href?: string }) {
  const name = tone === 'light' ? 'text-white' : 'text-brand';
  const sub = tone === 'light' ? 'text-white/55' : 'text-muted';
  return (
    <Link href={href} className="flex items-center gap-2.5 shrink-0" aria-label="আমার এমপি, হোম">
      <Mark size={32} />
      <span className="flex flex-col leading-none gap-[3px]">
        <span className={`display text-[19px] sm:text-[21px] ${name}`}>আমার এমপি</span>
        <span className={`hidden sm:block text-[9.5px] font-bold tracking-[2.2px] ${sub}`}>MY MP · BANGLADESH</span>
      </span>
    </Link>
  );
}
