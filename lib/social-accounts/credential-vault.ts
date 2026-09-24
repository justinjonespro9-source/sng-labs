import "server-only";

export type CredentialSecret = { value: string; version?: string };

export interface CredentialVault {
  readonly provider: string;
  isAvailable(): Promise<boolean>;
  read(reference: string): Promise<CredentialSecret>;
  write(reference: string, value: string): Promise<{ reference: string; version?: string }>;
  revoke(reference: string): Promise<void>;
}

export class CredentialVaultUnavailableError extends Error {
  constructor() {
    super("Social credential vault is not configured");
    this.name = "CredentialVaultUnavailableError";
  }
}

export class DisabledCredentialVault implements CredentialVault {
  readonly provider = "disabled";
  async isAvailable() { return false; }
  async read(): Promise<CredentialSecret> { throw new CredentialVaultUnavailableError(); }
  async write(): Promise<{ reference: string }> { throw new CredentialVaultUnavailableError(); }
  async revoke(): Promise<void> { throw new CredentialVaultUnavailableError(); }
}

export class MemoryCredentialVault implements CredentialVault {
  readonly provider = "memory-test-only";
  private readonly values = new Map<string, string>();
  async isAvailable() { return true; }
  async read(reference: string) {
    const value = this.values.get(reference);
    if (!value) throw new Error("Credential reference not found");
    return { value, version: "test" };
  }
  async write(reference: string, value: string) {
    this.values.set(reference, value);
    return { reference, version: "test" };
  }
  async revoke(reference: string) { this.values.delete(reference); }
}

export function getCredentialVault(): CredentialVault {
  return new DisabledCredentialVault();
}
