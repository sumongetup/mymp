import Link from 'next/link';
import Icon from '@/components/Icon';

/** Building blocks for the admin screens, on the same tokens as the public site. */

export function AdminPage({
  title,
  lede,
  actions,
  crumbs,
  children,
}: {
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  crumbs?: { href?: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-5 sm:gap-6 max-w-[1180px]">
      <div className="flex flex-col gap-3">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="পথ" className="flex flex-wrap gap-1.5 text-[13px] text-muted">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex gap-1.5">
                {c.href ? <Link href={c.href} className="hover:text-brand">{c.label}</Link> : <span className="text-ink">{c.label}</span>}
                {i < crumbs.length - 1 && <span aria-hidden="true">›</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h1 className="display text-[24px] sm:text-[30px] leading-tight wrap-anywhere">{title}</h1>
            {lede && <p className="text-[14px] sm:text-[14.5px] text-muted max-w-[680px] leading-relaxed">{lede}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = '',
  flush = false,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No inner padding, for tables and lists that draw their own edges. */
  flush?: boolean;
}) {
  return (
    <section className={`bg-surface border border-rule rounded-card shadow-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-1">
          {title && <h2 className="display text-[16.5px]">{title}</h2>}
          {action && <div className="text-[13.5px] font-semibold text-brand">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'px-4 sm:px-5 pb-4 sm:pb-5 pt-3'}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  href,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  href?: string;
  hint?: string;
  icon?: string;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const iconLook = { neutral: 'bg-sunk text-inksoft', good: 'bg-brandsoft text-brand', warn: 'bg-warnsoft text-warn' }[tone];
  const body = (
    <div className="bg-surface border border-rule rounded-card shadow-card p-4 flex items-start gap-3.5 hover:border-brand hover:shadow-lift transition-all h-full">
      {icon && (
        <span className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${iconLook}`}>
          <Icon name={icon} size={19} />
        </span>
      )}
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[12px] font-semibold text-muted truncate">{label}</span>
        <span className="display tnum text-[26px] leading-none">{value}</span>
        {hint && <span className="text-[12px] text-muted mt-1 truncate">{hint}</span>}
      </span>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Button({
  children,
  kind = 'primary',
  type = 'submit',
  href,
  small = false,
  icon,
}: {
  children: React.ReactNode;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'submit' | 'button';
  href?: string;
  small?: boolean;
  icon?: string;
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${small ? 'h-9 px-3.5 text-[13.5px]' : 'h-11 px-5 text-[14.5px]'}`;
  const look = {
    primary: 'bg-brand text-white hover:bg-branddark shadow-card',
    secondary: 'bg-surface border border-rule hover:border-brand hover:text-brand',
    danger: 'bg-dangersoft text-danger border border-[#f0c9cc] hover:bg-[#f6d9dc]',
    ghost: 'text-brand hover:bg-brandsoft',
  }[kind];
  const inner = <>{icon && <Icon name={icon} size={16} />}{children}</>;
  if (href) return <Link href={href} className={`${base} ${look}`}>{inner}</Link>;
  return <button type={type} className={`${base} ${look}`}>{inner}</button>;
}

export const inputClass =
  'w-full rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-[15px] outline-none transition-shadow focus:border-brand focus:ring-4 focus:ring-brandring';

export function Field({
  label,
  name,
  defaultValue,
  multiline = false,
  hint,
  badge,
  type = 'text',
  required = false,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  multiline?: boolean;
  hint?: string;
  badge?: React.ReactNode;
  type?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[13.5px] font-semibold">
        {label}
        {badge}
      </span>
      {multiline ? (
        <textarea name={name} defaultValue={defaultValue ?? ''} rows={rows} className={inputClass} required={required} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue ?? ''} className={inputClass} required={required} />
      )}
      {hint && <span className="text-[12.5px] text-muted leading-relaxed">{hint}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const look = {
    neutral: 'bg-sunk text-inksoft',
    good: 'bg-brandsoft text-brand',
    warn: 'bg-warnsoft text-warn',
    bad: 'bg-dangersoft text-danger',
  }[tone];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-bold whitespace-nowrap ${look}`}>{children}</span>;
}

export function Notice({ tone, children }: { tone: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const look = {
    good: 'bg-brandsoft text-branddark border-brand',
    warn: 'bg-warnsoft text-warn border-warn',
    bad: 'bg-dangersoft text-danger border-danger',
  }[tone];
  const icon = { good: 'check', warn: 'info', bad: 'info' }[tone];
  return (
    <div className={`px-4 py-3 rounded-lg border-s-[3px] text-[14px] leading-relaxed flex gap-2.5 ${look}`}>
      <Icon name={icon} size={17} className="mt-[3px]" />
      <span>{children}</span>
    </div>
  );
}

export function Table({ head, children, minWidth = 640 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto border border-rule rounded-card bg-surface shadow-card">
      <table className="w-full text-[14px]" style={{ minWidth }}>
        <thead>
          <tr className="bg-sunk/70 text-[12px] font-bold text-muted">
            {head.map((h, i) => <th key={`${h}-${i}`} className="text-start px-4 py-2.5 font-bold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-rulesoft [&>tr:hover]:bg-paper/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-[14.5px] text-muted border-[1.5px] border-dashed border-rule rounded-card bg-surface/60">
      {children}
    </div>
  );
}

export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }) : 'নেই';
