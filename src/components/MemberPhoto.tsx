'use client';

import { useState } from 'react';

/**
 * Portraits are served from parliament.gov.bd, a host we do not control, so every
 * one of them can fail. Falling back to the initial keeps the layout intact
 * instead of leaving a broken image on a person's profile.
 */
export default function MemberPhoto({
  src,
  alt,
  initial,
  size = 56,
  className = '',
  sizeClass,
}: {
  src: string | null;
  alt: string;
  initial: string;
  size?: number;
  className?: string;
  /** Responsive size classes (e.g. "w-20 h-20 sm:w-[120px] sm:h-[120px]"); `size` then only sets the image's own dimensions. */
  sizeClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = sizeClass ? {} : { width: size, height: size };
  const cls = `${sizeClass ?? ''} ${className}`.trim();

  if (!src || failed) {
    return (
      <span
        style={{ ...style, fontSize: Math.round(size * 0.38) }}
        aria-hidden="true"
        className={`display shrink-0 rounded-full bg-brandsoft text-brand font-bold grid place-items-center ${cls}`}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={style}
      className={`shrink-0 rounded-full object-cover bg-sunk ${cls}`}
    />
  );
}
