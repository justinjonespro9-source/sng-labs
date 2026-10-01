"use client";

import { useActionState } from "react";
import { initialFormActionState, submittedList, submittedText, type FormActionState } from "@/lib/growth/form-state";
import { calendarDayKey } from "@/lib/growth/time";
import { CheckboxGroup, Field, Select, SubmitButton, TextArea } from "./form-fields";

const objectiveTypes = ["USER_ACQUISITION", "PARTICIPATION", "RETENTION", "BRAND_AWARENESS", "CREATOR_ACTIVATION", "MEDIA_EARNED", "PARTNERSHIP", "INDUSTRY_OUTREACH", "PRODUCT_VALIDATION", "OTHER"];
type CampaignValue = { name: string; programId: string | null; description: string | null; objective: string | null; objectiveType: string; primaryAudience: string | null; primaryCta: string | null; coreMessage: string | null; sport: string | null; season: string | null; notes: string | null; successDefinition: string | null; kpis: string[]; startsAt: Date | null; endsAt: Date | null; status: string; brands: { id: string }[]; markets: { id: string }[]; teams: { id: string }[]; ownerId: string | null; offer: string | null; hypothesis: string | null; destinationUrl: string | null; executionPlan: string | null; expectedMinutes: number | null; plannedSpendMinor: number | null; actualSpendMinor: number | null; currency: string | null };

function money(minor: number | null | undefined) {
  return minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);
}

export function CampaignForm({ action, programs, brands, markets, teams, users, campaign, initialError }: { action: (state: FormActionState, formData: FormData) => Promise<FormActionState>; programs: { id: string; name: string }[]; brands: { id: string; name: string }[]; markets: { id: string; name: string }[]; teams: { id: string; name: string }[]; users: { id: string; name: string | null; email: string | null }[]; campaign?: CampaignValue; initialError?: string }) {
  const [state, formAction, pending] = useActionState(action, { ...initialFormActionState, error: initialError ?? null });
  const text = (name: string, stored: string | null | undefined) => submittedText(state.values, name) ?? stored ?? "";
  const list = (name: string, stored: { id: string }[] | undefined) => submittedList(state.values, name) ?? stored?.map((item) => item.id);

  return <form key={state.attempt} action={formAction} className="space-y-5 rounded-2xl border border-white/8 bg-[#101214] p-6">
    {state.error && <div role="alert" className="rounded-xl border border-[#ec7f72]/30 bg-[#ec7f72]/8 px-4 py-3 text-sm text-[#f0a49a]">{state.error}<span className="mt-1 block text-xs text-[#c98d85]">Your entries are preserved below. Nothing was saved.</span></div>}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Campaign name" name="name" required defaultValue={text("name", campaign?.name)} /><Select label="Growth program" name="programId" defaultValue={text("programId", campaign?.programId)}><option value="">Unassigned</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select></div>
    <TextArea label="Business / growth objective" name="objective" rows={3} defaultValue={text("objective", campaign?.objective)} />
    <div className="grid gap-4 sm:grid-cols-3"><Select label="Objective type" name="objectiveType" defaultValue={text("objectiveType", campaign?.objectiveType ?? "OTHER")}>{objectiveTypes.map((type) => <option key={type}>{type}</option>)}</Select><Select label="Status" name="status" defaultValue={text("status", campaign?.status ?? "PLANNING")}>{["PLANNING","ACTIVE","PAUSED","COMPLETE","ARCHIVED"].map((status) => <option key={status}>{status}</option>)}</Select><Select label="Owner" name="ownerId" defaultValue={text("ownerId", campaign?.ownerId)}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</Select></div>
    <p className="rounded-lg border border-white/8 bg-[#080a0b] px-3 py-2 text-xs text-[#8f9391]">ACTIVE requires: owner, brand, objective, audience, offer, hypothesis, CTA, destination URL or non-web execution plan, start and deadline, and at least one numeric target. Create as PLANNING, add targets on the campaign page, then activate.</p>
    <div className="grid gap-4 sm:grid-cols-2"><TextArea label="Primary audience" name="primaryAudience" rows={2} defaultValue={text("primaryAudience", campaign?.primaryAudience)} /><TextArea label="Core message / positioning" name="coreMessage" rows={2} defaultValue={text("coreMessage", campaign?.coreMessage)} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><TextArea label="Offer (what the participant gets)" name="offer" rows={2} defaultValue={text("offer", campaign?.offer)} /><TextArea label="Hypothesis (what we expect and why)" name="hypothesis" rows={2} defaultValue={text("hypothesis", campaign?.hypothesis)} /></div>
    <Field label="Participation action / primary CTA" name="primaryCta" defaultValue={text("primaryCta", campaign?.primaryCta)} />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Destination URL" name="destinationUrl" type="url" placeholder="https://…" defaultValue={text("destinationUrl", campaign?.destinationUrl)} /><TextArea label="Non-web execution plan (if no public URL)" name="executionPlan" rows={2} defaultValue={text("executionPlan", campaign?.executionPlan)} /></div>
    <TextArea label="Success definition" name="successDefinition" rows={2} defaultValue={text("successDefinition", campaign?.successDefinition)} />
    <TextArea label="KPIs (one per line, narrative; numeric targets live on the campaign page)" name="kpis" rows={3} defaultValue={text("kpis", campaign?.kpis.join("\n"))} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Sport" name="sport" defaultValue={text("sport", campaign?.sport)} /><Field label="Season" name="season" defaultValue={text("season", campaign?.season)} /><Field label="Starts (CT)" name="startsAt" type="date" defaultValue={text("startsAt", calendarDayKey(campaign?.startsAt))} /><Field label="Deadline (CT)" name="endsAt" type="date" defaultValue={text("endsAt", calendarDayKey(campaign?.endsAt))} /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Expected minutes" name="expectedMinutes" type="number" min={0} step={1} defaultValue={text("expectedMinutes", campaign?.expectedMinutes?.toString())} /><Field label="Planned spend (0 = none)" name="plannedSpend" inputMode="decimal" placeholder="Unknown" defaultValue={text("plannedSpend", money(campaign?.plannedSpendMinor))} /><Field label="Actual spend (blank = unknown)" name="actualSpend" inputMode="decimal" placeholder="Unknown" defaultValue={text("actualSpend", money(campaign?.actualSpendMinor))} /><Field label="Currency" name="currency" maxLength={3} placeholder="USD" defaultValue={text("currency", campaign?.currency)} /></div>
    <TextArea label="Description" name="description" rows={2} defaultValue={text("description", campaign?.description)} />
    <TextArea label="Operating notes" name="notes" rows={3} defaultValue={text("notes", campaign?.notes)} />
    <div><p className="mb-2 text-xs text-[#747976]">Brands</p><CheckboxGroup name="brandIds" items={brands} selectedIds={list("brandIds", campaign?.brands)} /></div>
    <div><p className="mb-2 text-xs text-[#747976]">Markets</p><CheckboxGroup name="marketIds" items={markets} selectedIds={list("marketIds", campaign?.markets)} /></div>
    <div><p className="mb-2 text-xs text-[#747976]">Teams</p><CheckboxGroup name="teamIds" items={teams} selectedIds={list("teamIds", campaign?.teams)} /></div>
    <SubmitButton>{pending ? "Saving…" : campaign ? "Save Campaign" : "Create Campaign"}</SubmitButton>
  </form>;
}
