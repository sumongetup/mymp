import { describe, expect, it } from 'vitest';
import { bioFrom, birthYear, items, professions, tidy, withManual } from './bio-wiki';

const page = (title: string, box: string) => ({ page: { title, wikitext: `{{Infobox officeholder\n${box}\n}}\nTEST article text.` }, host: title.startsWith('TEST_bn') ? 'bn.wikipedia.org' : 'en.wikipedia.org' });

describe('biography facts from a Wikipedia infobox', () => {
  it('splits list templates, line breaks and wide gaps into items', () => {
    expect(items('{{ubl|[[TEST University]] (MA)|[[TEST College|TEST Coll.]]}}')).toEqual(['TEST University (MA)', 'TEST Coll.']);
    expect(items('[[টেস্ট বিশ্ববিদ্যালয়]] <br/> ও [[টেস্ট কলেজ]]')).toEqual(['টেস্ট বিশ্ববিদ্যালয়', 'টেস্ট কলেজ']);
    expect(items('টেস্ট স্কুল       [[টেস্ট কলেজ]]')).toEqual(['টেস্ট স্কুল', 'টেস্ট কলেজ']);
    expect(tidy('টেস্ট গ্রাম,টেস্ট জেলা, ব্রিটিশ ভারত।, (বর্তমান বাংলাদেশ)')).toBe('টেস্ট গ্রাম, টেস্ট জেলা, ব্রিটিশ ভারত (বর্তমান বাংলাদেশ)');
  });

  it('keeps professions but not politics, and translates English only from its table', () => {
    expect(professions('রাজনীতিবিদ, ব্যবসায়ী।', 'bn')).toEqual(['ব্যবসায়ী']);
    expect(professions('লেখক, সংসদ সদস্য', 'bn')).toEqual(['লেখক']);
    expect(professions('Politician, Businessman', 'en')).toEqual(['ব্যবসায়ী']);
    expect(professions('[[Barrister]], teacher, astronaut', 'en')).toEqual(['ব্যারিস্টার', 'শিক্ষক']);
    expect(professions('Politician', 'en')).toEqual([]);
  });

  it('reads a birth year from either calendar digits', () => {
    expect(birthYear('{{birth date and age|1970|5|12|df=y}}')).toBe(1970);
    expect(birthYear('১২ মে ১৯৬৮')).toBe(1968);
    expect(birthYear('')).toBeNull();
  });

  it('prefers the Bangla article, fills gaps from English, and never replaces an official profession', () => {
    const bn = page('TEST_bn', '| alma_mater = [[টেস্ট বিশ্ববিদ্যালয়]]\n| birth_date = {{জন্ম তারিখ ও বয়স|১৯৭০|১|১}}');
    const en = page('TEST_en', '| birth_place = [[TEST Upazila]], TEST District\n| occupation = Lawyer\n| alma_mater = [[TEST University]]');
    const bio = bioFrom([bn, en], '1970-01-01', null);
    expect(bio).toMatchObject({ educationBn: 'টেস্ট বিশ্ববিদ্যালয়', birthPlaceBn: 'TEST Upazila, TEST District', professionBn: 'আইনজীবী', from: { educationBn: 'bn', birthPlaceBn: 'en', professionBn: 'en' } });
    expect(bio.sources).toHaveLength(2);
    expect(bioFrom([en], '1970-01-01', 'ব্যবসায়ী').professionBn).toBeUndefined();
  });

  it('lets a hand-checked entry replace an infobox field and cite its article', () => {
    const bio = bioFrom([page('TEST_en', '| alma_mater = [[TEST College]]\n| birth_place = TEST Town')], null, null);
    const out = withManual(bio, { educationBn: 'টেস্ট স্কুল; টেস্ট বিশ্ববিদ্যালয়', source: 'https://en.wikipedia.org/wiki/TEST' });
    expect(out).toMatchObject({ educationBn: 'টেস্ট স্কুল; টেস্ট বিশ্ববিদ্যালয়', birthPlaceBn: 'TEST Town', from: { educationBn: 'en' } });
    expect(out.sources[0]).toBe('https://en.wikipedia.org/wiki/TEST');
    expect(withManual(bio, undefined)).toBe(bio);
  });

  it('sets aside an article whose birth year is not the member\'s', () => {
    const other = page('TEST_en', '| birth_date = {{birth date|1926|1|29}}\n| alma_mater = [[TEST College]]');
    const bio = bioFrom([other], '1965-03-01', null);
    expect(bio.educationBn).toBeUndefined();
    expect(bio.setAside).toMatch(/1926/);
  });
});
