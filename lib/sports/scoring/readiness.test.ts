import { describe,it,expect } from "vitest";
import { canonicalFixture,addNonparticipant } from "./canonical-fixtures.test-helper";
import { evaluateWeeklyReadiness,validateSupportedRuleset } from "./readiness";
import { normalizeExportTeam,frozenWeeklyEligibility } from "./weekly-eligibility";

const codes=(f:ReturnType<typeof canonicalFixture>)=>evaluateWeeklyReadiness(f.observation,f.manifest).blockers.map(b=>b.code);
describe("full-week canonical readiness",()=>{
  it("requires reviewed evidence and accepts complete exact populations",()=>{const f=canonicalFixture();expect(codes(f)).toEqual([]);expect(evaluateWeeklyReadiness(f.observation,null).ready).toBe(false);});
  it.each(["SCHEDULED","LIVE","POSTPONED","TIME_TBD"])("blocks %s events",status=>{const f=canonicalFixture();f.observation.events[0].status=status;expect(codes(f)).toContain("EVENT_FINALITY");});
  it("finds a missing game even if both feeds omit it",()=>{const f=canonicalFixture();f.manifest.events.push({...f.manifest.events[0],key:"missing-game"});expect(codes(f)).toContain("SCHEDULE_SET");});
  it("requires exact participant identities, not equal counts",()=>{const f=canonicalFixture();f.manifest.events[0].playerParticipantIds[0]="wrong";expect(codes(f)).toContain("PLAYER_SET");});
  it("blocks incomplete roster populations and absent identities",()=>{const f=canonicalFixture();f.manifest.participants.pop();expect(codes(f)).toContain("POPULATION_SET");});
  it.each(["UNKNOWN_INCOMPLETE","ABSENT_UNRESOLVED"] as const)("blocks %s",state=>{const f=canonicalFixture();f.manifest.participants[0].state=state;expect(codes(f)).toContain("PARTICIPATION_UNRESOLVED");});
  it("never invents DNP from missing source rows",()=>{const f=canonicalFixture();f.observation.players.shift();expect(codes(f)).toContain("SCORABLE_FACT");});
  it("requires affirmative evidence for DNP",()=>{const f=canonicalFixture();addNonparticipant(f.manifest,f.observation);expect(codes(f)).toEqual([]);f.manifest.participants.at(-1)!.participationProof="NONE";expect(codes(f)).toContain("DNP_NOT_AFFIRMED");});
  it("blocks incomplete participation channels",()=>{const f=canonicalFixture();f.manifest.channelsReviewed=["OFFENSE"];expect(codes(f)).toContain("PARTICIPATION_CHANNELS");});
  it("requires both correct defenses and explicit pointsAllowed provenance",()=>{const f=canonicalFixture();f.manifest.events[0].pointsAllowedEvidence=[];expect(codes(f)).toContain("POINTS_ALLOWED_EVIDENCE");f.observation.defenses.pop();expect(codes(f)).toContain("DEFENSE_SET");});
  it("blocks provisional, missing facts and false zeros",()=>{const f=canonicalFixture();f.observation.players[0].finality="PROVISIONAL";f.observation.players[0].facts.passingYards=null;expect(codes(f)).toContain("FACT_FINALITY");expect(codes(f)).toContain("FACT_VALUES");expect(codes(f)).toContain("FALSE_ZERO");});
  it("blocks unscoped quality issues",()=>{const f=canonicalFixture();f.observation.issues.push({id:"unscoped",type:"UNRESOLVED_IDENTITY",status:"OPEN",summary:"Unresolved"});expect(codes(f)).toContain("QUALITY_ISSUE");});
  it("surfaces Hunter-like missing mapping and forbids fuzzy name fallback",()=>{const f=canonicalFixture();f.observation.participants[0].canonicalName="Travis Hunter";f.observation.participants[0].identities=[];expect(codes(f)).toContain("UNVERIFIED_IDENTITY");f.manifest.participants[0].identities=[];expect(codes(f)).toContain("IDENTITY_MAPPING");});
  it("rejects duplicate provider identities",()=>{const f=canonicalFixture();f.manifest.participants[1].identities=f.manifest.participants[0].identities;expect(codes(f)).toContain("DUPLICATE_IDENTITY");});
  it("requires persisted compiled definition and ACTIVE acceptance",()=>{const f=canonicalFixture();expect(()=>validateSupportedRuleset(f.observation.ruleset,true)).not.toThrow();f.observation.ruleset!.status="DRAFT";expect(()=>validateSupportedRuleset(f.observation.ruleset)).not.toThrow();expect(()=>validateSupportedRuleset(f.observation.ruleset,true)).toThrow();f.observation.ruleset!.definition={};expect(()=>validateSupportedRuleset(f.observation.ruleset)).toThrow();});
  it("freezes weekly team/position independently of mutable memberships",()=>{const f=canonicalFixture();f.observation.participants[0].roster=[{team:"later-trade",position:"WR"}];expect(frozenWeeklyEligibility(f.manifest.participants,"QB","game").position).toBe("QB");expect(()=>frozenWeeklyEligibility([...f.manifest.participants,f.manifest.participants[0]],"QB","game")).toThrow(/ambiguous/);});
  it("normalizes existing Washington and LA boundaries",()=>{expect(normalizeExportTeam("was")).toBe("WSH");expect(normalizeExportTeam("LA")).toBe("LAR");});
});
