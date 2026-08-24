/* The hero's upcoming list and the category rails are baked in at
   build; regenerate hourly so they track the daily sync without a
   per-request database round trip or a client fetch per visitor. */
export const revalidate = 3600;

import LandingHero from "@/components/LandingHero/LandingHero";
import CategoryRails from "@/components/Rails/CategoryRails/CategoryRails";
import { categoryRails } from "@/db/queries";

export default async function Home() {
  const rails = await categoryRails();
  return (
    <>
      <LandingHero />
      <CategoryRails rails={rails} />
    </>
  );
}
