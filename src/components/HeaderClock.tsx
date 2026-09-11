'use client';

import { useSyncExternalStore } from 'react';

/*
 * Today's date and time in Bangladesh, in English, as the owner asked
 * (2026-09-11): "Friday, 11 September 2026, 5:43 PM". The site is
 * prerendered, so the server renders nothing here and the browser fills it in,
 * then keeps it current.
 */
const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit', hour12: true });

const subscribe = (tick: () => void) => {
  const id = window.setInterval(tick, 10_000);
  return () => window.clearInterval(id);
};
// The same string for every call within a minute, so React re-renders only when the minute changes.
const now = () => {
  const d = new Date();
  return `${DATE.format(d).replace(/^(\w+) /, '$1, ')}, ${TIME.format(d)}`;
};

export default function HeaderClock() {
  const text = useSyncExternalStore(subscribe, now, () => '');
  return (
    <span className="tnum" aria-label={text ? `Today in Bangladesh: ${text}` : undefined}>
      {text}
    </span>
  );
}
