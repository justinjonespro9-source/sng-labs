"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { requireCanonicalAuthority, reviewWeeklyManifest } from "../participation-evidence";
import { calculateNflWeekPreview } from "./workflow";
import { acceptCanonicalWeek, withdrawCanonicalPublication } from "./publication";

function returnToWeek(year:string,week:string,error?:string) {
  revalidatePath("/command-center/sports/canonical");
  redirect(`/command-center/sports/canonical?year=${encodeURIComponent(year)}&week=${encodeURIComponent(week)}${error?`&message=${encodeURIComponent(error)}`:""}`);
}
export async function reviewCanonicalManifest(form:FormData) {
  const user=await requireCommandCenterUser();let error:string|undefined;
  try {await reviewWeeklyManifest(prisma,JSON.parse(String(form.get("manifest")??"")),user.id,String(form.get("reason")??""));}
  catch(e){error=e instanceof Error?e.message:"Manifest review failed";}
  returnToWeek(String(form.get("year")),String(form.get("week")),error);
}
export async function calculateCanonicalShadow(form:FormData) {
  const user=await requireCommandCenterUser();let error:string|undefined;
  try {
    await requireCanonicalAuthority(prisma,user.id);
    await calculateNflWeekPreview({year:Number(form.get("year")),week:Number(form.get("week")),mode:"SHADOW",manifestId:String(form.get("manifestId")),createdById:user.id});
  }catch(e){error=e instanceof Error?e.message:"Calculation failed";}
  returnToWeek(String(form.get("year")),String(form.get("week")),error);
}
export async function acceptCanonicalPublication(form:FormData) {
  const user=await requireCommandCenterUser();let error:string|undefined;
  try {await acceptCanonicalWeek(prisma,{runId:String(form.get("runId")),manifestId:String(form.get("manifestId")),actorId:user.id,reason:String(form.get("reason")??""),reviewFingerprint:String(form.get("reviewFingerprint"))});}
  catch(e){error=e instanceof Error?e.message:"Acceptance failed";}
  returnToWeek(String(form.get("year")),String(form.get("week")),error);
}
export async function withdrawCanonicalWeek(form:FormData) {
  const user=await requireCommandCenterUser();let error:string|undefined;
  try {await withdrawCanonicalPublication(prisma,String(form.get("publicationId")),user.id,String(form.get("reason")??""));}
  catch(e){error=e instanceof Error?e.message:"Withdrawal failed";}
  returnToWeek(String(form.get("year")),String(form.get("week")),error);
}
