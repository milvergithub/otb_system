import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { LogosStrip } from "@/components/sections/logos-strip";
import { ValueProps } from "@/components/sections/value-props";
import { Coverage } from "@/components/sections/coverage";
import { TechFeature } from "@/components/sections/tech-feature";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Partnership } from "@/components/sections/partnership";
import { FAQ } from "@/components/sections/faq";
import { FinalCTA } from "@/components/sections/final-cta";

export default function Home() {
  return (
    <>
      <Hero />
      <StatsBar />
      <LogosStrip />
      <ValueProps />
      <Coverage />
      <TechFeature />
      <ServicesGrid />
      <Partnership />
      <FAQ />
      <FinalCTA />
    </>
  );
}
