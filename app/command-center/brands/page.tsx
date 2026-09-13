import { PageHeader } from "@/components/command-center/page-header";
import { brandDefinitions } from "@/lib/command-center/brand-definitions";

export default function BrandsPage() {
  return (
    <div>
      <PageHeader title="Brands" description="The strategic guardrails AI must use before recommending an angle or drafting content." />
      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        {brandDefinitions.map((brand) => (
          <article key={brand.key} className="rounded-2xl border border-white/8 bg-[#101214] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="mb-4 block h-1 w-10 rounded-full" style={{ backgroundColor: brand.accent }} />
                <h2 className="font-display text-xl font-semibold text-white">{brand.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#8f9391]">{brand.description}</p>
              </div>
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#7d817f]">{brand.kind}</span>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-white/7 pt-5 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#707472]">Audience</dt>
                <dd className="mt-2 text-xs leading-5 text-[#b8bcba]">{brand.audience}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#707472]">Voice</dt>
                <dd className="mt-2 text-xs leading-5 text-[#b8bcba]">{brand.voice}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#707472]">Cadence</dt>
                <dd className="mt-2 text-xs leading-5 text-[#b8bcba]">{brand.defaultCadenceNotes}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#707472]">Guardrail</dt>
                <dd className="mt-2 text-xs leading-5 text-[#b8bcba]">{brand.prohibitedContent[0]}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}
