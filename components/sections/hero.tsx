import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref, siteAssets } from "@/lib/site";

function InnovationLabVisual() {
  return (
    <figure className="relative w-full">
      <Image
        src={siteAssets.innovationLab}
        alt="SNG Labs Innovation Lab at night: an open garage workspace under an aurora-lit sky, with a glowing Innovation Lab sign, warm interior light, desk and computer, ping pong table, and pinball machine."
        width={1024}
        height={682}
        sizes="(max-width: 1024px) 92vw, 48vw"
        priority
        className="h-auto w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background via-background/40 to-transparent"
      />
    </figure>
  );
}

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-28 pt-20 sm:px-8 sm:pb-32 sm:pt-28 lg:px-10 lg:pb-40 lg:pt-32"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(184,212,200,0.05),transparent_42%),radial-gradient(ellipse_at_90%_20%,rgba(168,189,212,0.04),transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12 xl:gap-16">
        <div className="max-w-2xl">
          <p className="animate-fade-up font-display text-sm font-semibold tracking-[0.28em] text-foreground sm:text-base">
            SNG LABS
          </p>
          <h1 className="animate-fade-up-delay-1 mt-14 max-w-[14ch] font-display text-5xl font-semibold tracking-tight text-foreground sm:mt-16 sm:max-w-none sm:text-6xl lg:mt-[4.5rem] lg:text-[4.75rem] lg:leading-[1.02]">
            <span className="block">Transforming Fans</span>
            <span className="mt-1 block sm:mt-1.5">from Spectators</span>
            <span className="mt-1 block sm:mt-1.5">into Participants.</span>
          </h1>
          <p className="animate-fade-up-delay-2 mt-10 max-w-[26ch] text-base leading-relaxed text-muted sm:mt-12 sm:max-w-[28ch] sm:text-lg">
            We create original platforms that give sports fans new ways to
            compete, connect, contribute, and be recognized.
          </p>
          <div className="animate-fade-up-delay-3 mt-12 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-14">
            <ButtonLink href="#products">Explore Our Products</ButtonLink>
            <ButtonLink href={partnerHref} variant="secondary">
              Partner With Us
            </ButtonLink>
          </div>
        </div>

        <div className="animate-fade-up-delay-4 w-full min-w-0 lg:pl-2">
          <InnovationLabVisual />
        </div>
      </div>
    </section>
  );
}
