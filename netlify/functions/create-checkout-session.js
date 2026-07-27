// Creates a Stripe Embedded Checkout session for the join page.
//
// Required environment variables (Netlify dashboard -> Site settings -> Environment variables):
//   STRIPE_SECRET_KEY   - secret key from the CLIENT'S Stripe account (sk_test_... first, sk_live_... at launch)
//   STRIPE_PRICE_FULL   - Price ID for the one-time $1,997 payment (price_...)
//   STRIPE_PRICE_3PAY   - Price ID for the $747/month subscription used as the 3-pay plan (price_...)
//
// The 3-pay plan checks out as a subscription; a follow-up automation must stop it
// after the 3rd payment (subscription schedule or Zap) — see project log, Phase 2 notes.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: "Stripe not configured" }) };

  let plan = "full";
  try { plan = (JSON.parse(event.body || "{}").plan === "3pay") ? "3pay" : "full"; } catch (e) {}

  const price = plan === "3pay" ? process.env.STRIPE_PRICE_3PAY : process.env.STRIPE_PRICE_FULL;
  if (!price) return { statusCode: 500, body: JSON.stringify({ error: "Price not configured" }) };

  const origin = (event.headers && (event.headers.origin || ("https://" + event.headers.host))) || "";

  const params = new URLSearchParams();
  params.append("ui_mode", "embedded");
  params.append("mode", plan === "3pay" ? "subscription" : "payment");
  params.append("line_items[0][price]", price);
  params.append("line_items[0][quantity]", "1");
  params.append("return_url", origin + "/thank-you.html?session_id={CHECKOUT_SESSION_ID}");
  params.append("metadata[plan]", plan);
  params.append("metadata[source]", "theta-website-join");
  if (plan === "3pay") {
    params.append("subscription_data[metadata][plan]", "3pay");
    params.append("subscription_data[metadata][source]", "theta-website-join");
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
