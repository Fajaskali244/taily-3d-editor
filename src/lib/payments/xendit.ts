import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from './types'

export class XenditProvider implements PaymentProvider {
  async createPayment(_: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { 
      provider: 'xendit', 
      status: 'error', 
      payUrl: '#', 
      message: 'Xendit not configured' 
    }
  }
}