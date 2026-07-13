import type { ProductStatus } from "@/lib/site";
import { getProductHref, products } from "@/lib/site";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    Live: "border-accent/35 bg-accent-soft text-accent shadow-[0_0_20px_rgba(184,212,200,0.08)]",
    "Patent Pending":
      "border-border-strong bg-white/[0.035] text-muted-strong",
    "In Development": "border-border bg-transparent text-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${styles[status]}`}
    >
      {status === "Live" ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(184,212,200,0.8)]"
        />
      ) : null}
      {status}
    </span>
  );
}

export function ProductsSection() {
  return (
    <Section id="products" eyebrow="Portfolio" headline="The Portfolio">
      <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        A growing set of platforms built around participation, performance,
        attention, and identity—each advancing one connected innovation strategy
        rather than standing alone.
      </p>

      <ul className="mt-16 grid gap-5 md:grid-cols-2">
        {products.map((product, index) => {
          const href = getProductHref(product);
          const ariaLabel = product.external
            ? `${product.ctaLabel}: ${product.name} (opens in a new tab)`
            : `${product.ctaLabel}: ${product.name}`;

          return (
            <li key={product.id}>
              <Reveal delayMs={index * 60}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface/90 p-7 transition-[border-color,background-color,transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:border-border-strong hover:bg-surface-elevated hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-8">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${product.accent}99, transparent)`,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle, ${product.accent}24, transparent 70%)`,
                    }}
                  />

                  <div className="relative flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                        {product.name}
                      </h3>
                      <p className="mt-3 text-[15px] leading-snug text-muted-strong">
                        {product.tagline}
                      </p>
                    </div>
                    <StatusBadge status={product.status} />
                  </div>

                  <p className="relative mt-7 flex-1 text-[15px] leading-relaxed text-muted">
                    {product.description}
                  </p>

                  <a
                    href={href}
                    className="relative mt-9 inline-flex w-fit items-center gap-3 rounded-md border border-border-strong bg-white/[0.02] px-4 py-3 text-sm font-medium text-foreground transition-[border-color,background-color,gap] duration-300 hover:gap-4 hover:border-foreground/30 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={ariaLabel}
                    {...(product.external
                      ? {
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {})}
                  >
                    {product.ctaLabel}
                    <span aria-hidden="true" className="text-muted-strong">
                      {product.external ? "↗" : "→"}
                    </span>
                  </a>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
