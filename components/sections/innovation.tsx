import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { innovationCategories } from "@/lib/site";

export function InnovationSection() {
  return (
    <Section
      id="innovation"
      eyebrow="Thesis"
      headline="One portfolio. A connected innovation thesis."
    >
      <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        Each platform advances a shared set of verification and identity
        primitives—so the portfolio compounds as one company strategy, not a
        collection of unrelated apps.
      </p>

      <div className="relative mt-16">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox="0 0 1000 520"
          preserveAspectRatio="none"
        >
          <path
            className="signal-path"
            d="M250 130 C250 130, 500 130, 750 130"
            stroke="rgba(184,212,200,0.28)"
            strokeWidth="1.25"
            fill="none"
          />
          <path
            className="signal-path"
            style={{ animationDelay: "0.9s" }}
            d="M250 390 C250 390, 500 390, 750 390"
            stroke="rgba(184,212,200,0.22)"
            strokeWidth="1.25"
            fill="none"
          />
          <path
            className="signal-path"
            style={{ animationDelay: "1.6s" }}
            d="M250 130 C250 130, 250 390, 250 390"
            stroke="rgba(242,242,240,0.14)"
            strokeWidth="1.25"
            fill="none"
          />
          <path
            className="signal-path"
            style={{ animationDelay: "2.1s" }}
            d="M750 130 C750 130, 750 390, 750 390"
            stroke="rgba(242,242,240,0.14)"
            strokeWidth="1.25"
            fill="none"
          />
          <circle cx="500" cy="260" r="5" fill="rgba(184,212,200,0.85)" />
          <circle
            cx="500"
            cy="260"
            r="18"
            className="node-pulse"
            style={{ transformOrigin: "500px 260px" }}
            stroke="rgba(184,212,200,0.35)"
            fill="none"
          />
        </svg>

        <ul className="relative grid gap-5 sm:grid-cols-2">
          {innovationCategories.map((category, index) => (
            <li key={category.title}>
              <Reveal delayMs={index * 80}>
                <article className="group relative h-full rounded-2xl border border-border bg-surface/70 p-7 transition-[border-color,background-color,transform] duration-500 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-elevated sm:p-8">
                  <div className="flex items-center gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-background font-mono text-[11px] text-accent transition-colors duration-300 group-hover:border-accent/40"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                      {category.title}
                    </h3>
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed text-muted">
                    {category.description}
                  </p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
