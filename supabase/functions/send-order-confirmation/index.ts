import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify service role or webhook signature
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Check if service_role key is being used (for webhooks from Supabase)
    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    // Allow service_role key or verify JWT is valid
    if (token !== serviceRoleKey && token !== anonKey) {
      // Verify JWT token
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      
      const { error: authError } = await supabaseClient.auth.getUser()
      if (authError) {
        throw new Error('Unauthorized: Invalid authentication token')
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const resend = new Resend(resendApiKey);

    // Parse the webhook payload
    const { record } = await req.json();
    console.log('Order confirmation webhook triggered for order:', record);

    // Only send email if payment status is 'paid'
    if (record.payment_status !== 'paid') {
      return new Response(JSON.stringify({ message: 'Payment not confirmed yet' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', record.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        designs (
          name
        )
      `)
      .eq('order_id', record.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw new Error('Failed to fetch order items');
    }

    // Get user email from auth
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(record.user_id);
    
    if (userError || !user.user) {
      console.error('Error fetching user:', userError);
      throw new Error('Failed to fetch user email');
    }

    const customerEmail = user.user.email;

    // Create email content
    const itemsList = orderItems?.map(item => 
      `<li>${item.designs?.name || 'Custom Design'} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`
    ).join('') || '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Order Confirmation - Taily</h1>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">Order Details</h2>
          <p><strong>Order ID:</strong> ${record.id}</p>
          <p><strong>Total Amount:</strong> $${record.total_price}</p>
          <p><strong>Order Date:</strong> ${new Date(record.created_at).toLocaleDateString()}</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Items Ordered</h3>
          <ul style="list-style-type: none; padding: 0;">
            ${itemsList}
          </ul>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Shipping Address</h3>
          <p>${record.shipping_address}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666;">Thank you for your order! Your custom keychain will be processed and shipped soon.</p>
          <p style="color: #666;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'Taily <orders@taily.com>',
      to: [customerEmail],
      subject: `Order Confirmation #${record.id} - Taily`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Order confirmation email sent',
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in send-order-confirmation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
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