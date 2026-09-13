import type { Metadata } from "next";
import { CommandCenterSidebar } from "@/components/command-center/sidebar";
import { requireCommandCenterUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "SNG Command Center", template: "%s | SNG Command Center" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function CommandCenterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCommandCenterUser();

  return (
    <div className="min-h-screen bg-[#070809] text-[#f2f2f0]">
      <CommandCenterSidebar user={user} />
      <main className="lg:pl-72">
        <div className="mx-auto min-h-screen max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
