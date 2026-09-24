import type { SocialAccountType, SocialCapability, SocialPlatform } from "@prisma/client";

export type ProviderAccountIdentity = {
  externalAccountId: string;
  accountType: SocialAccountType;
  handle?: string;
  displayName?: string;
  profileUrl?: string;
  parentExternalAccountId?: string;
  providerRelationshipType?: string;
};

export type ProviderCapabilityEvidence = {
  capability: SocialCapability;
  supported: boolean;
  requiredScopes: string[];
  reasonCode?: string;
  evidence?: Record<string, unknown>;
};

export interface SocialProviderAdapter {
  readonly platform: SocialPlatform;
  readonly adapterVersion: string;
  readonly liveAuthorizationEnabled: boolean;
  readonly supportsMultipleAccountsPerAuthorization: boolean;
  readonly supportedAccountTypes: readonly SocialAccountType[];
  requiredScopes(capability: SocialCapability, accountType: SocialAccountType): string[];
  buildAuthorizationUrl(_input: { state: string; codeChallenge: string; redirectUri: string }): Promise<string>;
  exchangeAuthorizationCode(_input: { code: string; codeVerifier: string; redirectUri: string }): Promise<never>;
  discoverAccounts(_credentialReference: string): Promise<ProviderAccountIdentity[]>;
  verifyCapabilities(_identity: ProviderAccountIdentity, _grantedScopes: string[]): Promise<ProviderCapabilityEvidence[]>;
}

export class SocialConnectorDisabledError extends Error {
  constructor(platform: SocialPlatform) {
    super(`${platform} live authorization is disabled until credentials and a credential vault are approved`);
    this.name = "SocialConnectorDisabledError";
  }
}

export abstract class DisabledSocialProviderAdapter implements SocialProviderAdapter {
  abstract readonly platform: SocialPlatform;
  abstract readonly adapterVersion: string;
  readonly liveAuthorizationEnabled = false;
  abstract readonly supportsMultipleAccountsPerAuthorization: boolean;
  abstract readonly supportedAccountTypes: readonly SocialAccountType[];
  abstract requiredScopes(capability: SocialCapability, accountType: SocialAccountType): string[];
  async buildAuthorizationUrl(): Promise<string> { throw new SocialConnectorDisabledError(this.platform); }
  async exchangeAuthorizationCode(): Promise<never> { throw new SocialConnectorDisabledError(this.platform); }
  async discoverAccounts(): Promise<ProviderAccountIdentity[]> { throw new SocialConnectorDisabledError(this.platform); }
  async verifyCapabilities(): Promise<ProviderCapabilityEvidence[]> { throw new SocialConnectorDisabledError(this.platform); }
}

