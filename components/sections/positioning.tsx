import { Section } from "@/components/ui/section";
import { pillars } from "@/lib/site";

export function PositioningSection() {
  return (
    <Section
      id="positioning"
      headline="We do not follow categories. We create them."
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
        <div className="space-y-6 text-base leading-relaxed text-muted sm:text-lg">
          <p>
            Every SNG Labs product begins with a simple question: What should
            exist today that does not?
          </p>
          <p>
            We turn that question into scalable platforms designed to create
            stronger connections between fans, teams, brands, communities, and
            emerging markets.
          </p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-8">
          {pillars.map((pillar, index) => (
            <li
              key={pillar.title}
              className="border-t border-border pt-5 transition-colors duration-300 hover:border-accent/35 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                0{index + 1}
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {pillar.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
