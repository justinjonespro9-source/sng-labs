import { AboutSection } from "@/components/sections/about";
import { ContactSection } from "@/components/sections/contact";
import { HeroSection } from "@/components/sections/hero";
import { InnovationLabSection } from "@/components/sections/innovation-lab";
import { InnovationSection } from "@/components/sections/innovation";
import { IntellectualPropertySection } from "@/components/sections/intellectual-property";
import { PartnershipSection } from "@/components/sections/partnership";
import { PositioningSection } from "@/components/sections/positioning";
import { ProductsSection } from "@/components/sections/products";
import { WhyWeBuildSection } from "@/components/sections/why-we-build";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <WhyWeBuildSection />
        <PositioningSection />
        <ProductsSection />
        <InnovationSection />
        <IntellectualPropertySection />
        <PartnershipSection />
        <InnovationLabSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
