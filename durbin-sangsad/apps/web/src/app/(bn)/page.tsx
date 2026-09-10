import Listing from '@/components/Listing';
import { getListing } from '@/lib/data';

/** Listing pages refresh hourly; member pages (Phase 5) every 30 minutes. */
export const revalidate = 3600;

export default async function HomeBn() {
  const data = await getListing();
  return <Listing locale="bn" data={data} />;
}
