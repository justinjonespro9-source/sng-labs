import { notFound } from "next/navigation";
import { PageHeader } from "@/components/command-center/page-header";
import { scaffoldSections } from "@/lib/command-center/navigation";

export function generateStaticParams() {
  return scaffoldSections.map(({ key }) => ({ section: key }));
}

export default async function CommandCenterSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = scaffoldSections.find((item) => item.key === section);
  if (!page) notFound();

  return (
    <div>
      <PageHeader title={page.label} description="This workspace is reserved in the foundation architecture and will be activated in its implementation phase." />
      <section className="mt-8 rounded-2xl border border-dashed border-white/10 bg-[#101214] px-6 py-20 text-center">
        <p className="text-sm font-medium text-[#c7cac8]">Foundation ready</p>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#727674]">
          Authentication, authorization, navigation, and the underlying data model are in place. No autonomous publishing or engagement action is enabled.
        </p>
      </section>
    </div>
  );
}
