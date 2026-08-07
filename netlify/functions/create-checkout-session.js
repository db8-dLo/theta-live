// Creates a Stripe Embedded Checkout session (used by join.html and membership.html).
//
// Required environment variables (Netlify -> Site settings -> Environment variables):
//   STRIPE_SECRET_KEY                 - LIVE secret key from the CLIENT'S Stripe account (sk_live_...)
//   Masterclass (join.html):
//     STRIPE_PRICE_FULL               - one-time $1,997 payment (price_...)
//     STRIPE_PRICE_3PAY               - $747/month subscription used as the 3-pay plan (price_...)
//   Membership (membership.html):
//     STRIPE_PRICE_MEMBERSHIP_MONTHLY - $150/month subscription (price_...)
//     STRIPE_PRICE_MEMBERSHIP_ANNUAL  - $1,500/year subscription (price_...)
//
// The membership plans start with a 7-day free trial (card collected up front).
// The 3-pay plan checks out as a subscription; a follow-up automation must stop it
// after the 3rd payment — see project log, Phase 2 notes.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: "Stripe not configured" }) };

  // Plan catalog. Each entry names the env var holding its price, the checkout mode,
  // an optional free-trial length (days), and a source tag for reporting.
  const PLANS = {
    full:    { priceEnv: "STRIPE_PRICE_FULL",               mode: "payment",      source: "theta-website-join" },
    "3pay":  { priceEnv: "STRIPE_PRICE_3PAY",               mode: "subscription", source: "theta-website-join" },
    monthly: { priceEnv: "STRIPE_PRICE_MEMBERSHIP_MONTHLY", mode: "subscription", trialDays: 7, source: "theta-website-membership" },
    annual:  { priceEnv: "STRIPE_PRICE_MEMBERSHIP_ANNUAL",  mode: "subscription", trialDays: 7, source: "theta-website-membership" },
  };

  let requested = "full";
  try { requested = JSON.parse(event.body || "{}").plan || "full"; } catch (e) {}
  const plan = PLANS[requested] ? requested : "full";
  const cfg = PLANS[plan];

  const price = process.env[cfg.priceEnv];
  if (!price) return { statusCode: 500, body: JSON.stringify({ error: "Price not configured" }) };

  const origin = (event.headers && (event.headers.origin || ("https://" + event.headers.host))) || "";

  const params = new URLSearchParams();
  params.append("ui_mode", "embedded");
  params.append("mode", cfg.mode);
  params.append("line_items[0][price]", price);
  params.append("line_items[0][quantity]", "1");
  // Collects name + billing address and syncs it onto the newly created Customer,
  // which is what the Stripe webhook reads (cust.name) to personalize Klaviyo/Thinkific.
  params.append("billing_address_collection", "required");
  params.append("return_url", origin + "/thank-you.html?session_id={CHECKOUT_SESSION_ID}");
  params.append("metadata[plan]", plan);
  params.append("metadata[source]", cfg.source);
  if (cfg.mode === "subscription") {
    params.append("subscription_data[metadata][plan]", plan);
    params.append("subscription_data[metadata][source]", cfg.source);
    if (cfg.trialDays) {
      params.append("subscription_data[trial_period_days]", String(cfg.trialDays));
    }
  }
  // Uncomment once Stripe Tax is enabled on the account (CF checkout charges +tax today):
  // params.append("automatic_tax[enabled]", "true");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + key,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Stripe error:", data && data.error && data.error.message);
    return { statusCode: 502, body: JSON.stringify({ error: "Could not start checkout" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientSecret: data.client_secret }),
  };
};
