import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 5; // Lower limit for payment requests
const RATE_LIMIT_WINDOW = 60000; // 1 minute

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

    // Authentication required for payment processing
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Payment authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting by user ID
    const userId = user.id;
    const now = Date.now();
    const userRateLimit = rateLimitMap.get(userId);

    if (userRateLimit) {
      if (now < userRateLimit.resetTime) {
        if (userRateLimit.count >= RATE_LIMIT_REQUESTS) {
          return new Response(JSON.stringify({ 
            error: 'Too many payment requests. Please try again later.' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        userRateLimit.count++;
      } else {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    const { amount, currency = 'USD', description = 'Taily Keychain Order', order_id, customer_email }: PaymentRequest = await req.json();

    // Validate payment request
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payment amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('Order verification failed:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Secure payment request:', { 
      userId: user.id, 
      orderId: order_id, 
      amount, 
      timestamp: new Date().toISOString() 
    });

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