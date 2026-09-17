import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facebookNotice, socialsOf } from '../history';
import type { Member } from '../data';

// Run with: npm test

const member = (over: Partial<Member>): Member =>
  ({ facebook: null, x: null, youtube: null, instagram: null, website: null, fbStatus: null, ...over }) as Member;

const FB = 'https://www.facebook.com/example';
const WEB = 'https://example.org';

test('verified, or no status at all, shows the link as it is', () => {
  for (const fbStatus of ['verified', null] as const) {
    const m = member({ facebook: FB, website: WEB, fbStatus });
    assert.deepEqual(socialsOf(m).map((s) => [s.key, s.unverified]), [['facebook', false], ['website', false]]);
    assert.equal(facebookNotice(m), null);
  }
});

test('a confirmed page and the website are labelled official', () => {
  const m = member({ facebook: FB, website: WEB, fbStatus: 'verified' });
  assert.deepEqual(socialsOf(m).map((s) => s.label), ['অফিসিয়াল ফেসবুক পেজ', 'অফিসিয়াল ওয়েবসাইট']);
});

test('pending shows the link marked as not yet checked', () => {
  const m = member({ facebook: FB, fbStatus: 'pending' });
  assert.deepEqual(socialsOf(m).map((s) => [s.key, s.unverified]), [['facebook', true]]);
  // Not called official while it is still being checked.
  assert.equal(socialsOf(m)[0]!.label, 'ফেসবুক পেজ');
  assert.equal(facebookNotice(m), null);
});

test('disputed shows no link, only the notice, and the website still shows', () => {
  const m = member({ facebook: FB, website: WEB, fbStatus: 'disputed' });
  assert.deepEqual(socialsOf(m).map((s) => s.key), ['website']);
  assert.equal(facebookNotice(m), 'ফেসবুক পেজ যাচাই করা হয়নি');
});

test('not_found shows nothing for Facebook, even with a link stored', () => {
  const m = member({ facebook: FB, website: WEB, fbStatus: 'not_found' });
  assert.deepEqual(socialsOf(m).map((s) => s.key), ['website']);
  assert.equal(facebookNotice(m), null);
});
