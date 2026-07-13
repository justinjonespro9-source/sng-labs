import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & {
  variant?: "primary" | "secondary" | "ghost" | "premium";
  children: ReactNode;
};

const variants = {
  primary:
    "bg-foreground text-background shadow-[0_0_0_1px_rgba(242,242,240,0.08)] hover:bg-muted-strong hover:shadow-[0_8px_30px_rgba(242,242,240,0.08)] active:translate-y-px focus-visible:ring-ring",
  secondary:
    "border border-border-strong bg-transparent text-foreground hover:border-foreground/35 hover:bg-white/[0.04] active:translate-y-px focus-visible:ring-ring",
  ghost:
    "text-muted-strong hover:text-foreground focus-visible:ring-ring",
  premium:
    "border border-foreground/15 bg-foreground text-background shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.25)] hover:bg-muted-strong hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_36px_rgba(0,0,0,0.3)] active:translate-y-px focus-visible:ring-ring",
} as const;

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={`group/button inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium tracking-wide transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
