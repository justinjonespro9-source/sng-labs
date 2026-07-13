import { LogoMark } from "@/components/logo-mark";
import { company, navLinks } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 pb-16 pt-20 sm:px-8 sm:pt-24 lg:px-10 lg:pb-20 lg:pt-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <a
              href="#top"
              className="inline-flex text-foreground transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="SNG Labs home"
            >
              <LogoMark height={32} />
            </a>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {company.tagline}
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-4" aria-label="Footer">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-strong transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="divider-line h-px w-full" aria-hidden="true" />

        <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {company.legalName}. All rights reserved.</p>
          <p>{company.location}</p>
        </div>
      </div>
    </footer>
  );
}
