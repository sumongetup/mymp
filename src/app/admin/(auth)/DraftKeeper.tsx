'use client';

import { useEffect } from 'react';

/**
 * Keeps what was typed into a form when the server sends the page back with an
 * error. The form's named fields are copied to sessionStorage as it is
 * submitted; when the page comes back with `restore`, they are put back, so a
 * typo in one vote count does not cost twelve lines of candidates.
 */
export default function DraftKeeper({ formId, fields, restore }: { formId: string; fields: string[]; restore: boolean }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const key = `draft:${location.pathname}:${formId}`;
    const read = () => {
      try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') as Record<string, string> | null; } catch { return null; }
    };
    if (restore) {
      const saved = read();
      for (const name of fields) {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (el && saved && typeof saved[name] === 'string') el.value = saved[name];
      }
    } else {
      try { sessionStorage.removeItem(key); } catch { /* storage may be unavailable */ }
    }
    const onSubmit = () => {
      const values: Record<string, string> = {};
      for (const name of fields) {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (el) values[name] = el.value;
      }
      try { sessionStorage.setItem(key, JSON.stringify(values)); } catch { /* storage may be unavailable */ }
    };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [formId, fields, restore]);
  return null;
}
