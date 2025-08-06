/**
 * Provider configuration and management types
 */

export interface ProviderConfig {
  name: string;
  type: 'core' | 'premium' | 'enterprise';
  enabled: boolean;
  config: Record<string, any>;
}

export interface ProvidersConfig {
  default: string;
  available: Record<string, ProviderConfig>;
}

export interface ProviderCredentials {
  [key: string]: string;
}

export type ProviderType = 'notion' | 'linear' | 'github';