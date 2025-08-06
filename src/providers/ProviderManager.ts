/**
 * ProviderManager - Manages active task providers and routing
 */

import { TaskProvider } from '../interfaces/TaskProvider.js';
import { ProvidersConfig, ProviderType } from '../models/Provider.js';
import { ProviderFactory } from './ProviderFactory.js';

export class ProviderManager {
  private providers: Map<string, TaskProvider> = new Map();
  private defaultProvider: string;

  constructor(
    private config: ProvidersConfig,
    private credentials: Record<string, string | undefined>
  ) {
    this.defaultProvider = config.default;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const [providerName, providerConfig] of Object.entries(this.config.available)) {
      if (providerConfig.enabled && ProviderFactory.isProviderSupported(providerName)) {
        try {
          const provider = ProviderFactory.createProvider(
            providerName as ProviderType,
            providerConfig,
            this.credentials
          );
          this.providers.set(providerName, provider);
          console.log(`✅ Provider '${providerName}' initialized successfully`);
          console.log(`🔑 Using credentials:`, Object.keys(this.credentials).filter(k => k.includes('NOTION')));
        } catch (error) {
          console.error(`❌ Failed to initialize provider '${providerName}':`, error);
        }
      } else if (!providerConfig.enabled) {
        console.log(`⏸️  Provider '${providerName}' is disabled`);
      }
    }

    // Validate default provider
    if (!this.providers.has(this.defaultProvider)) {
      const availableProviders = Array.from(this.providers.keys());
      if (availableProviders.length > 0) {
        const firstProvider = availableProviders[0];
        if (firstProvider) {
          this.defaultProvider = firstProvider;
          console.warn(`Default provider not available, using '${this.defaultProvider}' instead`);
        }
      } else {
        throw new Error('No providers are available or enabled');
      }
    }
  }

  getDefaultProvider(): TaskProvider {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider '${this.defaultProvider}' is not available`);
    }
    return provider;
  }

  getProvider(name?: string): TaskProvider {
    if (!name) {
      return this.getDefaultProvider();
    }

    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' is not available or enabled`);
    }
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(name?: string): { name: string; type: string; enabled: boolean } {
    const provider = this.getProvider(name);
    const providerName = name || this.defaultProvider;
    const config = this.config.available[providerName];
    
    return {
      name: provider.getProviderName(),
      type: provider.getProviderType(),
      enabled: config?.enabled || false
    };
  }

  isProviderAvailable(name: string): boolean {
    return this.providers.has(name);
  }
}