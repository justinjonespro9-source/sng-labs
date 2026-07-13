import { ButtonLink } from "@/components/ui/button-link";
import { partnerHref } from "@/lib/site";

function InnovationLabVisual() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[28rem] lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-border bg-surface/40">
        <div className="lab-glow absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(184,212,200,0.18),transparent_68%)] blur-2xl" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="200"
            cy="200"
            r="148"
            className="orbit-ring origin-center"
            style={{ transformOrigin: "200px 200px" }}
            stroke="rgba(242,242,240,0.08)"
            strokeWidth="1"
          />
          <circle
            cx="200"
            cy="200"
            r="104"
            className="orbit-ring-reverse origin-center"
            style={{ transformOrigin: "200px 200px" }}
            stroke="rgba(184,212,200,0.16)"
            strokeWidth="1"
            strokeDasharray="4 10"
          />
          <circle
            cx="200"
            cy="200"
            r="62"
            stroke="rgba(242,242,240,0.12)"
            strokeWidth="1"
          />

          <path
            className="signal-path"
            d="M98 148 C140 120, 180 170, 200 200 C220 230, 260 280, 302 252"
            stroke="rgba(184,212,200,0.55)"
            strokeWidth="1.25"
            fill="none"
          />
          <path
            className="signal-path"
            style={{ animationDelay: "1.2s" }}
            d="M110 268 C150 250, 170 210, 200 200 C240 185, 270 140, 306 128"
            stroke="rgba(168,189,212,0.45)"
            strokeWidth="1.25"
            fill="none"
          />

          <circle cx="200" cy="200" r="7" fill="rgba(242,242,240,0.92)" />
          <circle
            cx="200"
            cy="200"
            r="16"
            className="node-pulse"
            style={{ transformOrigin: "200px 200px" }}
            stroke="rgba(184,212,200,0.55)"
            strokeWidth="1"
            fill="none"
          />

          <g className="orbit-ring" style={{ transformOrigin: "200px 200px" }}>
            <circle cx="200" cy="52" r="4.5" fill="rgba(184,212,200,0.9)" />
            <circle cx="348" cy="200" r="3.5" fill="rgba(242,242,240,0.55)" />
            <circle cx="200" cy="348" r="3.5" fill="rgba(168,189,212,0.7)" />
            <circle cx="52" cy="200" r="3" fill="rgba(242,242,240,0.4)" />
          </g>

          <g
            className="orbit-ring-reverse"
            style={{ transformOrigin: "200px 200px" }}
          >
            <circle cx="274" cy="116" r="3" fill="rgba(184,212,200,0.65)" />
            <circle cx="126" cy="284" r="3" fill="rgba(242,242,240,0.45)" />
          </g>
        </svg>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent px-6 pb-5 pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-strong">
            Innovation Lab
          </p>
          <p className="mt-1 text-sm text-muted">
            Prototyping the next participation systems
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-28 pt-20 sm:px-8 sm:pb-32 sm:pt-28 lg:px-10 lg:pb-40 lg:pt-32"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(184,212,200,0.08),transparent_42%),radial-gradient(ellipse_at_85%_10%,rgba(168,189,212,0.06),transparent_38%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 xl:gap-24">
        <div className="max-w-2xl">
          <p className="animate-fade-up font-display text-sm font-bold tracking-[0.28em] text-foreground sm:text-base">
            SNG LABS
          </p>
          <p className="animate-fade-up-delay-1 mt-10 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            Sports. Technology. Participation.
          </p>
          <h1 className="animate-fade-up-delay-1 mt-6 max-w-[13ch] font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-[4.85rem] lg:leading-[0.98]">
            Building what fan engagement becomes next.
          </h1>
          <p className="animate-fade-up-delay-2 mt-8 max-w-[30ch] text-base leading-relaxed text-muted sm:text-lg">
            SNG Labs creates original platforms at the intersection of sports,
            entertainment, advertising, identity, and verified participation.
          </p>
          <div className="animate-fade-up-delay-3 mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="#products">Explore Our Products</ButtonLink>
            <ButtonLink href={partnerHref} variant="secondary">
              Partner With Us
            </ButtonLink>
          </div>
        </div>

        <div className="animate-fade-up-delay-4">
          <InnovationLabVisual />
        </div>
      </div>
    </section>
  );
}
