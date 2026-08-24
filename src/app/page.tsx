/* The hero's upcoming list and the category rails are baked in at
   build; regenerate hourly so they track the daily sync without a
   per-request database round trip or a client fetch per visitor. */
export const revalidate = 3600;

import LandingHero from "@/components/LandingHero/LandingHero";
import CategoryRails from "@/components/Rails/CategoryRails/CategoryRails";
import { categoryRails } from "@/db/queries";

export default async function Home() {
  // The rails are below-the-fold garnish: a failed query logs and
  // collapses the stack (the client fetch this replaced degraded the
  // same way) rather than taking the hero down with it.
  let rails: Awaited<ReturnType<typeof categoryRails>> = [];
  try {
    rails = await categoryRails();
  } catch (error) {
    console.error("category rails query failed", error);
  }
  return (
    <>
      <LandingHero />
      <CategoryRails rails={rails} />
    </>
  );
}
