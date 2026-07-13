import { Section } from "@/components/ui/section";
import { ipPoints } from "@/lib/site";

export function IntellectualPropertySection() {
  return (
    <Section
      id="ip"
      eyebrow="Intellectual Property"
      headline="Innovation is the product."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
        <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          SNG Labs develops original concepts, proprietary mechanics, and
          patent-pending systems across sports, advertising, fantasy
          competition, promotions, and digital engagement.
        </p>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {ipPoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 border-b border-border pb-3 text-sm text-muted-strong last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
