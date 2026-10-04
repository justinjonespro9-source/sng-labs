import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Select, SubmitButton, TextArea } from "@/components/command-center/form-fields";
import { FormNotice } from "@/components/command-center/form-notice";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { manualDestinationGaps } from "@/lib/growth/manual-publication";
import { canEditGrowth } from "@/lib/growth/permissions";
import { confirmManualPublicationAction, prepareManualHandoffAction, verifyDestinationIdentityAction } from "@/lib/growth/server-actions";
import { formatCentralDateTime, toCentralInputValue } from "@/lib/growth/time";
import { prisma } from "@/lib/prisma";

export default async function ManualPublishPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, notice, user] = await Promise.all([params, searchParams, requireCommandCenterUser()]);
  const draft = await prisma.contentDraft.findUnique({ where: { id }, include: { brandAngle: { include: { brand: { include: { socialAccounts: { orderBy: [{ platform: "asc" }, { handle: "asc" }] } } } } }, approvals: { include: { reviewer: true }, orderBy: { createdAt: "desc" } }, publication: { include: { socialAccount: true, recordedBy: true } } } });
  if (!draft) notFound();
  const brand = draft.brandAngle.brand;
  const latestApproval = draft.approvals[0] ?? null;
  const approvalCurrent = latestApproval?.decision === "APPROVED" && ["APPROVED", "READY", "PUBLISHED"].includes(draft.status);
  const destinations = brand.socialAccounts.map((account) => ({ account, gaps: manualDestinationGaps(account, brand.id) }));
  const eligible = destinations.filter((item) => item.gaps.length === 0);
  const unverified = destinations.filter((item) => item.gaps.length > 0 && ["KNOWN", "ACTIVE"].includes(item.account.lifecycleStatus));
  const publication = draft.publication;
  const handoffReady = draft.status === "READY" && publication?.method === "MANUAL" && publication.status === "READY";
  const editable = canEditGrowth(user.role);
  const returnTo = `/command-center/queue/${draft.id}/publish`;

  return <div className="max-w-4xl">
    <Link href="/command-center/queue" className="text-xs text-[#b8d4c8]">← Content Queue</Link>
    <p className="mt-5 text-[10px] uppercase tracking-[.16em] text-[#747976]">{brand.name} · {draft.status.replaceAll("_", " ")}</p>
    <h1 className="mt-2 font-display text-3xl text-white">Manual publishing</h1>
    <p className="mt-2 text-sm text-[#8f9391]">Approved content → verified same-brand destination → handoff → you post externally → record the actual URL and time. The system never posts.</p>
    <FormNotice saved={notice.saved} error={notice.error} />

    <section className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-white/8 bg-[#101214] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-[#747976]">Approval</p><p className={`mt-2 text-sm ${approvalCurrent ? "text-[#87d2ac]" : "text-[#f0bd65]"}`}>{approvalCurrent ? `Approved by ${latestApproval?.reviewer.name ?? latestApproval?.reviewer.email ?? "reviewer"}` : "No current approval"}</p><p className="mt-1 text-xs text-[#747976]">{formatCentralDateTime(latestApproval?.createdAt)}</p></div>
      <div className="rounded-xl border border-white/8 bg-[#101214] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-[#747976]">Handoff</p><p className="mt-2 text-sm text-white">{publication?.status === "PUBLISHED" ? "Published" : handoffReady ? "Prepared — awaiting external post" : publication?.status === "PLANNED" ? "Scheduled (not a manual handoff)" : "Not prepared"}</p><p className="mt-1 text-xs text-[#747976]">{publication?.socialAccount ? `${publication.socialAccount.platform} ${publication.socialAccount.handle ?? ""}` : "No destination"}</p></div>
      <div className="rounded-xl border border-white/8 bg-[#101214] p-4"><p className="text-[10px] uppercase tracking-[.14em] text-[#747976]">Assets</p><p className="mt-2 text-sm text-white">No stored assets</p><p className="mt-1 text-xs text-[#747976]">The visual brief is text and does not prove an image exists.</p></div>
    </section>

    <section className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <h2 className="text-sm font-semibold text-white">Copy to post</h2>
      <textarea readOnly rows={Math.min(12, Math.max(4, draft.body.split("\n").length + 1))} className="mt-3 w-full rounded-lg border border-white/10 bg-[#080a0b] p-3 text-sm leading-6 text-[#d4d7d5]" defaultValue={draft.body} />
      {draft.callToAction && <p className="mt-3 text-xs text-[#8f9391]">CTA: {draft.callToAction}</p>}
      <p className="mt-2 text-xs text-[#747976]">Visual brief (text only): {draft.visualBrief || "None"}</p>
    </section>

    {publication?.status === "PUBLISHED" ? <section className="mt-6 rounded-2xl border border-[#87d2ac]/25 bg-[#87d2ac]/5 p-6">
      <h2 className="text-sm font-semibold text-[#87d2ac]">Publication record</h2>
      <dl className="mt-3 grid gap-2 text-sm text-[#d4d7d5] sm:grid-cols-2">
        <div><dt className="text-xs text-[#747976]">Published</dt><dd>{formatCentralDateTime(publication.publishedAt)}</dd></div>
        <div><dt className="text-xs text-[#747976]">Method</dt><dd>{publication.method ?? "Legacy (unknown)"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-[#747976]">URL</dt><dd>{publication.platformUrl ? <a href={publication.platformUrl} target="_blank" rel="noreferrer" className="break-all text-[#b8d4c8] underline">{publication.platformUrl}</a> : "Not recorded"}</dd></div>
        <div><dt className="text-xs text-[#747976]">Recorded by</dt><dd>{publication.recordedBy?.name ?? publication.recordedBy?.email ?? "—"}</dd></div>
        {publication.confirmationNote && <div className="sm:col-span-2"><dt className="text-xs text-[#747976]">Note</dt><dd>{publication.confirmationNote}</dd></div>}
      </dl>
      <p className="mt-4 text-xs text-[#747976]">Post metrics are recorded as reviewed measurements on Scorecards, never inferred automatically.</p>
    </section> : null}

    {editable && approvalCurrent && publication?.status !== "PUBLISHED" && <section className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <h2 className="text-sm font-semibold text-white">{handoffReady ? "Change destination" : "1. Prepare manual handoff"}</h2>
      {eligible.length ? <form action={prepareManualHandoffAction.bind(null, draft.id)} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Select label="Verified destination" name="socialAccountId" required defaultValue={publication?.socialAccountId ?? ""}><option value="">Select…</option>{eligible.map(({ account }) => <option key={account.id} value={account.id}>{account.platform} {account.handle ?? account.displayName ?? ""}</option>)}</Select>
        <Field label="Planned time (CT, optional)" name="plannedFor" type="datetime-local" defaultValue={toCentralInputValue(draft.scheduledFor)} />
        <div className="self-end"><SubmitButton>{handoffReady ? "Update handoff" : "Prepare handoff"}</SubmitButton></div>
      </form> : <p className="mt-3 text-xs text-[#f0bd65]">No manually verified {brand.name} destination yet. Verify one below.</p>}
    </section>}

    {editable && handoffReady && <section className="mt-6 rounded-2xl border border-[#b8d4c8]/25 bg-[#101214] p-6">
      <h2 className="text-sm font-semibold text-white">2. Record the actual publication</h2>
      <p className="mt-1 text-xs text-[#747976]">Only after you have posted on {publication?.socialAccount.platform}. The URL must be the specific post on that platform; the time cannot be in the future.</p>
      <form action={confirmManualPublicationAction.bind(null, draft.id)} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Published post URL (https)" name="platformUrl" type="url" required placeholder="https://…" /></div>
        <Field label="Published at (CT)" name="publishedAt" type="datetime-local" required />
        <Field label="Platform post ID (optional)" name="platformPostId" />
        <div className="sm:col-span-2"><TextArea label="Confirmation note (optional)" name="confirmationNote" rows={2} /></div>
        <div><SubmitButton>Mark as published</SubmitButton></div>
      </form>
    </section>}

    {editable && unverified.length > 0 && publication?.status !== "PUBLISHED" && <section className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <h2 className="text-sm font-semibold text-white">Verify a destination manually</h2>
      <p className="mt-1 text-xs text-[#747976]">Confirms identity for manual posting only. It does not authorize API access or change anything on the platform.</p>
      <div className="mt-4 space-y-4">{unverified.map(({ account, gaps }) => <details key={account.id} className="rounded-xl border border-white/8 p-4">
        <summary className="cursor-pointer text-xs text-[#b8d4c8]">{account.platform} {account.handle ?? account.displayName ?? "(no handle)"} — {gaps.join("; ")}</summary>
        <form action={verifyDestinationIdentityAction.bind(null, account.id)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Field label="Verified profile URL (https)" name="profileUrl" type="url" defaultValue={account.profileUrl ?? ""} />
          <Field label="Verified handle" name="handle" defaultValue={account.handle ?? ""} />
          <div className="sm:col-span-2"><Field label="How was it verified?" name="verificationSource" required placeholder="e.g. Logged in as owner and confirmed profile URL" /></div>
          <Field label="Verified at (CT)" name="verifiedAt" type="datetime-local" />
          <div className="self-end"><SubmitButton>Record manual verification</SubmitButton></div>
        </form>
      </details>)}</div>
    </section>}

    {!editable && <p className="mt-6 text-xs text-[#747976]">Viewer access is read-only.</p>}
  </div>;
}
