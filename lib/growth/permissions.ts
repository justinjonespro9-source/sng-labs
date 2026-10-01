export type CommandCenterRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

const growthEditors = new Set<string>(["OWNER", "ADMIN", "EDITOR"]);
const portfolioDeciders = new Set<string>(["OWNER", "ADMIN"]);

export function canEditGrowth(role: string | null | undefined) {
  return growthEditors.has(String(role));
}

export function canAllocatePortfolio(role: string | null | undefined) {
  return portfolioDeciders.has(String(role));
}

export function assertCanEditGrowth(role: string | null | undefined) {
  if (!canEditGrowth(role)) throw new Error("Forbidden: strategy and measurement editing requires an Owner, Admin or Editor");
}

export function assertCanAllocatePortfolio(role: string | null | undefined) {
  if (!canAllocatePortfolio(role)) throw new Error("Forbidden: portfolio allocation requires an Owner or Admin");
}
