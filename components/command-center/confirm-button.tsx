"use client";

import type { ButtonHTMLAttributes } from "react";

export function ConfirmButton({ confirmation, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { confirmation: string }) {
  return <button {...props} type="submit" onClick={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>{children}</button>;
}
