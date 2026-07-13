import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { siteAssets } from "@/lib/site";

export function InnovationLabSection() {
  return (
    <section
      id="innovation-lab"
      className="scroll-mt-24 px-6 py-28 sm:px-8 lg:px-10 lg:py-36"
      aria-labelledby="innovation-lab-caption"
    >
      <div className="divider-line mx-auto mb-28 h-px max-w-6xl" aria-hidden="true" />
      <Reveal>
        <figure className="mx-auto max-w-3xl lg:max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <Image
              src={siteAssets.innovationLab}
              alt="A cinematic black and white photo of a Boxer dog lying in front of a garage at night, with a glowing INNOVATION LAB sign and a shooting star in a starry sky."
              width={682}
              height={1024}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 768px, 896px"
              className="h-auto w-full object-contain"
              priority={false}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background/70 via-background/20 to-transparent"
            />
          </div>
          <figcaption
            id="innovation-lab-caption"
            className="mt-6 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]"
          >
            Built from the lab. Designed for what comes next.
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
