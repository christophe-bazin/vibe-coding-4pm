/**
 * ProviderFactory - Factory to instantiate task providers based on configuration
 */

import { TaskProvider } from '../interfaces/TaskProvider.js';
import { ProviderConfig, ProviderType } from '../models/Provider.js';
import { NotionProvider } from './notion/NotionProvider.js';
import { LinearProvider } from './linear/LinearProvider.js';
import { GitHubProvider } from './github/GitHubProvider.js';

export class ProviderFactory {
  static createProvider(type: ProviderType, config: ProviderConfig, credentials: Record<string, string | undefined>): TaskProvider {
    if (!config.enabled) {
      throw new Error(`Provider '${type}' is disabled`);
    }

    switch (type) {
      case 'notion':
        return new NotionProvider(
          config.config.apiKey || '',
          config.config.databaseId || ''
        );

      case 'linear':
        return new LinearProvider({
          apiKey: credentials[config.config.apiKey] || '',
          teamId: credentials[config.config.teamId] || ''
        });

      case 'github':
        return new GitHubProvider({
          token: credentials[config.config.token] || '',
          org: credentials[config.config.org] || '',
          repo: credentials[config.config.repo]
        });

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  static getSupportedProviders(): ProviderType[] {
    return ['notion', 'linear', 'github'];
  }

  static isProviderSupported(type: string): type is ProviderType {
    return this.getSupportedProviders().includes(type as ProviderType);
  }
}