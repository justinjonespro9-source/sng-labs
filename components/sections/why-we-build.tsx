import { Section } from "@/components/ui/section";

export function WhyWeBuildSection() {
  return (
    <Section id="why-we-build" eyebrow="Philosophy" headline="Why We Build">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
        <div className="space-y-6 text-xl leading-snug tracking-tight text-foreground sm:text-2xl lg:text-[1.75rem] lg:leading-[1.25]">
          <p>Technology evolves quickly.</p>
          <p className="text-muted-strong">Meaningful participation has not.</p>
        </div>

        <div className="space-y-6 text-base leading-relaxed text-muted sm:text-lg">
          <p>
            At SNG Labs, we build platforms that create stronger relationships
            between fans, teams, brands and communities through original
            mechanics, verified engagement and entirely new forms of
            interaction.
          </p>
          <p>
            The goal isn&apos;t incremental improvement.
          </p>
          <p className="text-muted-strong">
            It&apos;s creating categories that did not previously exist.
          </p>
        </div>
      </div>
    </Section>
  );
}
