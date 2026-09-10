import type { ConstituencyListing, ConstituencyRow } from '@durbin/db';
import { num, t } from '@/lib/i18n';
import type { Locale } from '@/lib/site';

const name = (locale: Locale, row: { nameBn: string; nameEn: string }) => (locale === 'bn' ? row.nameBn : row.nameEn);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-rule rounded-card shadow-card px-4 py-3 flex flex-col gap-0.5 min-w-[120px]">
      <span className="display tnum text-[26px] leading-none">{value}</span>
      <span className="text-[12.5px] text-muted">{label}</span>
    </div>
  );
}

function SeatCard({ locale, c }: { locale: Locale; c: ConstituencyRow }) {
  const s = t(locale);
  return (
    <li
      data-testid="constituency"
      className="bg-surface border border-rule rounded-card shadow-card p-4 flex flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="display text-[16px]">{name(locale, c)}</span>
        <span className="tnum text-[12.5px] text-muted shrink-0">{num(locale, c.number)}</span>
      </div>
      <p className="text-[13px] text-inksoft leading-relaxed wrap-anywhere">
        {c.boundaryBn ? (
          <>
            <span className="text-muted">{s.boundary}: </span>
            {c.boundaryBn}
          </>
        ) : (
          <span className="text-muted">{s.noData}</span>
        )}
      </p>
    </li>
  );
}

/** Every constituency of the parliament, grouped by division and district. */
export default function Listing({ locale, data }: { locale: Locale; data: ConstituencyListing }) {
  const s = t(locale);
  const districtCount = data.divisions.reduce((n, d) => n + d.districts.length, 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-5">
      <section className="pt-9 sm:pt-12 pb-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2 max-w-[720px]">
          <span className="text-[12.5px] font-bold tracking-[1.5px] text-accent uppercase">{s.section}</span>
          <h1 className="display text-[30px] sm:text-[42px] leading-[1.15] text-balance">{s.listingTitle}</h1>
          <p className="text-[15.5px] sm:text-[17px] text-inksoft leading-relaxed">{s.listingLede}</p>
        </div>
        <div className="flex flex-wrap gap-3" data-testid="counts">
          <Stat label={s.seats} value={num(locale, data.total)} />
          <Stat label={s.territorial} value={num(locale, data.territorial)} />
          <Stat label={s.reserved} value={num(locale, data.reserved)} />
          <Stat label={s.divisions} value={num(locale, data.divisions.length)} />
          <Stat label={s.districts} value={num(locale, districtCount)} />
        </div>
      </section>

      {data.divisions.map((g) => (
        <section key={g.division.slug} className="pb-10 flex flex-col gap-5" data-testid="division">
          <h2 className="display text-[24px] sm:text-[28px]">{name(locale, g.division)}</h2>
          {g.districts.map((d) => (
            <div key={d.district.slug} className="flex flex-col gap-3" data-testid="district">
              <h3 className="display text-[17px] text-inksoft flex items-baseline gap-2">
                {name(locale, d.district)}
                <span className="tnum text-[13px] font-semibold text-muted">
                  {num(locale, d.constituencies.length)} {s.seats}
                </span>
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {d.constituencies.map((c) => (
                  <SeatCard key={c.number} locale={locale} c={c} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {data.reservedSeats.length > 0 && (
        <section className="pb-14 flex flex-col gap-4" data-testid="reserved">
          <h2 className="display text-[24px] sm:text-[28px]">{s.reservedHeading}</h2>
          <p className="text-[14px] text-muted max-w-[720px]">{s.reservedNote}</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.reservedSeats.map((c) => (
              <li
                key={c.number}
                data-testid="constituency"
                className="bg-surface border border-rule rounded-card shadow-card px-4 py-3 flex items-baseline justify-between gap-2"
              >
                <span className="font-semibold">{name(locale, c)}</span>
                <span className="tnum text-[12.5px] text-muted">{num(locale, c.number)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pb-12 text-[13px] text-muted">{s.sourceLine}</p>
    </div>
  );
}
