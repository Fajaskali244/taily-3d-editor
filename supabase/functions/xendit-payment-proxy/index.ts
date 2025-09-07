import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  order_id: string;
  customer_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { amount, currency = 'USD', description = 'Taily Keychain Order', order_id, customer_email }: PaymentRequest = await req.json();

    console.log('Payment request received:', { amount, currency, description, order_id, customer_email });

    // TODO: Implement actual Xendit integration when API key is provided
    // const xenditApiKey = Deno.env.get('XENDIT_API_KEY');
    // 
    // if (!xenditApiKey) {
    //   throw new Error('Xendit API key not configured');
    // }
    //
    // const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(xenditApiKey + ':')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     external_id: order_id,
    //     amount: amount,
    //     payer_email: customer_email,
    //     description: description,
    //     currency: currency
    //   })
    // });
    //
    // const xenditData = await xenditResponse.json();

    // For now, return a placeholder success response
    const placeholderResponse = {
      success: true,
      payment_url: `https://placeholder-payment-url.com/pay/${order_id}`,
      invoice_id: `placeholder_${order_id}_${Date.now()}`,
      external_id: order_id,
      amount: amount,
      currency: currency,
      description: description,
      status: 'pending',
      message: 'This is a placeholder response. Xendit integration will be completed when API key is provided.'
    };

    console.log('Returning placeholder payment response:', placeholderResponse);

    return new Response(JSON.stringify(placeholderResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in xendit-payment-proxy function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Payment processing failed',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);