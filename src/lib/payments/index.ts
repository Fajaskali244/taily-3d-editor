import { ManualProvider } from './manual'
// import { XenditProvider } from './xendit'

const BANK_CONFIG = {
  name: 'BCA',
  account: '1234567890',
  holder: 'PT Taily',
  qrUrl: '/lovable-uploads/9b3f6bab-6e07-4471-9b25-85617758e728.png' // Using existing placeholder
}

export function getPaymentProvider(key?: 'manual' | 'xendit' | 'other') {
  const mode = 'manual' as const // Later: from env
  
  if (key === 'manual' || mode === 'manual') {
    return new ManualProvider(BANK_CONFIG)
  }
  
  // return new XenditProvider() // when moving to gateway
  return new ManualProvider(BANK_CONFIG)
}

export { BANK_CONFIG }