import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find trialing establishments whose trial has expired
    const now = new Date().toISOString();

    const { data: expired, error: fetchError } = await supabase
      .from("establishments")
      .select("id, name, trial_ends_at")
      .eq("plan_status", "trialing")
      .lt("trial_ends_at", now);

    if (fetchError) {
      console.error("Error fetching expired trials:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!expired || expired.length === 0) {
      console.log("No expired trials found");
      return new Response(JSON.stringify({ ok: true, expired: 0 }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const ids = expired.map((e) => e.id);
    console.log(`Expiring ${ids.length} trials:`, ids);

    // Update establishments
    const { error: updateError } = await supabase
      .from("establishments")
      .update({ plan_status: "inactive", plan_name: "free" })
      .in("id", ids);

    if (updateError) {
      console.error("Error updating establishments:", updateError.message);
    }

    // Update subscriptions
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .in("establishment_id", ids);

    if (subError) {
      console.error("Error updating subscriptions:", subError.message);
    }

    console.log(`Successfully expired ${ids.length} trials`);

    return new Response(
      JSON.stringify({ ok: true, expired: ids.length, ids }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("expire-trials error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
