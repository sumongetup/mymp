'use client';

import { useState, useSyncExternalStore } from 'react';
import Icon from './Icon';
import BrandIcon, { type Brand } from './BrandIcon';

/** Whether the browser has a share sheet; false while rendering on the server. */
const noSubscribe = () => () => {};
const useCanShare = () =>
  useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === 'function',
    () => false,
  );

/**
 * Share this page: the phone's own share sheet where the browser has one
 * (WhatsApp, Messenger, Facebook and the rest live there), plain share links
 * for Facebook, WhatsApp and X, and copy link. No third-party script is
 * loaded; each network's own share address does the work, and what the post
 * shows comes from the page's share tags (photo, name, seat).
 */
export default function ShareButtons({ url, title, text }: { url: string; title: string; text: string }) {
  const canShare = useCanShare();
  const [copied, setCopied] = useState(false);

  const u = encodeURIComponent(url);
  const links: { key: Brand; label: string; href: string }[] = [
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${u}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: a hidden field and the copy command.
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'absolute';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const button =
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rule bg-surface text-[13px] font-semibold hover:border-brand hover:text-brand transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="এই পাতা শেয়ার করুন">
      <span className="text-[12.5px] font-semibold text-muted me-0.5">শেয়ার করুন</span>
      {canShare && (
        <button
          type="button"
          onClick={() => navigator.share({ title, text, url }).catch(() => {})}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-branddark transition-colors"
        >
          <Icon name="share" size={14} />
          শেয়ার
        </button>
      )}
      {links.map((l) => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" className={button} aria-label={`${l.label}-এ শেয়ার করুন`}>
          <BrandIcon name={l.key} size={15} />
          {l.label}
        </a>
      ))}
      <button type="button" onClick={copy} className={button} aria-live="polite">
        <Icon name={copied ? 'check' : 'link'} size={14} />
        {copied ? 'লিংক কপি হয়েছে' : 'লিংক কপি'}
      </button>
    </div>
  );
}
