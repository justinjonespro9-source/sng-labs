type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageHeader({ eyebrow = "Command Center", title, description, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/8 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b8d4c8]">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#979b98]">{description}</p>
      </div>
      {children}
    </header>
  );
}
