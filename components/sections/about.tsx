import { Section } from "@/components/ui/section";
import { company } from "@/lib/site";

export function AboutSection() {
  return (
    <Section
      id="about"
      eyebrow="About"
      headline="Independent by design. Ambitious by default."
    >
      <div className="max-w-2xl space-y-5 text-base leading-relaxed text-muted sm:text-lg">
        <p>
          Founded in {company.location.replace(", USA", "")},{" "}
          {company.displayName} is an independent product studio focused on
          building ideas that can scale across teams, leagues, brands, events,
          and communities.
        </p>
        <p>
          We are not a consulting firm. We build, test, protect, and launch our
          own products.
        </p>
      </div>
    </Section>
  );
}
