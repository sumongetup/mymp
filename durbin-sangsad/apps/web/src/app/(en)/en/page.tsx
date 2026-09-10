import Listing from '@/components/Listing';
import { getListing } from '@/lib/data';

export const revalidate = 3600;

export default async function HomeEn() {
  const data = await getListing();
  return <Listing locale="en" data={data} />;
}
