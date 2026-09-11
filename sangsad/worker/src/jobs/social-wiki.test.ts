import { describe, expect, it } from 'vitest';
import { linksIn, memberLinks, officialSiteInHtml, profileUrl } from './social-wiki';

describe('social links from Wikipedia', () => {
  it('keeps profiles and refuses posts, groups and shares', () => {
    expect(profileUrl('facebook', 'http://m.facebook.com/TEST.Page/')).toBe('https://www.facebook.com/TEST.Page');
    expect(profileUrl('facebook', 'https://www.facebook.com/profile.php?id=1000123')).toBe('https://www.facebook.com/profile.php?id=1000123');
    expect(profileUrl('facebook', 'https://www.facebook.com/groups/123')).toBeNull();
    expect(profileUrl('facebook', 'https://www.facebook.com/TEST/posts/99')).toBeNull();
    expect(profileUrl('facebook', 'https://example.com/TEST')).toBeNull();
    expect(profileUrl('x', 'https://twitter.com/TEST_handle')).toBe('https://x.com/TEST_handle');
    expect(profileUrl('x', 'https://x.com/TEST/status/1')).toBeNull();
    expect(profileUrl('youtube', 'https://www.youtube.com/@TEST')).toBe('https://www.youtube.com/@TEST');
    expect(profileUrl('youtube', 'https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(profileUrl('instagram', 'instagram.com/TEST/')).toBe('https://www.instagram.com/TEST');
    expect(profileUrl('website', 'http://test-mp.example.bd/')).toBe('https://test-mp.example.bd');
    expect(profileUrl('website', 'https://bn.wikipedia.org/wiki/TEST')).toBeNull();
  });

  it('reads the infobox website and the external-link templates', () => {
    const wikitext = [
      '{{Infobox officeholder',
      '| name = TEST Member',
      '| website = {{URL|test-member.example.bd}}',
      '}}',
      '== External links ==',
      '* {{Facebook|TEST.Member}}',
      '* {{Twitter|TEST_Member}}',
      '* {{YouTube|channel=UCaaaaaaaaaaaaaaaaaaaaaa}}',
      '* {{Official website}}',
    ].join('\n');
    const { links, fromWikidata } = linksIn(wikitext);
    expect(links).toEqual({
      website: 'https://test-member.example.bd',
      facebook: 'https://www.facebook.com/TEST.Member',
      x: 'https://x.com/TEST_Member',
      youtube: 'https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(fromWikidata).toEqual(['website']);
    expect(linksIn('{{তথ্যছক ব্যক্তি\n| ওয়েবসাইট = https://test.example.org\n}}\n{{ফেসবুক|TEST.bn}}').links).toEqual({
      website: 'https://test.example.org',
      facebook: 'https://www.facebook.com/TEST.bn',
    });
  });

  it('reads an official website the article renders from Wikidata', () => {
    expect(officialSiteInHtml('<span class="official-website"><span class="url"><a rel="nofollow" class="external text" href="https://test.example.bd/">Official website</a>')).toBe(
      'https://test.example.bd',
    );
  });

  it('finds the member article a constituency page names', () => {
    const wikitext = [
      '{{Infobox constituency',
      '| members = [[TEST Current Member]]',
      '}}',
      '{{Election box begin | title=[[2026 Bangladeshi general election|General Election 2026]]: TEST-1}}',
      '{{Election box winning candidate with party link| |party = A |candidate = [[TEST Winner Article|TEST Winner]] |votes = 10 }}',
      '{{Election box candidate with party link| |party = B |candidate = [[TEST Runner]] |votes = 5 }}',
      '{{Election box end}}',
    ].join('\n');
    expect(memberLinks(wikitext)).toEqual([
      { target: 'TEST Current Member', label: 'TEST Current Member' },
      { target: 'TEST Winner Article', label: 'TEST Winner' },
    ]);
  });
});
