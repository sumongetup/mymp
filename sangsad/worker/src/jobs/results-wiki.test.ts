import { describe, expect, it } from 'vitest';
import { parse2026, plain, sameName, splitParams } from './results-wiki';

const box = (title: string, rows: string) => `{{Election box begin|title=${title}}}\n${rows}\n{{Election box turnout|votes=100|percentage=61.5|change=}}\n{{Election box end}}`;

describe('Wikipedia results parsing', () => {
  it('splits template params without breaking links', () => {
    expect(splitParams('a=[[X|Y]]|b={{t|1}}|c')).toEqual(['a=[[X|Y]]', 'b={{t|1}}', 'c']);
    expect(plain("[[Bangladesh Nationalist Party|BNP]]<ref>x</ref> '''bold'''")).toBe('BNP bold');
  });

  it('takes the 2026 general-election box and skips a by-election box', () => {
    const wikitext = [
      box('TEST_Seat-1 by-election, 2026', '{{Election box candidate with party link|party=A|candidate=TBD|votes=0.00|percentage=0}}\n{{Election box candidate with party link|party=B|candidate=Z|votes=0|percentage=0}}'),
      box('[[2026 Bangladeshi general election|General election 2026]]: TEST_Seat-1', [
        '{{Election box candidate with party link|party=[[Bangladesh Jamaat-e-Islami]]|candidate=TEST_Second|votes=45,210|percentage=40.1}}',
        '{{Election box winning candidate with party link|party=Bangladesh Nationalist Party|candidate=[[TEST_Winner|TEST Winner]]|votes=67,890|percentage=59.9}}',
      ].join('\n')),
    ].join('\n\n');
    const r = parse2026(wikitext);
    expect(r).toEqual({
      title: 'General election 2026: TEST_Seat-1',
      turnout: 61.5,
      candidates: [
        { name: 'TEST Winner', party: 'Bangladesh Nationalist Party', votes: 67890 },
        { name: 'TEST_Second', party: 'Bangladesh Jamaat-e-Islami', votes: 45210 },
      ],
    });
  });

  it('reads Bangla digits and titles, and ignores a box without real votes', () => {
    const bn = box('[[ত্রয়োদশ জাতীয় সংসদ নির্বাচন|সাধারণ নির্বাচন ২০২৬]]: TEST_আসন-১', [
      '{{Election box candidate with party link|party=বাংলাদেশ জাতীয়তাবাদী দল|candidate=TEST_প্রার্থী ক|votes=১,২৩,৪৫৬|percentage=৫৫.২}}',
      '{{Election box candidate with party link|party=স্বতন্ত্র|candidate=TEST_প্রার্থী খ|votes=৯৮,৭৬৫|percentage=৪৪.৮}}',
    ].join('\n'));
    expect(parse2026(bn)?.candidates.map((c) => c.votes)).toEqual([123456, 98765]);
    expect(parse2026(box('General election 2026: TEST', '{{Election box candidate|party=A|candidate=X|votes=|percentage=}}'))).toBeNull();
    expect(parse2026(box('General election 2018: TEST', '{{Election box candidate|party=A|candidate=X|votes=10}}\n{{Election box candidate|party=B|candidate=Y|votes=9}}'))).toBeNull();
  });

  it('recognises the same person across spellings, and not a different one', () => {
    expect(sameName('মো.মোস্তাফিজুর রহমান', 'মোঃ মোস্তাফিজুর রহমান', null)).toBe(true);
    expect(sameName('মজিবুর রহমান সারওয়ার', 'মোঃ মজিবর রহমান সরওয়ার', null)).toBe(true);
    expect(sameName('Shahjahan Chowdhury', 'শাহজাহান চৌধুরী', 'Shahjahan Chowdhury')).toBe(true);
    expect(sameName('শরীফ আহমেদ', 'মুহাম্মদুল্লাহ', 'MOHAMMAD ULLAH')).toBe(false);
    expect(sameName('Tarique Rahman', 'মোঃ রেজাউল করিম বাদশা', 'Md Rezaul Karim Badsha')).toBe(false);
  });
});
