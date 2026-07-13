import { ButtonLink } from "@/components/ui/button-link";
import { Section } from "@/components/ui/section";
import { contactMailto } from "@/lib/site";

export function PartnershipSection() {
  return (
    <Section
      id="partnership"
      eyebrow="Partnerships"
      headline="Built to partner across the sports and entertainment ecosystem."
    >
      <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        We are exploring partnerships with teams, leagues, media companies,
        brands, collectibles platforms, prediction markets, sportsbooks,
        investors, and technology partners.
      </p>
      <div className="mt-10">
        <ButtonLink
          href={contactMailto}
          aria-label="Start a conversation with SNG Labs by email"
        >
          Start a Conversation
        </ButtonLink>
      </div>
    </Section>
  );
}
