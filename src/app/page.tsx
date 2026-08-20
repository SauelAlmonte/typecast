/* The hero's upcoming list is baked in at build; regenerate hourly so
   it tracks the daily sync without a per-request database round trip. */
export const revalidate = 3600;

import LandingHero from "@/components/LandingHero/LandingHero";
import CategoryRails from "@/components/Rails/CategoryRails/CategoryRails";

export default function Home() {
  return (
    <>
      <LandingHero />
      <CategoryRails />
    </>
  );
}
