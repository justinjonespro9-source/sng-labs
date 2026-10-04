import { growthStageLabels, growthStages } from "@/lib/growth/briefs";
import { toCentralDateInputValue } from "@/lib/growth/time";
import { Field, Select, SubmitButton, TextArea } from "./form-fields";

type BriefValue = { stage: string; priorityAudience: string | null; marketId: string | null; geographyNotes: string | null; offer: string | null; activationDefinition: string | null; repeatDefinition: string | null; bottleneck: string | null; primaryMotion: string | null; capacityNotes: string | null; effectiveAt: Date | null; reviewAt: Date | null; notes: string | null };

export function GrowthBriefForm({ action, markets, brief, submitLabel }: { action: (formData: FormData) => void | Promise<void>; markets: { id: string; name: string }[]; brief?: BriefValue | null; submitLabel: string }) {
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <Select label="Stage" name="stage" required defaultValue={brief?.stage ?? "DEVELOPMENT"}>{growthStages.map((stage) => <option key={stage} value={stage}>{growthStageLabels[stage]}</option>)}</Select>
    <Select label="Market (optional)" name="marketId" defaultValue={brief?.marketId ?? ""}><option value="">Not market-specific</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</Select>
    <TextArea label="Priority audience *" name="priorityAudience" rows={2} defaultValue={brief?.priorityAudience ?? ""} />
    <TextArea label="Offer *" name="offer" rows={2} defaultValue={brief?.offer ?? ""} />
    <TextArea label="Activation definition *" name="activationDefinition" rows={2} defaultValue={brief?.activationDefinition ?? ""} />
    <TextArea label="Repeat definition" name="repeatDefinition" rows={2} defaultValue={brief?.repeatDefinition ?? ""} />
    <TextArea label="Current bottleneck *" name="bottleneck" rows={2} defaultValue={brief?.bottleneck ?? ""} />
    <TextArea label="Primary growth motion *" name="primaryMotion" rows={2} defaultValue={brief?.primaryMotion ?? ""} />
    <TextArea label="Geography notes" name="geographyNotes" rows={2} defaultValue={brief?.geographyNotes ?? ""} />
    <TextArea label="Capacity notes" name="capacityNotes" rows={2} defaultValue={brief?.capacityNotes ?? ""} />
    <Field label="Effective (CT) *" name="effectiveAt" type="date" defaultValue={toCentralDateInputValue(brief?.effectiveAt)} />
    <Field label="Review by (CT) *" name="reviewAt" type="date" defaultValue={toCentralDateInputValue(brief?.reviewAt)} />
    <div className="sm:col-span-2"><TextArea label="Notes" name="notes" rows={3} defaultValue={brief?.notes ?? ""} /></div>
    <p className="text-xs text-[#747976] sm:col-span-2">* Required before approval. Drafts can be saved incomplete.</p>
    <div><SubmitButton>{submitLabel}</SubmitButton></div>
  </form>;
}
