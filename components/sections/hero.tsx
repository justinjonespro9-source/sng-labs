import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref, siteAssets } from "@/lib/site";

export function HeroSection() {
  return (
    <section id="top" className="relative bg-background">
      {/* Mobile: copy above the scene */}
      <div className="relative z-10 px-6 pb-8 pt-14 sm:px-8 md:hidden">
        <HeroCopy />
      </div>

      {/* Scene frame — aspect-driven, capped so tall viewports don't force a zoom crop */}
      <div className="relative w-full bg-background">
        <div className="relative mx-auto w-full overflow-hidden bg-background">
          <Image
            src={siteAssets.innovationLabHero}
            alt="SNG Labs Innovation Lab at night: an open garage workspace under an aurora-filled sky, with a glowing Innovation Lab sign, warm interior lighting, desk and computer, ping-pong table, pinball machine, and driveway reflections."
            width={1920}
            height={1080}
            priority
            sizes="100vw"
            className="mx-auto h-auto w-full max-h-[calc(100svh-4.75rem)] object-contain object-center"
          />

          {/* Soft overlays — stronger on the left for copy, light overall */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden md:block"
          >
            <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-background/80 via-background/45 to-transparent lg:w-[42%] lg:from-background/72 lg:via-background/35" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/50 to-transparent lg:h-28" />
          </div>

          {/* Desktop / tablet: live copy over left sky */}
          <div className="pointer-events-none absolute inset-0 hidden items-center md:flex">
            <div className="pointer-events-auto mx-auto w-full max-w-6xl px-8 lg:px-10">
              <div className="max-w-[18.5rem] lg:max-w-[21rem] xl:max-w-[23rem]">
                <HeroCopy />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom fade under the contained scene */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent md:hidden"
        />
      </div>
    </section>
  );
}

function HeroCopy() {
  return (
    <>
      <h1 className="animate-fade-up font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-[2.85rem] md:leading-[1.05] lg:text-[3.35rem] xl:text-[3.75rem] xl:leading-[1.02]">
        <span className="block">Transforming Fans</span>
        <span className="mt-1 block sm:mt-1.5">from Spectators</span>
        <span className="mt-1 block sm:mt-1.5">into Participants.</span>
      </h1>
      <p className="animate-fade-up-delay-1 mt-7 max-w-[28ch] text-base leading-relaxed text-muted-strong sm:mt-8 sm:text-lg md:mt-8 md:max-w-[26ch] md:text-[0.98rem] lg:text-base">
        We create original platforms that give sports fans new ways to compete,
        connect, contribute, and be recognized.
      </p>
      <div className="animate-fade-up-delay-2 mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center md:mt-10">
        <ButtonLink href="#products">Explore the Portfolio</ButtonLink>
        <ButtonLink href={partnerHref} variant="secondary">
          Partner With Us
        </ButtonLink>
      </div>
    </>
  );
}
