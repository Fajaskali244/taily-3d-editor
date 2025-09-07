import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, context }: ChatRequest = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI assistant request:', { message, context });

    const systemPrompt = `You are Taily, an AI assistant specialized in helping users design custom keychains. You are friendly, creative, and knowledgeable about:

- Keychain design trends and aesthetics
- Color combinations and patterns
- Personalization ideas (names, dates, symbols)
- Materials and durability considerations
- Gift recommendations for different occasions
- Design layout and composition tips

You should:
- Provide helpful, creative suggestions for keychain designs
- Ask clarifying questions to understand the user's preferences
- Suggest color schemes, patterns, and personalization options
- Be enthusiastic about their creativity
- Keep responses concise but helpful
- Focus specifically on keychain design rather than general topics

Current context: ${context || 'User is designing a custom keychain'}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI assistant response generated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      response: aiResponse,
      usage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in openai-assistant-proxy function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});