export type CreatePaymentInput = {
  orderId: string
  userEmail?: string | null
  total: number // IDR
  returnUrl: string // where to go after "paid" (future)
}

export type CreatePaymentResult = {
  provider: string
  status: 'instructions' | 'redirect' | 'error'
  payUrl: string // /orders/:id/pay for manual; invoice_url for gateways
  raw?: any
  message?: string
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
  verifyAndParseWebhook?(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<{ orderId: string; status: 'PAID' | 'FAILED'; raw: any }>
}