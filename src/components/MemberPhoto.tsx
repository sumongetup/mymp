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
}: {
  src: string | null;
  alt: string;
  initial: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (!src || failed) {
    return (
      <span
        style={{ ...style, fontSize: Math.round(size * 0.38) }}
        aria-hidden="true"
        className={`serif shrink-0 rounded-full bg-brandsoft text-brand font-bold grid place-items-center ${className}`}
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
      className={`shrink-0 rounded-full object-cover bg-sunk ${className}`}
    />
  );
}
