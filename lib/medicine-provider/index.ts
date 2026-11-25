import { healthPilotProvider } from './healthpilot'
import type { MedicineInfoProvider } from './types'

export * from './types'

// drugdb.in (HealthPilot DIS, NRCeS India) is the active provider. The legacy
// RxNorm/DailyMed modules remain in this folder for reference but are no
// longer wired into the app.
const providers: MedicineInfoProvider[] = [healthPilotProvider]

export function getMedicineInfoProvider(): MedicineInfoProvider {
  // Prefer the first configured provider; fall back so the UI can explain why
  // automatic lookup is unavailable instead of failing silently.
  return providers.find((provider) => provider.isConfigured()) ?? providers[0]
}

export function listMedicineInfoProviders(): MedicineInfoProvider[] {
  return [...providers]
}
