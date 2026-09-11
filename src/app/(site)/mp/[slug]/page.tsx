import type { Metadata } from 'next';
import { shareGraph, shareTwitter } from '@/lib/seo';
import { mpDescription, mpTitle, partyBn, isIndependent } from '@/lib/seo/mpDescription';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  members, allMembers, getMember, committeesOfMember, membersOfParty, districtOf,
  bn, ageFrom, dateBn, initial, meta, OFFICE_LABELS, committeeCounts, newsForMember, partyColor,
} from '@/lib/data';
import { rolesOf, noticesForMember } from '@/lib/activity';
import { priorTermsOf, parliamentLabel, parliamentOrdinal, resultForSeat, socialsOf, electionYear } from '@/lib/history';
import { Page, Card, Breadcrumb, Empty, PartyDot, NewsCard, DocLink } from '@/components/ui';
import { ResultCard, sourceOf } from '@/components/results';
import { introOf } from '@/lib/intro';
import MemberPhoto from '@/components/MemberPhoto';
import Icon from '@/components/Icon';
import BrandIcon, { isBrand } from '@/components/BrandIcon';
import ShareButtons from '@/components/ShareButtons';
import { siteUrl } from '@/lib/site';

export function generateStaticParams() {
  return allMembers.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<'/mp/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) return { title: 'সদস্য পাওয়া যায়নি' };
  // The member's own 1200x630 preview image (src/app/api/og/mp/[slug]/route.tsx).
  const image = { url: `/api/og/mp/${m.slug}`, width: 1200, height: 630, type: 'image/png', alt: mpTitle(m) };
  const description = mpDescription(m);
  return {
    title: { absolute: mpTitle(m) },
    description,
    alternates: { canonical: `/mp/${m.slug}` },
    openGraph: { ...shareGraph(`/mp/${m.slug}`, image), description },
    twitter: { ...shareTwitter(image), card: 'summary_large_image', description },
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-rulesoft last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-end font-medium wrap-anywhere">{children}</span>
    </div>
  );
}

function H2({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="display text-[21px] sm:text-[24px]">
      {children}
      {typeof count === 'number' && count > 0 && <span className="ms-2 text-[15px] font-semibold text-muted tnum">({bn(count)})</span>}
    </h2>
  );
}

