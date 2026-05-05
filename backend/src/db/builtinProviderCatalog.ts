import type { ProviderConfig } from '../config/providerConfig.js';

export const BUILTIN_PROVIDER_CATALOG_VERSION = 1;

export type BuiltinProviderDefinition = Omit<ProviderConfig, 'lastTested' | 'lastTestResult'>;

export type BuiltinProviderCatalogStore = {
  getProvider: (name: string) => ProviderConfig | undefined;
  insertProviderIfNotExists: (
    name: string,
    data: Omit<ProviderConfig, 'name' | 'lastTested' | 'lastTestResult'>,
  ) => void;
};

export function backfillMissingBuiltinProviders(
  store: BuiltinProviderCatalogStore,
  definitions: readonly BuiltinProviderDefinition[],
): number {
  let inserted = 0;

  for (const provider of definitions) {
    if (store.getProvider(provider.name)) continue;

    const { name, ...data } = provider;
    store.insertProviderIfNotExists(name, data);
    inserted++;
  }

  return inserted;
}
