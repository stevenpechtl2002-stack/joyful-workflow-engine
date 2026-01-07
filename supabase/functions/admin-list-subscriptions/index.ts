// Edge Function to list all Stripe subscriptions for admin dashboard
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-LIST-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not found");
    
    // Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      throw new Error("Unauthorized: Admin role required");
    }
    logStep("Admin verified", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // List all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
    });

    logStep("Subscriptions fetched", { count: subscriptions.data.length });

    // Transform data for frontend
    const formattedSubs = subscriptions.data.map((sub: Stripe.Subscription) => ({
      id: sub.id,
      customer: typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer).id,
      customer_email: typeof sub.customer === 'object' ? (sub.customer as Stripe.Customer).email : null,
      status: sub.status,
      current_period_end: sub.current_period_end,
      trial_end: sub.trial_end,
      metadata: sub.metadata,
      items: {
        data: sub.items.data.map((item: Stripe.SubscriptionItem) => ({
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            product: typeof item.price.product === 'string' ? item.price.product : (item.price.product as Stripe.Product).id,
          },
        })),
      },
    }));

    return new Response(JSON.stringify({ subscriptions: formattedSubs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
