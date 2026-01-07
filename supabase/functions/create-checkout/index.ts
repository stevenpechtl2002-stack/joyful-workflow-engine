// Edge Function v6 - Combined setup fee + delayed subscription checkout
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { setup_price_id, subscription_price_id, tier_name } = await req.json();
    
    if (!setup_price_id || !subscription_price_id) {
      throw new Error("setup_price_id and subscription_price_id are required");
    }
    logStep("Request parsed", { setup_price_id, subscription_price_id, tier_name });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Calculate minimum contract end date (12 months from subscription start, which is 30 days from now)
    const subscriptionStartDate = new Date();
    subscriptionStartDate.setDate(subscriptionStartDate.getDate() + 30);
    
    const minContractEnd = new Date(subscriptionStartDate);
    minContractEnd.setMonth(minContractEnd.getMonth() + 12);

    // Create checkout session with:
    // 1. One-time setup fee (paid immediately)
    // 2. Subscription with 30-day trial (first payment after 30 days)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        // Setup fee - one-time payment
        {
          price: setup_price_id,
          quantity: 1,
        },
        // Monthly subscription with 30-day trial
        {
          price: subscription_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          min_contract_months: "12",
          min_contract_end: minContractEnd.toISOString(),
          tier_name: tier_name || "Voice Agent Pro",
          setup_paid: "true",
        },
      },
      success_url: `${req.headers.get("origin")}/portal/subscriptions?success=true`,
      cancel_url: `${req.headers.get("origin")}/portal/subscriptions?canceled=true`,
      metadata: {
        user_id: user.id,
        min_contract_months: "12",
        tier_name: tier_name || "Voice Agent Pro",
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      hasTrialPeriod: true,
      trialDays: 30 
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
