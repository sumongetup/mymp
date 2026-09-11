'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGED = 'mymp:query';

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/**
 * A filter's value kept in the page address (`?party=BNP`), so a filtered
 * list can be shared and survives back and forward. Pages are prerendered,
 * so the server renders the unfiltered list and the browser applies the
 * address once it is hydrated. `legacy` reads an older hash form of the same
 * state, so links written before the move to query strings still work.
 */
export function useQueryParam(name: string, legacy?: (hash: string) => string | null): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name) ?? legacy?.(window.location.hash) ?? '',
    () => '',
  );
  const set = useCallback(
    (v: string) => {
      const u = new URL(window.location.href);
      if (v) u.searchParams.set(name, v);
      else u.searchParams.delete(name);
      // The old hash form is superseded by the query string.
      if (legacy && legacy(u.hash) !== null) u.hash = '';
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
      window.dispatchEvent(new Event(CHANGED));
    },
    [name, legacy],
  );
  return [value, set];
}
