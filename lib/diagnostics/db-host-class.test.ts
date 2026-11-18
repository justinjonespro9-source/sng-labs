import { describe, expect, it } from "vitest";
import {
  bearerTokenMatches,
  classifyDatabaseUrlHost,
  isPreviewVercelRuntime,
  PRODUCTION_NEON_ENDPOINT_ID,
  PREVIEW_NEON_ENDPOINT_ID,
  resolveDbHostClassDiagnostic,
} from "./db-host-class";

const previewUrl = `postgresql://user:pass@${PREVIEW_NEON_ENDPOINT_ID}-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require`;
const previewDirectUrl = `postgresql://user:pass@${PREVIEW_NEON_ENDPOINT_ID}.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require`;
const productionUrl = `postgresql://user:pass@${PRODUCTION_NEON_ENDPOINT_ID}-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require`;
const otherUrl = "postgresql://user:pass@ep-other-endpoint-xxxx-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";
const token = "diagnostic-token-32chars-minimum!";

describe("classifyDatabaseUrlHost", () => {
  it("classifies exact Preview Neon endpoint (pooler and direct)", () => {
    expect(classifyDatabaseUrlHost(previewUrl)).toBe("PREVIEW");
    expect(classifyDatabaseUrlHost(previewDirectUrl)).toBe("PREVIEW");
  });

  it("classifies exact Production Neon endpoint", () => {
    expect(classifyDatabaseUrlHost(productionUrl)).toBe("PRODUCTION");
  });

  it("returns OTHER for unknown Neon endpoints, invalid URLs, and missing values", () => {
    expect(classifyDatabaseUrlHost(otherUrl)).toBe("OTHER");
    expect(classifyDatabaseUrlHost("postgresql://user:pass@db.example.com/db")).toBe("OTHER");
    expect(classifyDatabaseUrlHost("not-a-url")).toBe("OTHER");
    expect(classifyDatabaseUrlHost(undefined)).toBe("OTHER");
    expect(classifyDatabaseUrlHost("")).toBe("OTHER");
  });

  it("does not treat a partial cold-sun fragment as Preview", () => {
    expect(classifyDatabaseUrlHost("postgresql://u:p@ep-cold-sun-otherxxxx-pooler.c-7.us-east-2.aws.neon.tech/db")).toBe("OTHER");
  });
});

describe("resolveDbHostClassDiagnostic access control", () => {
  it("denies Production runtime without consulting classification success path", () => {
    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "production",
        diagnosticToken: token,
        authorizationHeader: `Bearer ${token}`,
        databaseUrl: previewUrl,
      }),
    ).toEqual({ ok: false, status: 404 });
  });

  it("denies missing token", () => {
    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "preview",
        diagnosticToken: token,
        authorizationHeader: null,
        databaseUrl: previewUrl,
      }),
    ).toEqual({ ok: false, status: 404 });
  });

  it("denies invalid token", () => {
    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "preview",
        diagnosticToken: token,
        authorizationHeader: "Bearer totally-wrong-token-value!!",
        databaseUrl: previewUrl,
      }),
    ).toEqual({ ok: false, status: 404 });
  });

  it("returns PREVIEW / PRODUCTION / OTHER on authorized Preview runtime", () => {
    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "preview",
        diagnosticToken: token,
        authorizationHeader: `Bearer ${token}`,
        databaseUrl: previewUrl,
      }),
    ).toEqual({ ok: true, classification: "PREVIEW" });

    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "preview",
        diagnosticToken: token,
        authorizationHeader: `Bearer ${token}`,
        databaseUrl: productionUrl,
      }),
    ).toEqual({ ok: true, classification: "PRODUCTION" });

    expect(
      resolveDbHostClassDiagnostic({
        vercelEnv: "preview",
        diagnosticToken: token,
        authorizationHeader: `Bearer ${token}`,
        databaseUrl: otherUrl,
      }),
    ).toEqual({ ok: true, classification: "OTHER" });
  });

  it("rejects short diagnostic tokens", () => {
    expect(bearerTokenMatches("short", "Bearer short")).toBe(false);
    expect(isPreviewVercelRuntime("preview")).toBe(true);
    expect(isPreviewVercelRuntime("production")).toBe(false);
  });
});
