import { describe, expect, it } from 'vitest';
import { parseTbs, tbsSlug } from './results-tbs';

const page = (settings: unknown) =>
  `<html><script type="text/javascript">jQuery.extend(Drupal.settings, ${JSON.stringify(settings)});</script></html>`;

describe('TBS election page', () => {
  it('reads each final seat, drops a doubled candidate and says so', () => {
    const html = page({
      election2026: {
        constituencies: {
          '1': {
            seat_number: '147',
            seat_name: 'TEST Seat-2',
            voting_finalized: true,
            election_results: { a: { votes: 146202 }, b: { votes: 118438 }, c: { votes: 494 }, d: { votes: 494 } },
          },
          '2': { seat_number: '145', seat_name: 'TEST Seat-3', voting_finalized: false, election_results: { e: { votes: 10 }, f: { votes: 9 } } },
        },
        candidates: {
          '1': [
            { diid: 'a', name: 'TEST Winner ', party: 'Party A (PA)' },
            { diid: 'b', name: 'TEST Second', party: 'Party B (PB)' },
            { diid: 'c', name: 'Muhammad TEST Siddique', party: 'Independent Candidate (Independent)' },
            { diid: 'd', name: 'Md. TEST Siddiq', party: 'Independent Candidate (Independent)' },
            { diid: 'x', name: 'TEST No Count', party: 'Party C (PC)' },
          ],
          '2': [
            { diid: 'e', name: 'TEST E', party: 'Party A (PA)' },
            { diid: 'f', name: 'TEST F', party: 'Party B (PB)' },
          ],
        },
      },
    });
    const seats = parseTbs(html);
    expect([...seats.keys()]).toEqual([147]);
    const s = seats.get(147)!;
    expect(s.url).toBe('https://www.tbsnews.net/election-2026-seat/test-seat-2');
    expect(s.candidates.map((c) => [c.name, c.votes])).toEqual([
      ['TEST Winner', 146202],
      ['TEST Second', 118438],
      ['Muhammad TEST Siddique', 494],
    ]);
    expect(s.withoutVotes).toBe(1);
    expect(s.notes).toHaveLength(1);
  });

  it('shows two names one party gave at the same count together', () => {
    const html = page({
      election2026: {
        constituencies: { '1': { seat_number: '158', seat_name: 'TEST-2', voting_finalized: true, election_results: { a: { votes: 900 }, b: { votes: 15220 }, c: { votes: 15220 } } } },
        candidates: {
          '1': [
            { diid: 'a', name: 'TEST Top', party: 'Party A (PA)' },
            { diid: 'b', name: 'TEST Rahim', party: 'Party B (PB)' },
            { diid: 'c', name: 'TEST Qayyum', party: 'Party B (PB)' },
          ],
        },
      },
    });
    const s = parseTbs(html).get(158)!;
    expect(s.candidates.map((c) => c.name)).toEqual(['TEST Rahim / TEST Qayyum', 'TEST Top']);
    expect(s.notes[0]).toMatch(/একই দলের দুটি নাম/);
  });

  it('builds slugs the way the site does', () => {
    expect(tbsSlug("Cox's Bazar-1")).toBe('coxs-bazar-1');
    expect(tbsSlug('Chapai Nawabganj-3')).toBe('chapai-nawabganj-3');
  });
});
