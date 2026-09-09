import Link from 'next/link';

/** Small building blocks for the admin screens, on the same tokens as the public site. */

export function AdminPage({
  title,
  lede,
  actions,
  children,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 sm:px-8 py-7 flex flex-col gap-6 max-w-[1180px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="serif text-[28px] sm:text-[32px] leading-tight font-extrabold">{title}</h1>
          {lede && <p className="text-[14.5px] text-muted max-w-[680px]">{lede}</p>}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface border border-rule rounded-xl ${className}`}>
      {title && <h2 className="serif text-[18px] font-bold px-5 pt-4">{title}</h2>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <div className="bg-surface border border-rule rounded-xl p-4 flex flex-col gap-1 hover:border-brand transition-colors h-full">
      <span className="text-[12px] font-bold tracking-[1px] text-muted">{label}</span>
      <span className="serif tnum text-[30px] font-extrabold leading-none">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Button({
  children,
  kind = 'primary',
  type = 'submit',
  href,
  small = false,
}: {
  children: React.ReactNode;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'submit' | 'button';
  href?: string;
  small?: boolean;
}) {
  const base = `inline-flex items-center justify-center rounded-lg font-semibold ${small ? 'h-9 px-3.5 text-[13.5px]' : 'h-11 px-5 text-[14.5px]'}`;
  const look = {
    primary: 'bg-brand text-white hover:bg-branddark',
    secondary: 'bg-surface border border-rule hover:border-brand',
    danger: 'bg-[#fbe9ea] text-[#a8323d] border border-[#f0c9cc] hover:bg-[#f6d9dc]',
    ghost: 'text-brand hover:underline',
  }[kind];
  if (href) return <Link href={href} className={`${base} ${look}`}>{children}</Link>;
  return <button type={type} className={`${base} ${look}`}>{children}</button>;
}

export function Field({
  label,
  name,
  defaultValue,
  multiline = false,
  hint,
  badge,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  multiline?: boolean;
  hint?: string;
  badge?: React.ReactNode;
  type?: string;
  required?: boolean;
}) {
  const cls = 'w-full rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-[15px] focus:border-brand outline-none';
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[13.5px] font-semibold">
        {label}
        {badge}
      </span>
      {multiline ? (
        <textarea name={name} defaultValue={defaultValue ?? ''} rows={4} className={cls} required={required} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue ?? ''} className={cls} required={required} />
      )}
      {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const look = {
    neutral: 'bg-sunk text-inksoft',
    good: 'bg-brandsoft text-brand',
    warn: 'bg-warnsoft text-warn',
    bad: 'bg-[#fbe9ea] text-[#a8323d]',
  }[tone];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-bold ${look}`}>{children}</span>;
}

export function Notice({ tone, children }: { tone: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const look = {
    good: 'bg-brandsoft text-branddark border-brand',
    warn: 'bg-warnsoft text-warn border-warn',
    bad: 'bg-[#fbe9ea] text-[#a8323d] border-[#a8323d]',
  }[tone];
  return <div className={`px-4 py-3 rounded-lg border-s-[3px] text-[14px] ${look}`}>{children}</div>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-rule rounded-xl bg-surface">
      <table className="w-full text-[14px] min-w-[640px]">
        <thead>
          <tr className="bg-sunk text-[12px] font-bold text-muted">
            {head.map((h) => <th key={h} className="text-start px-4 py-2.5 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-rulesoft">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-[14.5px] text-muted border-[1.5px] border-dashed border-[#d4cfc1] rounded-xl bg-[#fbfaf6]">
      {children}
    </div>
  );
}

export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }) : '—';
