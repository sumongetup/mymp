import { describe, expect, it } from 'vitest';
import { canonicalUrl, usableTitle } from './news';
import { feedLinksFromHtml, parseNewsSitemap } from './sources-inspect';

describe('news intake helpers', () => {
  it('keeps one URL per story', () => {
    expect(canonicalUrl('https://WWW.Example.com/a/b?utm_source=fb&id=7&fbclid=x#top')).toBe('https://www.example.com/a/b?id=7');
    expect(canonicalUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalUrl('not a url')).toBeNull();
  });

  it('drops headlines a reader could not understand', () => {
    expect(usableTitle('Caption')).toBe(false);
    expect(usableTitle('JS-17 PM-GAS-POWER-TWO-LAST-DHAKA')).toBe(false);
    expect(usableTitle('ছবি')).toBe(false);
    expect(usableTitle('সংসদের তৃতীয় অধিবেশনের সমাপ্তি, ৬ বিল পাস')).toBe(true);
    expect(usableTitle('PM not joining BRICS Summit: Kobir')).toBe(true);
  });

  it('reads a Google News sitemap', () => {
    const xml = `<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
      <url><loc>https://x.test/a?x=1&amp;y=2</loc><news:news><news:publication_date>2026-09-10T12:00:00+06:00</news:publication_date><news:title><![CDATA[শিরোনাম এক & দুই]]></news:title></news:news></url>
      <url><loc>https://x.test/b</loc><news:news><news:title>No date here</news:title></news:news></url>
      <url><loc>https://x.test/c</loc></url>
    </urlset>`;
    expect(parseNewsSitemap(xml)).toEqual([
      { url: 'https://x.test/a?x=1&y=2', title: 'শিরোনাম এক & দুই', publishedAt: '2026-09-10T06:00:00.000Z' },
      { url: 'https://x.test/b', title: 'No date here', publishedAt: null },
    ]);
  });

  it('finds feed links in a homepage', () => {
    const html = `<head><link rel="alternate" type="application/rss+xml" href="/feed/"><link rel="stylesheet" href="/a.css">
      <link type='application/atom+xml' rel='alternate' href='https://cdn.test/atom.xml?a=1&amp;b=2'></head>`;
    expect(feedLinksFromHtml(html, 'https://site.test/news/')).toEqual(['https://site.test/feed/', 'https://cdn.test/atom.xml?a=1&b=2']);
  });
});
