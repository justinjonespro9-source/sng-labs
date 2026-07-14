import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref, siteAssets } from "@/lib/site";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative bg-background px-6 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-14 md:pb-24 md:pt-16 lg:px-10 lg:pb-28 lg:pt-20"
    >
      {/* Mobile: copy above the scene, tight gap */}
      <div className="relative z-10 mx-auto mb-5 max-w-[1280px] md:hidden">
        <HeroCopy />
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] lg:max-w-[1280px]">
        <div className="relative overflow-hidden bg-background">
          <Image
            src={siteAssets.innovationLabHero}
            alt="SNG Labs Innovation Lab at night: an open garage workspace under an aurora-filled sky, with a glowing Innovation Lab sign, warm interior lighting, desk and computer, ping-pong table, pinball machine, and driveway reflections."
            width={1920}
            height={1080}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1180px, 1280px"
            className="mx-auto h-auto max-h-[320px] w-full object-contain object-center sm:max-h-[360px] md:max-h-[min(560px,76vh)] lg:max-h-[min(680px,76vh)]"
          />

          {/* Soft overlays — desktop/tablet only */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden md:block"
          >
            <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-background/80 via-background/45 to-transparent lg:w-[42%] lg:from-background/72 lg:via-background/35" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/45 to-transparent lg:h-20" />
          </div>

          {/* Desktop / tablet: live copy over left sky */}
          <div className="pointer-events-none absolute inset-0 hidden items-center md:flex">
            <div className="pointer-events-auto w-full px-6 sm:px-8 lg:px-10">
              <div className="max-w-[17rem] lg:max-w-[20rem] xl:max-w-[22rem]">
                <HeroCopy />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCopy() {
  return (
    <>
      <h1 className="animate-fade-up font-display text-[2rem] font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.35rem] md:leading-[1.06] lg:text-[2.85rem] xl:text-[3.15rem] xl:leading-[1.04]">
        <span className="block">Transforming Fans</span>
        <span className="mt-1 block sm:mt-1.5">from Spectators</span>
        <span className="mt-1 block sm:mt-1.5">into Participants.</span>
      </h1>
      <p className="animate-fade-up-delay-1 mt-5 max-w-[28ch] text-base leading-relaxed text-muted-strong sm:mt-6 sm:text-lg md:mt-6 md:max-w-[24ch] md:text-[0.95rem] lg:text-base">
        We create original platforms that give sports fans new ways to compete,
        connect, contribute, and be recognized.
      </p>
      <div className="animate-fade-up-delay-2 mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center md:mt-8">
        <ButtonLink href="#products">Explore the Portfolio</ButtonLink>
        <ButtonLink href={partnerHref} variant="secondary">
          Partner With Us
        </ButtonLink>
      </div>
    </>
  );
}
