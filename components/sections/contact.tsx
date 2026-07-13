import { ButtonLink } from "@/components/ui/button-link";
import { Section } from "@/components/ui/section";
import { company, contactMailto } from "@/lib/site";

export function ContactSection() {
  return (
    <Section
      id="contact"
      eyebrow="Contact"
      headline="Let’s build what comes next."
    >
      <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        For partnerships, investment, licensing, media, or product discussions,
        connect with {company.displayName}.
      </p>
      <p className="mt-4 text-sm text-muted-strong">
        {company.location} ·{" "}
        <a
          href={contactMailto}
          className="text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {company.email}
        </a>
      </p>
      <div className="mt-10">
        <ButtonLink
          href={contactMailto}
          aria-label={`Email ${company.displayName} at ${company.email}`}
        >
          Contact SNG Labs
        </ButtonLink>
      </div>
    </Section>
  );
}
