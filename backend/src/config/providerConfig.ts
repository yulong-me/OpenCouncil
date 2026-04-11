import fs from 'fs';
import path from 'path';

export interface ProviderConfig {
  name: string
  label: string
  cliPath: string
  defaultModel: string
  apiKey: string
  baseUrl: string
  timeout: number
  thinking: boolean
  lastTested: number | null
  lastTestResult: { success: boolean; version?: string; error?: string } | null
}

export type ProvidersConfig = Record<string, ProviderConfig>

const CONFIG_PATH = path.resolve(process.cwd(), 'config/providers.json')

function loadConfig(): ProvidersConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(config: ProvidersConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function getAllProviders(): ProvidersConfig {
  return loadConfig()
}

export function getProvider(name: string): ProviderConfig | undefined {
  return loadConfig()[name]
}

export function upsertProvider(name: string, data: Omit<ProviderConfig, 'name' | 'lastTested' | 'lastTestResult'>): ProvidersConfig {
  const config = loadConfig()
  config[name] = {
    ...data,
    name,
    lastTested: config[name]?.lastTested ?? null,
    lastTestResult: config[name]?.lastTestResult ?? null,
  }
  saveConfig(config)
  return config
}

export function deleteProvider(name: string): ProvidersConfig {
  const config = loadConfig()
  delete config[name]
  saveConfig(config)
  return config
}

export function updateTestResult(name: string, result: ProviderConfig['lastTestResult']): void {
  const config = loadConfig()
  if (config[name]) {
    config[name].lastTested = Date.now()
    config[name].lastTestResult = result
    saveConfig(config)
  }
}
