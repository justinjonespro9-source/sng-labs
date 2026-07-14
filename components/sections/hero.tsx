import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref, siteAssets } from "@/lib/site";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-end overflow-hidden md:min-h-[calc(100svh-4.75rem)] md:items-center"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src={siteAssets.innovationLabHero}
          alt="SNG Labs Innovation Lab at night: an open garage workspace under an aurora-filled sky, with a glowing Innovation Lab sign, warm interior lighting, desk and computer, ping-pong table, and pinball machine."
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_42%] sm:object-[72%_40%] md:object-[78%_45%] lg:object-[82%_48%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/15 sm:via-background/80 sm:to-background/10 lg:via-background/72 lg:to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent sm:via-background/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent md:h-36"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl px-6 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="animate-fade-up max-w-[14ch] font-display text-4xl font-semibold tracking-tight text-foreground sm:max-w-none sm:text-5xl md:text-6xl lg:text-[4.5rem] lg:leading-[1.02]">
            <span className="block">Transforming Fans</span>
            <span className="mt-1 block sm:mt-1.5">from Spectators</span>
            <span className="mt-1 block sm:mt-1.5">into Participants.</span>
          </h1>
          <p className="animate-fade-up-delay-1 mt-8 max-w-[28ch] text-base leading-relaxed text-muted-strong sm:mt-10 sm:max-w-[30ch] sm:text-lg">
            We create original platforms that give sports fans new ways to
            compete, connect, contribute, and be recognized.
          </p>
          <div className="animate-fade-up-delay-2 mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:items-center">
            <ButtonLink href="#products">Explore the Portfolio</ButtonLink>
            <ButtonLink href={partnerHref} variant="secondary">
              Partner With Us
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
