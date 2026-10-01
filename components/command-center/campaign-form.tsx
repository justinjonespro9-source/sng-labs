import { calendarDayKey } from "@/lib/growth/time";
import { CheckboxGroup, Field, Select, SubmitButton, TextArea } from "./form-fields";

const objectiveTypes = ["USER_ACQUISITION", "PARTICIPATION", "RETENTION", "BRAND_AWARENESS", "CREATOR_ACTIVATION", "MEDIA_EARNED", "PARTNERSHIP", "INDUSTRY_OUTREACH", "PRODUCT_VALIDATION", "OTHER"];
type CampaignValue = { name: string; programId: string | null; description: string | null; objective: string | null; objectiveType: string; primaryAudience: string | null; primaryCta: string | null; coreMessage: string | null; sport: string | null; season: string | null; notes: string | null; successDefinition: string | null; kpis: string[]; startsAt: Date | null; endsAt: Date | null; status: string; brands: { id: string }[]; markets: { id: string }[]; teams: { id: string }[]; ownerId: string | null; offer: string | null; hypothesis: string | null; destinationUrl: string | null; executionPlan: string | null; expectedMinutes: number | null; plannedSpendMinor: number | null; actualSpendMinor: number | null; currency: string | null };

function money(minor: number | null | undefined) {
  return minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);
}

export function CampaignForm({ action, programs, brands, markets, teams, users, campaign }: { action: (formData: FormData) => void | Promise<void>; programs: { id: string; name: string }[]; brands: { id: string; name: string }[]; markets: { id: string; name: string }[]; teams: { id: string; name: string }[]; users: { id: string; name: string | null; email: string | null }[]; campaign?: CampaignValue }) {
  return <form action={action} className="space-y-5 rounded-2xl border border-white/8 bg-[#101214] p-6">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Campaign name" name="name" required defaultValue={campaign?.name} /><Select label="Growth program" name="programId" defaultValue={campaign?.programId || ""}><option value="">Unassigned</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</Select></div>
    <TextArea label="Business / growth objective" name="objective" rows={3} defaultValue={campaign?.objective || ""} />
    <div className="grid gap-4 sm:grid-cols-3"><Select label="Objective type" name="objectiveType" defaultValue={campaign?.objectiveType || "OTHER"}>{objectiveTypes.map((type) => <option key={type}>{type}</option>)}</Select><Select label="Status" name="status" defaultValue={campaign?.status || "PLANNING"}>{["PLANNING","ACTIVE","PAUSED","COMPLETE","ARCHIVED"].map((status) => <option key={status}>{status}</option>)}</Select><Select label="Owner" name="ownerId" defaultValue={campaign?.ownerId || ""}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</Select></div>
    <p className="rounded-lg border border-white/8 bg-[#080a0b] px-3 py-2 text-xs text-[#8f9391]">ACTIVE requires: owner, brand, objective, audience, offer, hypothesis, CTA, destination URL or non-web execution plan, start and deadline, and at least one numeric target. Create as PLANNING, add targets on the campaign page, then activate.</p>
    <div className="grid gap-4 sm:grid-cols-2"><TextArea label="Primary audience" name="primaryAudience" rows={2} defaultValue={campaign?.primaryAudience || ""} /><TextArea label="Core message / positioning" name="coreMessage" rows={2} defaultValue={campaign?.coreMessage || ""} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><TextArea label="Offer (what the participant gets)" name="offer" rows={2} defaultValue={campaign?.offer || ""} /><TextArea label="Hypothesis (what we expect and why)" name="hypothesis" rows={2} defaultValue={campaign?.hypothesis || ""} /></div>
    <Field label="Participation action / primary CTA" name="primaryCta" defaultValue={campaign?.primaryCta || ""} />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Destination URL" name="destinationUrl" type="url" placeholder="https://…" defaultValue={campaign?.destinationUrl || ""} /><TextArea label="Non-web execution plan (if no public URL)" name="executionPlan" rows={2} defaultValue={campaign?.executionPlan || ""} /></div>
    <TextArea label="Success definition" name="successDefinition" rows={2} defaultValue={campaign?.successDefinition || ""} />
    <TextArea label="KPIs (one per line, narrative; numeric targets live on the campaign page)" name="kpis" rows={3} defaultValue={campaign?.kpis.join("\n") || ""} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Sport" name="sport" defaultValue={campaign?.sport || ""} /><Field label="Season" name="season" defaultValue={campaign?.season || ""} /><Field label="Starts (CT)" name="startsAt" type="date" defaultValue={calendarDayKey(campaign?.startsAt)} /><Field label="Deadline (CT)" name="endsAt" type="date" defaultValue={calendarDayKey(campaign?.endsAt)} /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Expected minutes" name="expectedMinutes" type="number" min={0} step={1} defaultValue={campaign?.expectedMinutes ?? ""} /><Field label="Planned spend (0 = none)" name="plannedSpend" inputMode="decimal" placeholder="Unknown" defaultValue={money(campaign?.plannedSpendMinor)} /><Field label="Actual spend (blank = unknown)" name="actualSpend" inputMode="decimal" placeholder="Unknown" defaultValue={money(campaign?.actualSpendMinor)} /><Field label="Currency" name="currency" maxLength={3} placeholder="USD" defaultValue={campaign?.currency || ""} /></div>
    <TextArea label="Description" name="description" rows={2} defaultValue={campaign?.description || ""} />
    <TextArea label="Operating notes" name="notes" rows={3} defaultValue={campaign?.notes || ""} />
    <div><p className="mb-2 text-xs text-[#747976]">Brands</p><CheckboxGroup name="brandIds" items={brands} selectedIds={campaign?.brands.map((item) => item.id)} /></div>
    <div><p className="mb-2 text-xs text-[#747976]">Markets</p><CheckboxGroup name="marketIds" items={markets} selectedIds={campaign?.markets.map((item) => item.id)} /></div>
    <div><p className="mb-2 text-xs text-[#747976]">Teams</p><CheckboxGroup name="teamIds" items={teams} selectedIds={campaign?.teams.map((item) => item.id)} /></div>
    <SubmitButton>{campaign ? "Save Campaign" : "Create Campaign"}</SubmitButton>
  </form>;
}
