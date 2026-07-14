import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  headline: string;
  children: ReactNode;
  className?: string;
  headlineClassName?: string;
};

export function Section({
  id,
  eyebrow,
  headline,
  children,
  className = "",
  headlineClassName = "",
}: SectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 px-6 py-28 sm:px-8 md:scroll-mt-32 lg:px-10 lg:py-36 ${className}`}
    >
      <div className="divider-line mx-auto mb-28 h-px max-w-6xl" aria-hidden="true" />
      <Reveal>
        <div className="mx-auto max-w-6xl">
          {eyebrow ? (
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.85rem] lg:leading-[1.12] ${headlineClassName}`}
          >
            {headline}
          </h2>
          <div className="mt-10">{children}</div>
        </div>
      </Reveal>
    </section>
  );
}
