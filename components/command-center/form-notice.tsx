const savedMessages: Record<string, string> = {
  "1": "Saved.",
  draft: "Draft brief saved. It is not authoritative until approved.",
  approved: "Brief approved and now CURRENT. Any earlier CURRENT revision was superseded and kept in history.",
  archived: "Draft archived.",
  priority: "Portfolio priority recorded. Any earlier allocation was superseded and kept in history.",
  definition: "Metric definition created as DRAFT. Activate it before recording measurements.",
  version: "New definition version created as DRAFT. Activating it retires the previous version.",
  measurement: "Measurement recorded. It counts toward scorecards only after review.",
  reviewed: "Measurement reviewed.",
  target: "Target added.",
  "target-removed": "Target removed.",
  review: "Campaign decision recorded.",
  action: "Action added.",
  activity: "Activity logged.",
  organization: "Organization added.",
  relationship: "Relationship added.",
  verified: "Destination identity verified manually and audited.",
  handoff: "Manual handoff prepared. Post externally, then record the actual URL and time.",
  published: "Publication recorded as PUBLISHED with audit evidence.",
  "already-recorded": "This publication was already recorded with the same URL. Nothing changed.",
};

export function FormNotice({ saved, error }: { saved?: string | string[]; error?: string | string[] }) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const savedKey = Array.isArray(saved) ? saved[0] : saved;
  if (errorText) return <div role="alert" className="mt-5 rounded-xl border border-[#ec7f72]/30 bg-[#ec7f72]/8 px-4 py-3 text-sm text-[#f0a49a]">{errorText}</div>;
  if (savedKey) return <div role="status" className="mt-5 rounded-xl border border-[#87d2ac]/25 bg-[#87d2ac]/8 px-4 py-3 text-sm text-[#a9dcc1]">{savedMessages[savedKey] ?? "Saved."}</div>;
  return null;
}
