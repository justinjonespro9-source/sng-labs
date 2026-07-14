import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref, siteAssets } from "@/lib/site";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative w-full overflow-hidden bg-background md:h-[clamp(720px,calc(100svh-4.75rem),900px)]"
    >
      {/* Background image — z-0 */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <Image
          src={siteAssets.innovationLabHero}
          alt="SNG Labs Innovation Lab at night: a garage workspace under an aurora-filled sky, with an Innovation Lab sign, warm interior lighting, desk and computer, ping-pong table, pinball machine, trees, and driveway reflections."
          fill
          priority
          sizes="100vw"
          className="object-cover object-[58%_50%] lg:object-center"
        />
      </div>

      {/* Readability gradient — z-10 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[48%] bg-gradient-to-r from-background/70 via-background/30 to-transparent md:block lg:w-[44%] lg:from-background/65 lg:via-background/22"
      />

      {/* Hero content — z-20 */}
      <div className="relative z-20 mx-auto hidden h-full w-full items-center md:flex">
        <div className="w-full max-w-[40rem] pl-[5vw] pr-6 lg:max-w-[41rem] lg:pl-[6vw] xl:pl-[7vw]">
          <HeroCopy size="desktop" />
        </div>
      </div>

      {/* Mobile: stacked copy + scene */}
      <div className="relative z-20 md:hidden">
        <div className="px-6 pb-5 pt-12 sm:px-8">
          <HeroCopy size="mobile" />
        </div>
        <div className="relative z-0 aspect-[16/10] w-full overflow-hidden bg-background sm:aspect-[16/9]">
          <Image
            src={siteAssets.innovationLabHero}
            alt="SNG Labs Innovation Lab at night: a garage workspace under an aurora-filled sky, with an Innovation Lab sign, warm interior lighting, desk and computer, ping-pong table, pinball machine, trees, and driveway reflections."
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_50%]"
          />
        </div>
      </div>
    </section>
  );
}

function HeroCopy({ size }: { size: "desktop" | "mobile" }) {
  const headline =
    size === "desktop"
      ? "font-display font-semibold tracking-tight text-foreground text-[clamp(3.75rem,5.4vw,5.75rem)] leading-[1.02]"
      : "font-display text-[2rem] font-semibold leading-[1.06] tracking-tight text-foreground sm:text-4xl";

  return (
    <>
      <h1 className={`animate-fade-up ${headline}`}>
        <span className="block">Transforming Fans</span>
        <span className="mt-1 block sm:mt-1.5">from Spectators</span>
        <span className="mt-1 block sm:mt-1.5">into Participants.</span>
      </h1>
      <p
        className={`animate-fade-up-delay-1 max-w-[38rem] leading-relaxed text-muted-strong ${
          size === "desktop"
            ? "mt-7 text-lg lg:mt-8 lg:text-xl"
            : "mt-5 text-base sm:mt-6 sm:text-lg"
        }`}
      >
        We create original platforms that give sports fans new ways to compete,
        connect, contribute, and be recognized.
      </p>
      <div
        className={`animate-fade-up-delay-2 flex flex-col gap-3 sm:flex-row sm:items-center ${
          size === "desktop" ? "mt-9 lg:mt-10" : "mt-7 sm:mt-8"
        }`}
      >
        <ButtonLink href="#products">Explore the Portfolio</ButtonLink>
        <ButtonLink href={partnerHref} variant="secondary">
          Partner With Us
        </ButtonLink>
      </div>
    </>
  );
}
