import "server-only";

import { Prisma } from "@prisma/client";
import { redirect, unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { submittedValues, type FormActionState } from "./form-state";

export function withSearchParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("error");
  params.delete("saved");
  params.set(key, value);
  return `${base}?${params.toString()}`;
}

export function userFacingError(error: unknown) {
  if (error instanceof ZodError) return error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "That change conflicts with an existing record (it may already exist or another operator just changed it). Refresh and try again.";
    if (error.code === "P2034") return "Another operator changed this at the same time. Refresh and try again.";
    if (error.code === "P2025") return "The record no longer exists.";
    return "The database rejected this change.";
  }
  if (error instanceof Prisma.PrismaClientValidationError || error instanceof Prisma.PrismaClientUnknownRequestError) return "The database rejected this change.";
  if (error instanceof Error) return error.message.slice(0, 400);
  return "Something went wrong.";
}

/** Runs a mutation and redirects with ?saved= or ?error= so validation failures are visible to the operator instead of a generic error page. */
export async function runFormAction(returnTo: string, work: () => Promise<{ redirectTo?: string; saved?: string } | void>) {
  let destination = withSearchParam(returnTo, "saved", "1");
  try {
    const result = await work();
    if (result?.redirectTo) destination = result.saved ? withSearchParam(result.redirectTo, "saved", result.saved) : result.redirectTo;
    else if (result?.saved) destination = withSearchParam(returnTo, "saved", result.saved);
  } catch (error) {
    unstable_rethrow(error);
    destination = withSearchParam(returnTo, "error", userFacingError(error));
  }
  redirect(destination);
}

/** For forms using useActionState: redirects on success; on failure returns the error with the submitted values so nothing the operator typed is lost. */
export async function runFormStateAction(previous: FormActionState, formData: FormData, work: () => Promise<{ redirectTo: string }>): Promise<FormActionState> {
  let destination: string;
  try {
    destination = (await work()).redirectTo;
  } catch (error) {
    unstable_rethrow(error);
    return { error: userFacingError(error), values: submittedValues(formData), attempt: previous.attempt + 1 };
  }
  redirect(destination);
}
