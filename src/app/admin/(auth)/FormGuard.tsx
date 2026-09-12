'use client';

import { useEffect } from 'react';

/**
 * Two things every admin form needs, done once for the whole admin:
 *
 *  - an unsaved-changes guard: once a field is edited, leaving the page
 *    (closing the tab, typing another address, pressing back) asks first;
 *    submitting a form clears the guard;
 *  - Bangla validation messages: the browser's own "please fill out this
 *    field" comes in the browser's language, so `required`, `url`, `date`
 *    and length rules get a Bangla message instead.
 */
export default function FormGuard() {
  useEffect(() => {
    let dirty = false;
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('form') && !(t as HTMLInputElement).readOnly) dirty = true;
    };
    const onSubmit = () => { dirty = false; };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onInvalid = (e: Event) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const v = el.validity;
      let msg = '';
      if (v.valueMissing) msg = 'এই ঘরটি পূরণ করুন।';
      else if (v.typeMismatch && el.getAttribute('type') === 'url') msg = 'পুরো ঠিকানা দিন, https:// দিয়ে শুরু।';
      else if (v.typeMismatch && el.getAttribute('type') === 'email') msg = 'একটি ইমেইল ঠিকানা দিন।';
      else if (v.tooShort) msg = `কমপক্ষে ${el.getAttribute('minlength')} অক্ষর লিখুন।`;
      else if (v.tooLong) msg = `সর্বোচ্চ ${el.getAttribute('maxlength')} অক্ষর।`;
      else if (v.badInput || v.rangeUnderflow || v.rangeOverflow) msg = 'এই মান গ্রহণ করা হয়নি।';
      else if (v.patternMismatch) msg = 'যে আকারে লিখতে বলা হয়েছে সেভাবে লিখুন।';
      if (msg) el.setCustomValidity(msg);
    };
    // A fresh check on every keystroke, so a corrected field stops complaining.
    const onClear = (e: Event) => { (e.target as HTMLInputElement).setCustomValidity?.(''); };
    document.addEventListener('input', onInput, true);
    document.addEventListener('input', onClear, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('invalid', onInvalid, true);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('input', onClear, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('invalid', onInvalid, true);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);
  return null;
}
