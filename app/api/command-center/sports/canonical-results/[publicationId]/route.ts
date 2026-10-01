import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { prisma } from "@/lib/prisma";
import { storedCanonicalDownload } from "@/lib/sports/scoring/publication";

export const runtime="nodejs";
export async function GET(_request:Request,context:{params:Promise<{publicationId:string}>}) {
  const session=await auth();
  if(!session?.user || !isAllowedEmail(session.user.email)) return new Response("Unauthorized",{status:401});
  const {publicationId}=await context.params;
  const exists=await prisma.sportsCanonicalPublication.findUnique({where:{id:publicationId},select:{id:true}});
  if(!exists) return new Response("Not found",{status:404});
  const stored=await storedCanonicalDownload(prisma,publicationId);
  return new Response(stored.bytes,{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${stored.filename}"`,"Cache-Control":"private, no-store","X-SNG-Content-Checksum":stored.checksum,"X-SNG-Publication-State":stored.state}});
}
