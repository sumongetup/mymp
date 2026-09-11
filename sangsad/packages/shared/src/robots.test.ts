import { describe, expect, it } from 'vitest';
import { parseRobots, robotsAllows, robotsCrawlDelay } from './robots';

const UA = 'MyMPBot/1.0 (+https://mymp.bd/somporke)';

describe('robots.txt', () => {
  it('uses the * group and the longest matching rule', () => {
    const r = parseRobots(['User-agent: *', 'Disallow: /admin', 'Disallow: /feed/private', 'Allow: /feed', ''].join('\n'));
    expect(robotsAllows(r, UA, '/feed')).toBe(true);
    expect(robotsAllows(r, UA, '/feed/private/x')).toBe(false);
    expect(robotsAllows(r, UA, '/admin/login')).toBe(false);
    expect(robotsAllows(r, UA, '/news/1')).toBe(true);
  });

  it('prefers a group naming our bot over *', () => {
    const r = parseRobots('User-agent: *\nDisallow:\n\nUser-agent: MyMPBot\nDisallow: /\n');
    expect(robotsAllows(r, UA, '/feed')).toBe(false);
    const other = parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n');
    expect(robotsAllows(other, UA, '/feed')).toBe(true);
  });

  it('handles wildcards, end anchors, ties and grouped agents', () => {
    const r = parseRobots('User-agent: Googlebot\nUser-agent: *\nDisallow: /*.php$\nDisallow: /search\nAllow: /search\n');
    expect(robotsAllows(r, UA, '/index.php')).toBe(false);
    expect(robotsAllows(r, UA, '/index.php?x=1')).toBe(true);
    expect(robotsAllows(r, UA, '/search?q=a')).toBe(true); // Allow wins a tie
  });

  it('collects Sitemap lines from anywhere in the file', () => {
    const r = parseRobots('Sitemap: https://x.test/sitemap.xml\nUser-agent: *\nDisallow: /a\nSitemap: https://x.test/googlenews.xml\n');
    expect(r.sitemaps).toEqual(['https://x.test/sitemap.xml', 'https://x.test/googlenews.xml']);
    expect(robotsAllows(r, UA, '/a/b')).toBe(false);
  });

  it('treats an empty or absent file as allow-all and "Disallow: /" as deny-all', () => {
    expect(robotsAllows(null, UA, '/anything')).toBe(true);
    expect(robotsAllows(parseRobots(''), UA, '/anything')).toBe(true);
    expect(robotsAllows(parseRobots('User-agent: *\nDisallow: /'), UA, '/rss.xml')).toBe(false);
  });

  it('reads Crawl-delay for the group that applies to us', () => {
    const r = parseRobots(['User-agent: *', 'Crawl-delay: 10', 'Disallow: /admin/', '', 'User-agent: OtherBot', 'Crawl-delay: 30'].join('\n'));
    expect(robotsCrawlDelay(r, UA)).toBe(10);
    expect(robotsCrawlDelay(parseRobots('User-agent: *'), UA)).toBeNull();
    expect(robotsCrawlDelay(null, UA)).toBeNull();
  });
});