export default async function MemberPage({ params }: PageProps<'/mp/[slug]'>) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) notFound();

  const age = ageFrom(m.dateOfBirth);
  const district = districtOf(m.seat);
  const onCommittees = committeesOfMember(m.id);
  const memberNews = newsForMember(m.id);
  const notices = noticesForMember(m.id);
  const prior = priorTermsOf(m.id);
  const socials = socialsOf(m);
  const result = m.seat && !m.seat.reserved ? resultForSeat(m.seat.no, meta.parliamentNo) : null;
  // The seat's result is only "this member's votes" when they are its winner;
  // after a by-election the general-election winner is someone else.
  const wonThisResult = !!result && [...result.candidates].sort((a, b) => b.votes - a.votes)[0]?.name === m.nameBn;
  const cc = committeeCounts();
  const partyMates = m.party ? membersOfParty(m.party.abbr).filter((x) => x.id !== m.id) : [];
  const sameDistrict = district
    ? members.filter((x) => x.id !== m.id && districtOf(x.seat)?.en === district.en)
    : [];

  // Offices come from two places in the source: the term record (Speaker, PM…)
  // and the presiding-officers list (whips and leaders). Show each once.
  const roles = [...new Set([...m.offices.map((o) => OFFICE_LABELS[o] ?? o), ...rolesOf(m.id)])];

  // Facts read from the member's Wikipedia infobox are marked, with the article linked under the list.
  const fromWiki = new Set((m.bioFromWiki ?? '').split(',').map((x) => x.trim()).filter(Boolean));
  const facts = [
    m.dateOfBirth && { label: 'জন্ম', value: `${dateBn(m.dateOfBirth)}${age !== null ? ` · ${bn(age)} বছর` : ''}` },
    m.birthPlaceBn && { label: 'জন্মস্থান', value: m.birthPlaceBn, wiki: fromWiki.has('birthPlaceBn') },
    m.gender && { label: 'লিঙ্গ', value: m.gender === 'Female' ? 'নারী' : 'পুরুষ' },
    m.educationBn && { label: 'শিক্ষা', value: m.educationBn, wiki: fromWiki.has('educationBn'), lines: true },
    m.professionBn && { label: 'পেশা', value: m.professionBn, wiki: fromWiki.has('professionBn') },
    m.fatherBn && { label: 'পিতা', value: m.fatherBn },
    m.motherBn && { label: 'মাতা', value: m.motherBn },
    m.isFreedomFighter && { label: 'মুক্তিযোদ্ধা', value: 'হ্যাঁ' },
    m.term?.start && { label: m.resignedOn ? 'মেয়াদ' : 'বর্তমান মেয়াদ', value: `${dateBn(m.term.start)} – ${dateBn(m.term.end) ?? 'চলমান'}` },
    m.resignedOn && { label: 'পদত্যাগ', value: dateBn(m.resignedOn) ?? 'তারিখ পাওয়া যায়নি' },
    m.termsCount && { label: 'সংসদ সদস্য নির্বাচিত', value: `মোট ${bn(m.termsCount)} বার` },
  ].filter(Boolean) as { label: string; value: string; wiki?: boolean; lines?: boolean }[];
  const wikiSources = facts.some((f) => f.wiki) ? (m.bioSource ?? '').split(' ').filter(Boolean) : [];

  const paragraphs = (m.bioBn ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const year = electionYear(meta.parliamentNo);
  // parliament.gov.bd writes a biography for the presiding officers only (and repeats it as the summary);
  // everyone else gets an introduction put together from the facts on this page.
  const summaryRepeatsBio =
    !!m.summaryBn && paragraphs.length > 0 && paragraphs.join('').replace(/\s/g, '').includes(m.summaryBn.replace(/\s/g, ''));
  const intro =
    m.summaryBn || paragraphs.length
      ? []
      : introOf(m, {
          roles,
          result: wonThisResult ? result : null,
          resultSourceBy: result ? sourceOf(result.sourceUrl).by : null,
          year,
          skipIdentity: true,
        });
  // The page opens with the same sentences search results and link previews show.
  const lead = mpDescription(m);
  const party = partyBn(m.party);
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: m.nameBn ?? m.nameEn,
    ...(m.nameEn && m.nameBn ? { alternateName: m.nameEn } : {}),
    jobTitle: 'সংসদ সদস্য',
    ...(party && !isIndependent(m) ? { memberOf: { '@type': 'Organization', name: party.name } } : {}),
    worksFor: { '@type': 'Organization', name: 'বাংলাদেশ জাতীয় সংসদ', url: 'https://www.parliament.gov.bd' },
    ...(m.photoUrl ? { image: m.photoUrl } : {}),
    url: `${siteUrl}/mp/${m.slug}`,
  };
  // Name only the sources this member's introduction actually drew on.
  const introParts = [
    'সংসদের সদস্য তালিকা',
    wonThisResult ? 'প্রকাশিত নির্বাচনী ফল' : null,
    wikiSources.length ? 'নিচের তালিকায় তারকাচিহ্নিত উইকিপিডিয়ার তথ্য' : null,
  ].filter(Boolean) as string[];
  const introSources =
    introParts.length > 1 ? `${introParts.slice(0, -1).join(', ')} এবং ${introParts[introParts.length - 1]}` : introParts[0];

  return (
    <Page>
      <Breadcrumb
        items={[
          { href: '/', label: 'হোম' },
          { href: '/mp', label: 'সংসদ সদস্য' },
          ...(district ? [{ href: `/jela/${district.slug}`, label: district.bn }] : []),
          { label: m.seat?.nameBn ?? (m.nameBn ?? '') },
        ]}
      />

      <header
        className="mt-5 bg-surface border border-rule rounded-card shadow-card p-5 sm:p-7 flex flex-col md:flex-row gap-5 md:gap-8 items-start"
        style={{ borderTopColor: partyColor(m.party?.abbr), borderTopWidth: 4 }}
      >
        <MemberPhoto src={m.photoUrl} alt={m.nameBn ?? m.nameEn ?? ''} initial={initial(m)} size={120} className="ring-4 ring-paper" />
        <div className="grow flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap gap-2">
            {m.resignedOn ? (
              <span className="px-3 py-1 rounded-full bg-warnsoft text-warn text-[12.5px] font-bold">
                পদত্যাগ করেছেন · {dateBn(m.resignedOn)}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-brandsoft text-brand text-[12.5px] font-bold">
                বর্তমান সদস্য · ত্রয়োদশ সংসদ
              </span>
            )}
            {roles.map((r) => (
              <span key={r} className="px-3 py-1 rounded-full bg-ink text-white text-[12.5px] font-bold">{r}</span>
            ))}
            {(m.termsCount ?? prior.length + 1) > 1 && (
              <span className="px-3 py-1 rounded-full border border-rule text-[12.5px] font-semibold text-inksoft">
                মোট {bn(m.termsCount ?? prior.length + 1)} বার নির্বাচিত
              </span>
            )}
            {m.seat?.reserved && (
              <span className="px-3 py-1 rounded-full border border-rule text-[12.5px] font-semibold text-inksoft">
                সংরক্ষিত নারী আসন
              </span>
            )}
          </div>
          <h1 className="display text-[28px] sm:text-[40px] leading-[1.15] text-balance wrap-anywhere">
            {m.nameBn ?? m.nameEn}
          </h1>
          {m.nameEn && m.nameBn && <p className="text-[15.5px] text-muted -mt-1">{m.nameEn}</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
            {m.party && (
              <Link href={`/dol/${m.party.abbr.toLowerCase()}`} className="flex items-center gap-2 font-semibold hover:text-brand">
                <PartyDot abbr={m.party.abbr} />
                {m.party.nameBn ?? m.party.abbr}
              </Link>
            )}
            {m.seat && (
              <Link href={`/ason/${m.seat.slug}`} className="font-semibold text-brand hover:underline">
                {m.seat.nameBn}
              </Link>
            )}
            {district && (
              <Link href={`/jela/${district.slug}`} className="text-inksoft hover:text-brand">{district.bn} জেলা</Link>
            )}
          </div>
          {m.resignedOn && (
            <div role="note" className="flex items-start gap-2.5 rounded-lg border-s-[3px] border-warn bg-warnsoft px-4 py-3 text-[14.5px] leading-relaxed text-ink">
              <Icon name="info" size={18} className="mt-[3px] text-warn shrink-0" />
              <span>
                <strong className="font-bold">{dateBn(m.resignedOn)} তারিখে সংসদ সদস্য পদ থেকে পদত্যাগ করেছেন।</strong>{' '}
                {m.seat && (
                  <>
                    তাঁর আসন{' '}
                    <Link href={`/ason/${m.seat.slug}`} className="font-semibold text-brand hover:underline">{m.seat.nameBn}</Link>{' '}
                    এখন শূন্য।{' '}
                  </>
                )}
                <span className="text-inksoft">সূত্র: বাংলাদেশ জাতীয় সংসদের সদস্য তালিকা।</span>
              </span>
            </div>
          )}
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rule bg-surface text-[13px] font-semibold hover:border-brand hover:text-brand transition-colors"
                >
                  {isBrand(s.key) ? <BrandIcon name={s.key} size={14} /> : <Icon name={s.icon} size={14} />}
                  {s.label}
                </a>
              ))}
            </div>
          )}
          <div className="pt-1">
            <ShareButtons
              url={`${siteUrl}/mp/${m.slug}`}
              title={`${m.nameBn ?? m.nameEn} · আমার এমপি`}
              text={[m.nameBn ?? m.nameEn, m.seat?.nameBn, m.party?.nameBn].filter(Boolean).join(' · ')}
            />
          </div>
        </div>
      </header>

      <div className="pt-8 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 lg:gap-10 items-start">
        <div className="flex flex-col gap-10 min-w-0">
          <section className="flex flex-col gap-4">
            <H2>পরিচিতি</H2>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
            <p className="text-[16px] sm:text-[17px] leading-relaxed text-inksoft">{lead}</p>
            {intro.length > 0 && (
              <div className="flex flex-col gap-3">
                {intro.map((p, i) => (
                  <p key={i} className="text-[16px] sm:text-[17px] leading-relaxed text-inksoft">{p}</p>
                ))}
                <p className="text-[12.5px] text-muted leading-relaxed">
                  এই পরিচিতি এই পাতার তথ্য থেকে সাজানো: {introSources}। নিজস্ব কোনো মূল্যায়ন এতে নেই।
                </p>
              </div>
            )}
            {m.summaryBn && !summaryRepeatsBio && (
              <p className="text-[16px] sm:text-[17px] leading-relaxed text-inksoft">{m.summaryBn}</p>
            )}
            {paragraphs.length > 0 && (
              <Card className="p-5 sm:p-6 flex flex-col gap-3">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.8] wrap-anywhere">{p}</p>
                ))}
              </Card>
            )}
            {facts.length ? (
              <Card className="px-5 py-2 text-[14.5px]">
                {facts.map((b) => (
                  <Row key={b.label} label={b.label}>
                    {(b.lines ? b.value.split(/;\s*/) : [b.value]).map((part, i, all) => (
                      <span key={i} className={b.lines ? 'block' : undefined}>
                        {part}
                        {b.wiki && i === all.length - 1 && <sup className="ms-0.5 text-brand font-bold" title="উইকিপিডিয়া থেকে">*</sup>}
                      </span>
                    ))}
                  </Row>
                ))}
                {wikiSources.length > 0 && (
                  <p className="py-2.5 text-[12.5px] text-muted leading-relaxed">
                    <span className="text-brand font-bold">*</span> চিহ্নিত তথ্য সদস্যের{' '}
                    {wikiSources.map((u, i) => (
                      <span key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">
                          উইকিপিডিয়া নিবন্ধ{wikiSources.length > 1 ? (/\/\/bn\./.test(u) ? ' (বাংলা)' : ' (ইংরেজি)') : ''}
                        </a>
                        {i < wikiSources.length - 1 ? ' ও ' : ''}
                      </span>
                    ))}{' '}
                    থেকে নেওয়া; সংসদ বা নির্বাচন কমিশনের নথির সঙ্গে মিলিয়ে দেখা হয়নি। ভুল দেখলে জানান।
                  </p>
                )}
              </Card>
            ) : (
              <Empty title="পরিচিতির তথ্য সংসদের তথ্যভান্ডারে নেই।" />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <H2>সংসদে মেয়াদ</H2>
            <Card className="divide-y divide-rulesoft">
              <div className="px-5 py-3 flex items-center gap-4 bg-brandsoft/40">
                <span className="w-[150px] sm:w-[190px] shrink-0 text-[13.5px] font-semibold text-brand">{parliamentLabel(meta.parliamentNo)}</span>
                <span className="grow min-w-0 flex flex-col">
                  <span className="font-semibold truncate">{m.seat?.nameBn ?? 'আসন উল্লেখ নেই'}</span>
                  <span className="text-[12.5px] text-muted">{m.resignedOn ? `পদত্যাগ করেছেন ${dateBn(m.resignedOn)}` : 'বর্তমান মেয়াদ'}</span>
                </span>
                <span className="shrink-0 flex items-center gap-2 text-[13px] font-semibold text-inksoft">
                  <PartyDot abbr={m.party?.abbr} />
                  <span className="hidden sm:inline">{m.party?.nameBn ?? m.party?.abbr ?? '—'}</span>
                  <span className="sm:hidden">{m.party?.abbr ?? '—'}</span>
                </span>
              </div>
              {prior.map((t) => (
                <div key={t.parliamentNo} className="px-5 py-3 flex items-center gap-4">
                  <span className="w-[150px] sm:w-[190px] shrink-0 text-[13.5px] text-muted">{parliamentLabel(t.parliamentNo)}</span>
                  <span className="grow min-w-0 flex flex-col">
                    <span className="font-semibold truncate">{t.seatNameBn ?? t.seatNameEn ?? 'আসন উল্লেখ নেই'}</span>
                    {t.seatNameEn && t.seatNameBn && <span className="text-[12.5px] text-muted truncate">{t.seatNameEn}</span>}
                  </span>
                  <span className="shrink-0 flex items-center gap-2 text-[13px] font-semibold text-inksoft">
                    <PartyDot abbr={t.partyAbbr} />
                    <span className="hidden sm:inline">{t.partyNameBn ?? t.partyAbbr ?? '—'}</span>
                    <span className="sm:hidden">{t.partyAbbr ?? '—'}</span>
                  </span>
                </div>
              ))}
            </Card>
            <p className="text-[12.5px] text-muted leading-relaxed">
              {m.termsCount
                ? `সংসদ সচিবালয়ের তথ্য অনুযায়ী তিনি মোট ${bn(m.termsCount)} বার সংসদ সদস্য নির্বাচিত হয়েছেন${
                    m.termsCount > 1
                      ? prior.length >= m.termsCount - 1
                        ? '। '
                        : prior.length === 0
                          ? `; আগের ${bn(m.termsCount - 1)}টি মেয়াদের বিস্তারিত সংসদের তথ্যভান্ডারে পাওয়া যায়নি। `
                          : `; আগের ${bn(m.termsCount - 1)}টি মেয়াদের মধ্যে ${bn(prior.length)}টির বিস্তারিত এখানে আছে। `
                      : '। '
                  }`
                : prior.length
                  ? `সংসদের তথ্যভান্ডার অনুযায়ী এটি ${parliamentOrdinal(prior.length + 1).replace(' সংসদ', '')} মেয়াদ। `
                  : 'সংসদের তথ্যভান্ডারে এই সদস্যের আগের কোনো মেয়াদ পাওয়া যায়নি। '}
              সেখানে ৪র্থ, ৫ম ও ৭ম থেকে ১২শ সংসদের রেকর্ড আছে; ১ম–৩য় ও ৬ষ্ঠ সংসদের তালিকা নেই, তাই তার আগের মেয়াদ থাকলে এখানে দেখা যাবে না।
            </p>
          </section>

          {m.seat && !m.seat.reserved && (
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-baseline gap-4">
                <H2>
                  {result && !wonThisResult
                    ? `${year ? `${bn(year)} সালের সাধারণ নির্বাচনে` : 'সাধারণ নির্বাচনে'} এই আসনের ফল`
                    : `${year ? `${bn(year)} নির্বাচনে` : 'নির্বাচনে'} প্রাপ্ত ভোট`}
                </H2>
                <Link href={`/ason/${m.seat.slug}`} className="text-[14px] font-semibold text-brand hover:underline whitespace-nowrap">
                  আসনের সব ফল →
                </Link>
              </div>
              {result ? (
                <>
                  {!wonThisResult && (
                    <p className="text-[14.5px] leading-relaxed text-inksoft">
                      এই আসনের সাধারণ নির্বাচনের বিজয়ী ও বর্তমান সংসদ সদস্যের নাম আলাদা। নিচের কার্ডের শেষে উৎসের বিবরণ দেখুন।
                    </p>
                  )}
                  <ResultCard r={result} />
                </>
              ) : (
                <Empty
                  title="এই আসনের ভোটের সংখ্যা এখনো যোগ হয়নি।"
                  body="সংসদের তথ্যভান্ডারে ভোটের সংখ্যা নেই। নির্বাচন কমিশনের গেজেট থেকে যাচাই করে যোগ করা হলে এখানে দেখা যাবে।"
                />
              )}
            </section>
          )}

          <section className="flex flex-col gap-4">
            <H2 count={notices.length}>সংসদ সচিবালয়ের প্রজ্ঞাপন</H2>
            {notices.length ? (
              <Card className="divide-y divide-rulesoft">
                {notices.map((n) => (
                  <div key={n.id} className="px-5 py-3.5 flex items-start gap-4">
                    <span className="grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[14.5px] font-medium wrap-anywhere">{n.titleBn ?? n.titleEn}</span>
                      <span className="text-[12.5px] text-muted">
                        {dateBn(n.date) ?? 'তারিখ নেই'}{n.category ? ` · ${n.category}` : ''}
                      </span>
                    </span>
                    {n.pdfUrl && <DocLink href={n.pdfUrl}>PDF</DocLink>}
                  </div>
                ))}
              </Card>
            ) : (
              <Empty
                title="এই সদস্য সম্পর্কে সংসদ সচিবালয়ের কোনো প্রজ্ঞাপন নেই।"
                body="সংসদ সচিবালয় কোনো সদস্যের নামে প্রজ্ঞাপন বা সরকারি আদেশ প্রকাশ করলে তা প্রতিদিন এখানে যুক্ত হয়।"
              />
            )}
          </section>

          {m.seat && !m.seat.reserved && (
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-baseline gap-4">
                <H2>আসন · {m.seat.nameBn}</H2>
                <Link href={`/ason/${m.seat.slug}`} className="text-[14px] font-semibold text-brand hover:underline whitespace-nowrap">
                  আসনের পাতা →
                </Link>
              </div>
              {m.seat.boundaryBn ? (
                <Card className="p-5 flex flex-col gap-2">
                  <span className="text-[12px] font-bold tracking-[1px] text-muted">এলাকা</span>
                  <p className="text-[15px] leading-relaxed">{m.seat.boundaryBn}</p>
                </Card>
              ) : (
                <Empty title="এই আসনের এলাকার বিবরণ পাওয়া যায়নি।" />
              )}
            </section>
          )}

          <section className="flex flex-col gap-4">
            <H2 count={onCommittees.length}>সংসদীয় কমিটি</H2>
            {onCommittees.length ? (
              <ul className="flex flex-col gap-2.5">
                {onCommittees.map((c) => {
                  const role = c.members.find((x) => x.memberId === m.id)?.role;
                  return (
                    <li key={c.id}>
                      <Link href={`/committee/${c.slug}`} className="bg-surface border border-rule rounded-card shadow-card px-5 py-4 flex items-center gap-4 hover:border-brand hover:shadow-lift transition-all">
                        <span className="grow display text-[15.5px]">{c.nameBn ?? c.nameEn}</span>
                        {role && role !== 'Member' && (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-brandsoft text-brand text-[12px] font-bold">
                            {role === 'Chairman' ? 'সভাপতি' : role}
                          </span>
                        )}
                        <Icon name="arrow" size={16} className="text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty
                title="হালনাগাদ কোনো কমিটিতে এই সদস্যের নাম নেই।"
                body={`সংসদের ${bn(cc.total)}টি কমিটির মধ্যে ${bn(cc.current)}টির সদস্য তালিকা ত্রয়োদশ সংসদের জন্য হালনাগাদ হয়েছে। বাকিগুলো হালনাগাদ হলে এখানে যুক্ত হবে।`}
              />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <H2 count={memberNews.length}>সংবাদ</H2>
            {memberNews.length ? (
              <ul className="flex flex-col gap-3">
                {memberNews.slice(0, 30).map((n) => <li key={n.id}><NewsCard n={n} /></li>)}
              </ul>
            ) : (
              <Empty
                title="এই সদস্য নিয়ে এখনো কোনো সংবাদ প্রকাশ করা হয়নি।"
                body="অনুমোদিত সংবাদমাধ্যমের শিরোনাম যাচাইয়ের পর এখানে দেখানো হবে।"
              />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-3">
            <h2 className="display text-[18px] flex items-center gap-2"><Icon name="mail" size={17} className="text-brand" /> যোগাযোগ</h2>
            {m.email ? (
              <>
                <p className="text-[13.5px] text-inksoft leading-relaxed">
                  সংসদ কর্তৃক প্রকাশিত দাপ্তরিক ঠিকানা। বার্তা সরাসরি সদস্যের কাছে যাবে; আমার এমপি
                  তাঁর পক্ষে উত্তর দেয় না।
                </p>
                <a
                  href={`mailto:${m.email}`}
                  className="inline-flex items-center justify-center h-11 rounded-lg bg-brand text-white text-[14px] font-semibold hover:bg-branddark transition-colors wrap-anywhere px-3"
                >
                  {m.email}
                </a>
              </>
            ) : (
              <p className="text-[13.5px] text-inksoft leading-relaxed">
                সংসদের তথ্যভান্ডারে এই সদস্যের কোনো দাপ্তরিক ইমেইল প্রকাশ করা নেই।
                {m.seat?.reserved && ' সংরক্ষিত আসনের সদস্যদের ক্ষেত্রে এটি সাধারণ।'}
              </p>
            )}
            {socials.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-rule pt-3">
                <span className="text-[12px] font-bold tracking-[1px] text-muted">অফিসিয়াল সোশ্যাল মিডিয়া</span>
                <ul className="flex flex-col gap-1.5">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className="flex items-center gap-2 text-[14px] font-semibold hover:text-brand">
                        {isBrand(s.key) ? <BrandIcon name={s.key} size={15} /> : <Icon name={s.icon} size={15} className="text-muted" />}
                        {s.label}
                        <Icon name="external" size={12} className="text-muted" />
                      </a>
                    </li>
                  ))}
                </ul>
                {m.socialSource ? (
                  <span className="text-[12px] text-muted leading-relaxed">
                    সূত্র: সদস্যের{' '}
                    {m.socialSource.split(' ').filter(Boolean).map((u, i, all) => (
                      <span key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">
                          উইকিপিডিয়া নিবন্ধ{all.length > 1 ? (/\/\/bn\./.test(u) ? ' (বাংলা)' : ' (ইংরেজি)') : ''}
                        </a>
                        {i < all.length - 1 ? ' ও ' : ''}
                      </span>
                    ))}
                    । ভুল দেখলে জানান।
                  </span>
                ) : (
                  <span className="text-[12px] text-muted leading-relaxed">আমার এমপির সম্পাদক যাচাই করে যুক্ত করেছেন।</span>
                )}
              </div>
            )}
            {m.presentAddressBn && (
              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[12px] font-bold tracking-[1px] text-muted">{m.permanentAddressBn && m.permanentAddressBn !== m.presentAddressBn ? 'বর্তমান ঠিকানা' : 'ঠিকানা'}</span>
                <span className="text-[14px] leading-relaxed">{m.presentAddressBn}</span>
              </div>
            )}
            {m.permanentAddressBn && m.permanentAddressBn !== m.presentAddressBn && (
              <div className="flex flex-col gap-1 border-t border-rule pt-3">
                <span className="text-[12px] font-bold tracking-[1px] text-muted">স্থায়ী ঠিকানা</span>
                <span className="text-[14px] leading-relaxed">{m.permanentAddressBn}</span>
              </div>
            )}
          </Card>

          {partyMates.length > 0 && m.party && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <h2 className="display text-[18px]">একই দলের</h2>
                <Link href={`/dol/${m.party.abbr.toLowerCase()}`} className="text-[13px] font-semibold text-brand hover:underline">
                  সব {bn(partyMates.length + 1)} →
                </Link>
              </div>
              <ul className="flex flex-col divide-y divide-rulesoft text-[14.5px]">
                {partyMates.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <Link href={`/mp/${x.slug}`} className="flex justify-between gap-3 py-2 hover:text-brand">
                      <span className="truncate">{x.nameBn ?? x.nameEn}</span>
                      <span className="text-muted shrink-0">{x.seat?.nameBn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sameDistrict.length > 0 && district && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <h2 className="display text-[18px]">{district.bn} জেলার অন্য আসন</h2>
                <Link href={`/jela/${district.slug}`} className="text-[13px] font-semibold text-brand hover:underline">জেলা →</Link>
              </div>
              <ul className="flex flex-col divide-y divide-rulesoft text-[14.5px]">
                {sameDistrict.slice(0, 6).map((x) => (
                  <li key={x.id}>
                    <Link href={`/ason/${x.seat?.slug}`} className="flex justify-between gap-3 py-2 hover:text-brand">
                      <span>{x.seat?.nameBn}</span>
                      <span className="text-muted truncate max-w-[55%]">{x.nameBn ?? x.nameEn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="p-4 rounded-card bg-brandsoft flex gap-3">
            <Icon name="info" size={18} className="text-brand mt-0.5" />
            <span className="text-[13px] leading-relaxed text-branddark">
              তথ্যসূত্র বাংলাদেশ জাতীয় সংসদ। সংসদের তথ্যভান্ডার থেকে প্রতিদিন হালনাগাদ, সর্বশেষ {dateBn(meta.syncedAt)}।
              ভুল দেখলে <Link href="/jogajog" className="font-semibold underline">আমাদের জানান</Link>।
            </span>
          </div>
        </aside>
      </div>
    </Page>
  );
}
