import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LogoMark } from "@/components/logo-mark";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export const metadata: Metadata = {
  title: "Sign in | SNG Command Center",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user && isAllowedEmail(session.user.email)) redirect("/command-center");

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/command-center" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070809] px-6 py-16">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101214] p-8 shadow-2xl sm:p-10">
        <LogoMark variant="header" priority />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-[#b8d4c8]">
          Private workspace
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
          Marketing Command Center
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#9a9a96]">
          Access is limited to approved SNG LABS accounts. Sign in with your authorized Google account.
        </p>
        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl bg-[#b8d4c8] px-5 py-3 text-sm font-semibold text-[#07100d] transition hover:bg-[#c9e3d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8d4c8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101214]"
          >
            Continue with Google
          </button>
        </form>
        <Link className="mt-6 block text-center text-xs text-[#777b78] hover:text-white" href="/">
          Return to SNGLabs.com
        </Link>
      </section>
    </main>
  );
}
