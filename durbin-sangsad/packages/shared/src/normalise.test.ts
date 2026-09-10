import { describe, expect, it } from 'vitest';
import { normalise, bnDigits, toLatinDigits } from './normalise';
import { nameKey, nameSimilarity, skeleton } from './names';
import { slugify } from './slug';

describe('normalise', () => {
  it('folds the five spellings of Md.', () => {
    const keys = ['মোঃ আব্দুল হাই', 'মো. আব্দুল হাই', 'মোহাম্মদ আব্দুল হাই', 'মুহাম্মদ আব্দুল হাই'].map(normalise);
    expect(new Set(keys).size).toBe(1);
  });

  it('ignores zero-width joiners and vowel-length differences', () => {
    expect(normalise('জাতীয়‌তাবাদী')).toBe(normalise('জাতিয়তাবাদি'));
  });

  it('treats old and new district spellings as one', () => {
    expect(normalise('Chittagong-11')).toBe(normalise('Chattogram 11'));
    expect(normalise('Bogra-6')).toBe(normalise('Bogura-6'));
  });

  it('folds Bangla digits into Latin ones', () => {
    expect(normalise('ঢাকা-১৭')).toBe('ঢাকা 17');
  });

  it('leaves Bengali untouched by the English rules', () => {
    expect(normalise('ভোলা')).toBe('ভোলা');
  });
});

describe('digits', () => {
  it('round-trips', () => {
    expect(bnDigits(349)).toBe('৩৪৯');
    expect(toLatinDigits('১১৮')).toBe('118');
  });
});

describe('slugify', () => {
  it('drops apostrophes and case', () => {
    expect(slugify("Cox'sBazar-1")).toBe('coxsbazar-1');
    expect(slugify('Dhaka-17')).toBe('dhaka-17');
  });
});

describe('name similarity', () => {
  it('sees one person through two transliterations', () => {
    expect(nameSimilarity('Md. Lutfuzzaman Babor', 'Md Lutfozzaman Babar')).toBeGreaterThanOrEqual(0.7);
    expect(nameSimilarity('Dr. Khondakar Mosarrof Hossain', 'DR. Khandaker Mosharraf Hossain')).toBeGreaterThanOrEqual(0.85);
    expect(skeleton(nameKey('Mosarrof'))).toBe(skeleton(nameKey('Mosharraf')));
  });

  it('strips titles before comparing', () => {
    expect(nameKey('Barrister Muhammad Nawshad Zamir')).toBe(nameKey('Nawshad Zamir'));
  });

  it('cannot separate namesakes by name alone, so callers must use context', () => {
    // Two different men, neighbouring districts. The score is high on purpose:
    // the matcher must add seat or date-of-birth evidence before asserting identity.
    expect(nameSimilarity('Joynul Abdin Faruk', 'Joynal Abdin')).toBeGreaterThan(0.6);
    expect(nameSimilarity('Md. Abdul Aziz', 'Md Abdul Aziz')).toBe(1);
  });

  it('is low for unrelated names', () => {
    expect(nameSimilarity('Tarique Rahman', 'Salahuddin Ahmed')).toBeLessThan(0.4);
  });
});
