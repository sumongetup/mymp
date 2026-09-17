'use client';

import { useState } from 'react';

/**
 * The outlet's own picture, or nothing when it will not load.
 *
 * Outlets move and delete their images: barta24's picture for a 17 September
 * story was already a 404 the same day, and the card showed the browser's
 * broken-image mark. The placeholder underneath it is what a story without a
 * picture shows, so a dead link now looks like no picture at all.
 */
export default function StoryThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
