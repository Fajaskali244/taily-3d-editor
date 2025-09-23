import { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from './types'

export class ManualProvider implements PaymentProvider {
  constructor(
    private bank: { 
      name: string
      account: string
      holder: string
      qrUrl?: string 
    }
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      provider: 'manual',
      status: 'instructions',
      payUrl: `/orders/${input.orderId}/pay`,
      raw: { bank: this.bank, total: input.total }
    }
  }
}