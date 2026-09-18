"use client";

import { useActionState } from "react";
import { generateExecutionAction } from "@/lib/ai-lab/actions";
import { aiLabChannels, type AiLabActionState } from "@/lib/ai-lab/schema";

type Option = { id: string; name: string };
type Props = { brands: Option[]; programs: Option[]; campaigns: Option[]; activations: Option[]; events: Option[]; opportunities: Option[]; relationships: Option[]; disabled: boolean; defaults?: { brandId?: string; opportunityId?: string; eventId?: string; growthProgramId?: string; campaignId?: string; activationId?: string } };
const inputClass = "mt-1.5 w-full rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#b8d4c8]/50";

function SelectField({ label, name, children, required, defaultValue }: { label: string; name: string; children: React.ReactNode; required?: boolean; defaultValue?: string }) {
  return <label className="block text-xs text-[#8f9391]">{label}<select name={name} required={required} defaultValue={defaultValue} className={inputClass}>{children}</select></label>;
}

function optionalOptions(items: Option[]) {
  return <><option value="">None</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</>;
}

export function AiLabForm(props: Props) {
  const [state, action, pending] = useActionState(generateExecutionAction, {} as AiLabActionState);
  return <form action={action} className="mt-5 space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-xs text-[#8f9391]">Brand / editorial owner<select name="brandId" required defaultValue={props.defaults?.brandId || ""} className={inputClass}><option value="">Choose a configured Brand…</option>{props.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <SelectField label="Execution channel" name="channel" required>{aiLabChannels.map((channel) => <option key={channel} value={channel}>{channel.replaceAll("_", " ")}</option>)}</SelectField>
      <SelectField label="Growth Program" name="growthProgramId" defaultValue={props.defaults?.growthProgramId || ""}>{optionalOptions(props.programs)}</SelectField>
      <SelectField label="Campaign" name="campaignId" defaultValue={props.defaults?.campaignId || ""}>{optionalOptions(props.campaigns)}</SelectField>
      <SelectField label="Activation" name="activationId" defaultValue={props.defaults?.activationId || ""}>{optionalOptions(props.activations)}</SelectField>
      <label className="block text-xs text-[#8f9391]">Event<select name="eventId" defaultValue={props.defaults?.eventId || ""} className={inputClass}>{optionalOptions(props.events)}</select></label>
      <label className="block text-xs text-[#8f9391]">Opportunity (required only to create a Draft)<select name="opportunityId" defaultValue={props.defaults?.opportunityId || ""} className={inputClass}>{optionalOptions(props.opportunities)}</select></label>
      <SelectField label="Relationship context" name="relationshipId">{optionalOptions(props.relationships)}</SelectField>
      <label className="block text-xs text-[#8f9391]">Audience segment<input name="audienceSegment" maxLength={1000} className={inputClass} placeholder="Optional execution-specific audience" /></label>
    </div>
    <div className="grid gap-4 md:grid-cols-[1fr_240px]">
      <label className="block text-xs text-[#8f9391]">Additional context<textarea name="operatorContext" rows={5} maxLength={10000} className={inputClass} placeholder="Facts you know, or a clearly labeled hypothetical scenario" /></label>
      <SelectField label="Additional context trust" name="operatorContextTrust"><option value="">Not supplied</option><option value="OPERATOR_SUPPLIED">Operator supplied</option><option value="HYPOTHETICAL">Hypothetical</option></SelectField>
    </div>
    <div className="rounded-xl border border-white/7 bg-black/20 p-4 text-xs leading-5 text-[#8f9391]">Structured SNG records are treated as trusted. Operator context and hypothetical context remain explicitly labeled. Anything absent is unavailable and must not be invented.</div>
    {state.error && <p role="alert" className="rounded-xl border border-[#ec7f72]/25 bg-[#ec7f72]/5 p-4 text-sm text-[#ec9a90]">{state.error}</p>}
    <button disabled={props.disabled || pending} className="rounded-lg bg-[#b8d4c8] px-5 py-2.5 text-sm font-semibold text-[#07100c] disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Generating…" : "Generate Execution"}</button>
  </form>;
}
