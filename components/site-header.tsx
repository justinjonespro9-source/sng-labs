"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { LogoMark } from "@/components/logo-mark";
import { navLinks, partnerHref } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.slice(1));
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );

        if (visible[0]?.target.id) {
          setActiveHref(`#${visible[0].target.id}`);
        }
      },
      {
        rootMargin: "-28% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300 ${
        scrolled || open
          ? "border-border bg-background/75 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl"
          : "border-transparent bg-background/30 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex min-h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-8 md:min-h-[4.75rem] md:py-3.5 lg:px-10">
        <a
          href="#top"
          className="shrink-0 text-foreground transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="SNG Labs home"
        >
          <LogoMark variant="header" priority />
        </a>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {navLinks.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={`relative rounded-md px-3.5 py-2 text-sm leading-none transition-colors duration-300 after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform after:duration-300 after:ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive
                    ? "text-foreground after:scale-x-100 after:bg-accent"
                    : "text-muted-strong after:scale-x-0 after:bg-foreground/45 hover:text-foreground hover:after:scale-x-100"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <ButtonLink
            href={partnerHref}
            variant="premium"
            className="px-4 py-2.5 text-[11px] uppercase tracking-[0.14em]"
          >
            Partner With Us
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition-[border-color,background-color] duration-300 hover:border-border-strong hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-3.5 w-4" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-px w-full bg-current transition-opacity duration-300 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-px w-full bg-current transition-transform duration-300 ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`border-t border-border bg-background/95 backdrop-blur-xl md:hidden ${
          open ? "block" : "hidden"
        }`}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 sm:px-8"
          aria-label="Mobile"
        >
          {navLinks.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={`rounded-md px-3 py-3 text-base transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-white/[0.04] text-foreground"
                    : "text-muted-strong hover:bg-white/[0.03] hover:text-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <div className="mt-3 border-t border-border pt-4">
            <ButtonLink
              href={partnerHref}
              variant="premium"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Partner With Us
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
