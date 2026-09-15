import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass = "mt-1.5 w-full rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#b8d4c8]/50";

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-xs text-[#8f9391]">{label}<input className={fieldClass} {...props} /></label>;
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="block text-xs text-[#8f9391]">{label}<textarea className={fieldClass} {...props} /></label>;
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="block text-xs text-[#8f9391]">{label}<select className={fieldClass} {...props}>{children}</select></label>;
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return <button className="rounded-lg bg-[#b8d4c8] px-4 py-2.5 text-sm font-semibold text-[#07100c] hover:bg-white" type="submit">{children}</button>;
}

export function CheckboxGroup({ name, items, selectedIds = [] }: { name: string; items: { id: string; name: string }[]; selectedIds?: string[] }) {
  return <div className="flex flex-wrap gap-2">{items.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#b8bcba]"><input name={name} type="checkbox" value={item.id} defaultChecked={selectedIds.includes(item.id)} />{item.name}</label>)}</div>;
}
