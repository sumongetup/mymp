/**
 * robots.txt, read the way the major crawlers read it (RFC 9309):
 * - the group whose user-agent token matches ours wins; otherwise `*`;
 * - within the group the longest matching rule wins, and Allow wins a tie;
 * - `*` matches any run of characters and `$` anchors the end;
 * - no robots.txt (a 4xx) allows everything; a 5xx or network failure
 *   allows nothing, so an unreachable server is never crawled "by default".
 */
export interface RobotsRule {
  allow: boolean;
  pattern: string;
}
export interface Robots {
  groups: { agents: string[]; rules: RobotsRule[] }[];
  /** Sitemap: lines, which apply to the whole file regardless of group. */
  sitemaps: string[];
}

export function parseRobots(text: string): Robots {
  const groups: Robots['groups'] = [];
  const sitemaps: string[] = [];
  let current: Robots['groups'][number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === 'sitemap') {
      if (value) sitemaps.push(value);
      continue;
    }
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      // An empty Disallow means "allow everything"; it adds no rule.
      if (key === 'disallow' && value === '') continue;
      current.rules.push({ allow: key === 'allow', pattern: value });
    }
  }
  return { groups, sitemaps };
}

function ruleMatches(pattern: string, path: string): number {
  // Returns the matched length (pattern specificity) or -1.
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(`^${body.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anchored ? '$' : ''}`);
  return re.test(path) ? body.length : -1;
}

/** Whether `userAgent` may fetch `path` (path plus query, e.g. "/feed?x=1"). */
export function robotsAllows(robots: Robots | null, userAgent: string, path: string): boolean {
  if (!robots) return true;
  const token = userAgent.toLowerCase().split(/[\s/]/)[0]!;
  const own = robots.groups.filter((g) => g.agents.some((a) => a !== '*' && token.startsWith(a)));
  const group = own.length ? own : robots.groups.filter((g) => g.agents.includes('*'));
  const rules = group.flatMap((g) => g.rules);
  let best: { len: number; allow: boolean } | null = null;
  for (const r of rules) {
    const len = ruleMatches(r.pattern, path);
    if (len < 0) continue;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}
