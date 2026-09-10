import Link from 'next/link';
import Shell from '@/components/Shell';

export default function NotFound() {
  return (
    <Shell locale="bn" path="/">
      <div className="mx-auto max-w-[720px] px-5 py-20 flex flex-col gap-3 text-center">
        <h1 className="display text-[32px]">পাতাটি পাওয়া যায়নি</h1>
        <p className="text-inksoft">Page not found.</p>
        <Link href="/" className="text-accent font-semibold hover:underline">সংসদের আসনে ফিরে যান →</Link>
      </div>
    </Shell>
  );
}
