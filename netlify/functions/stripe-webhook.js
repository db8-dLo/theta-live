// Stripe webhook handler for the trial membership (Stripe -> Klaviyo + Thinkific).
//
// This is the coded equivalent of the Make.com "Integration Stripe, Klaviyo" scenario,
// built to match it exactly and to do the two things Make couldn't do cleanly:
//   1. Detect a trial CONVERTING to paid precisely (fires once, never on renewals),
//      using the event's previous_attributes.
//   2. Split the customer's name into first/last for Thinkific and Klaviyo (with a fallback).
//
// Routes (mirror the Make router, keyed on the raw Stripe event):
//   customer.subscription.created                 -> Started Trial            (Klaviyo)
//     (or, if a no-trial sub is ever created active -> treated as a conversion)
//   customer.subscription.updated (trialing->active) -> Became Member + enroll (Klaviyo + Thinkific)
//   customer.subscription.deleted                 -> Canceled Subscription    (Klaviyo)
//
// IMPORTANT: this webhook receives events for the WHOLE Stripe account, including
// existing/grandfathered members and any other product. Every route first confirms the
// subscription is on one of OUR membership prices (by PRICE ID) before doing anything.
// Anything else is ignored. (This is the "price-ID gate" the Make version lacks.)
//
// Metric names match what's already live in Klaviyo from the Make build:
//   "Started Trial", "Became Member", "Canceled Subscription".
//
// Required environment variables (Netlify -> Site settings -> Environment variables):
//   STRIPE_SECRET_KEY                - secret key (sk_test_... first, sk_live_... at launch)
//   STRIPE_WEBHOOK_SECRET            - signing secret from the Stripe webhook endpoint (whsec_...)
//   STRIPE_PRICE_MEMBERSHIP_MONTHLY  - the CA$150/mo membership Price ID (price_...)
//   STRIPE_PRICE_MEMBERSHIP_ANNUAL   - the CA$1,500/yr membership Price ID (price_...)
//   KLAVIYO_PRIVATE_KEY              - Klaviyo PRIVATE key (pk_...), server-side only
//   THINKIFIC_ACCESS_TOKEN           - Thinkific API access token ("Authorization: Bearer")
//   THINKIFIC_COURSE_IDS             - comma-separated course IDs, e.g.
//                                      "931233,1620437,931262,1059171,1679752,1654941"
//   KLAVIYO_REVISION                 - (optional) Klaviyo API revision date; defaults below
//
// Netlify note: signature verification needs the RAW request body. Netlify passes
// event.body as the raw string, which is exactly what we verify against.

const crypto = require("crypto");
const KLAVIYO_REVISION = process.env.KLAVIYO_REVISION || "2024-10-15";
const KLAVIYO_LIST_FREE_TRIAL = "SPeeCa"; // "Free Trial Leads" list

// ---- Stripe signature verification (no SDK, matches the no-dependency setup) ----
function verifyStripe(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(",").forEach(kv => {
    const [k, v] = kv.split("=");
    parts[k] = v;
  });
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(parts.t + "." + rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Returns "monthly" / "annual" if the subscription is on one of OUR membership prices,
// otherwise null (e.g. a grandfathered member on an old price, or any other product -> ignored).
function membershipBilling(sub) {
  const monthly = process.env.STRIPE_PRICE_MEMBERSHIP_MONTHLY;
  const annual = process.env.STRIPE_PRICE_MEMBERSHIP_ANNUAL;
  const items = (sub && sub.items && sub.items.data) || [];
  for (const it of items) {
    const pid = it.price && it.price.id;
    if (monthly && pid === monthly) return "monthly";
    if (annual && pid === annual) return "annual";
  }
  return null;
}

// Split a full name into { first, last } for Thinkific (which requires both).
// Handles the edge cases we flagged: single-word names, extra middle names, empties.
function splitName(fullName, email) {
  const raw = (fullName || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    const local = (email || "member").split("@")[0];
    return { first: local, last: "Member" }; // no name on file -> use email local part
  }
  const parts = raw.split(" ");
  const first = parts[0];
  // Multi-word: everything after the first word is the last name ("Mary Jane Watson" -> "Jane Watson").
  // Single-word (mononym like "Cher"): reuse it as the last name so Thinkific accepts it.
  const last = parts.length > 1 ? parts.slice(1).join(" ") : first;
  return { first, last };
}

// Name attributes for a KLAVIYO profile. Unlike splitName (Thinkific requires both),
// we set only what we truly have — no email-local-part fallback — so a missing name
// lets the email template fall back cleanly (e.g. {{ first_name|default:'there' }}).
function klaviyoNameAttrs(fullName) {
  const raw = (fullName || "").replace(/\s+/g, " ").trim();
  if (!raw) return {};
  const parts = raw.split(" ");
  const attrs = { first_name: parts[0] };
  if (parts.length > 1) attrs.last_name = parts.slice(1).join(" ");
  return attrs;
}

async function stripeGet(path) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { "Authorization": "Bearer " + key } });
    return await r.json();
  } catch (e) { console.error("Stripe GET failed:", path, e); return null; }
}

// Fetch the customer once; we need both email (Klaviyo + Thinkific) and name (Thinkific).
async function stripeCustomer(customerId) {
  if (!customerId) return null;
  return await stripeGet("customers/" + customerId);
}

// ---- Klaviyo server-side event (triggers metric-based flows) ----
// unique_id = the Stripe event id, so a Stripe retry can't double-record the event.
async function klaviyoEvent(email, metricName, properties, uniqueId, fullName) {
  const key = process.env.KLAVIYO_PRIVATE_KEY;
  if (!key || !email) return;
  const attributes = {
    properties: properties || {},
    metric: { data: { type: "metric", attributes: { name: metricName } } },
    profile: { data: { type: "profile", attributes: Object.assign({ email: email }, klaviyoNameAttrs(fullName)) } },
  };
  if (uniqueId) attributes.unique_id = uniqueId;
  try {
    const r = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        "Authorization": "Klaviyo-API-Key " + key,
        "revision": KLAVIYO_REVISION,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({ data: { type: "event", attributes } }),
    });
    if (!r.ok) console.error("Klaviyo event rejected:", metricName, r.status, await r.text());
  } catch (e) { console.error("Klaviyo event failed:", metricName, e); }
}

// ---- Klaviyo list subscribe (adds the profile to a list, e.g. "Free Trial Leads") ----
async function klaviyoAddToList(email, listId, fullName) {
  const key = process.env.KLAVIYO_PRIVATE_KEY;
  if (!key || !email || !listId) return;
  try {
    const r = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
      method: "POST",
      headers: {
        "Authorization": "Klaviyo-API-Key " + key,
        "revision": KLAVIYO_REVISION,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: { data: [{ type: "profile", attributes: Object.assign({
              email: email,
              subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
            }, klaviyoNameAttrs(fullName)) }] },
          },
          relationships: { list: { data: { type: "list", id: listId } } },
        },
      }),
    });
    if (!r.ok) console.error("Klaviyo list-add rejected:", listId, r.status, await r.text());
  } catch (e) { console.error("Klaviyo list-add failed:", listId, e); }
}

// ---- Thinkific: find-or-create the user (with a real first/last name), then enroll ----
async function thinkificEnroll(email, fullName) {
  const token = process.env.THINKIFIC_ACCESS_TOKEN;
  const courseIds = (process.env.THINKIFIC_COURSE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!token || !courseIds.length || !email) { console.warn("Thinkific not fully configured; skipping enroll"); return; }
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  // find existing user
  let userId = null;
  try {
    const r = await fetch("https://api.thinkific.com/api/public/v1/users?query[email]=" + encodeURIComponent(email), { headers });
    const d = await r.json();
    if (!r.ok) console.error("Thinkific user lookup rejected:", r.status, JSON.stringify(d));
    else if (d && d.items && d.items.length) userId = d.items[0].id;
  } catch (e) { console.error("Thinkific user lookup failed:", e); }

  // create if missing (empty password -> Thinkific sends an Express Sign-In link)
  if (!userId) {
    const { first, last } = splitName(fullName, email);
    try {
      const r = await fetch("https://api.thinkific.com/api/public/v1/users", {
        method: "POST", headers,
        body: JSON.stringify({ email: email, first_name: first, last_name: last }),
      });
      const d = await r.json();
      if (!r.ok) console.error("Thinkific user create rejected:", r.status, JSON.stringify(d));
      else userId = d && d.id;
    } catch (e) { console.error("Thinkific user create failed:", e); }
  }
  if (!userId) { console.error("No Thinkific user id for", email); return; }

  // enroll in each course (re-enrolling an existing user is harmless)
  for (const cid of courseIds) {
    try {
      const r = await fetch("https://api.thinkific.com/api/public/v1/enrollments", {
        method: "POST", headers,
        body: JSON.stringify({ course_id: Number(cid), user_id: userId, activated_at: new Date().toISOString() }),
      });
      if (!r.ok) console.error("Thinkific enroll rejected for course", cid, r.status, await r.text());
    } catch (e) { console.error("Thinkific enroll failed for course", cid, e); }
  }
}

// The "became a paying member" path: enroll in Thinkific + fire Klaviyo "Became Member".
// Fires exactly once per person (at real conversion), never on renewals.
async function handleConversion(sub, billing, eventId) {
  const cust = await stripeCustomer(sub.customer);
  const email = cust && cust.email;
  const name = cust && cust.name;
  await thinkificEnroll(email, name);
  await klaviyoEvent(email, "Became Member", { plan: "membership", billing: billing }, eventId, name);
}

exports.handler = async function (event) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"]);
  const raw = event.body || "";

  if (!secret || !verifyStripe(raw, sig, secret)) {
    return { statusCode: 400, body: "Invalid signature" };
  }

  let evt;
  try { evt = JSON.parse(raw); } catch (e) { return { statusCode: 400, body: "Bad payload" }; }

  try {
    const obj = (evt.data && evt.data.object) || {};          // the subscription (for sub.* events)
    const prev = (evt.data && evt.data.previous_attributes) || {};
    const billing = membershipBilling(obj);                   // null = not our membership -> ignore

    if (evt.type === "customer.subscription.created" && billing) {
      if (obj.status === "active") {
        // Rare: a membership created already-active (a no-trial/direct buy) -> immediate member.
        await handleConversion(obj, billing, evt.id);
      } else {
        // Normal path: created in "trialing" -> the trial has started.
        const cust = await stripeCustomer(obj.customer);
        const email = cust && cust.email;
        const name = cust && cust.name;
        await klaviyoEvent(email, "Started Trial",
          { plan: "membership", billing: billing }, evt.id, name);
        await klaviyoAddToList(email, KLAVIYO_LIST_FREE_TRIAL, name);
      }
    }

    else if (evt.type === "customer.subscription.updated" && billing) {
      // The trial converting to paid: status flips trialing -> active. (active status means
      // the day-7 charge succeeded; a failed charge would go past_due, not active.)
      if (prev.status === "trialing" && obj.status === "active") {
        await handleConversion(obj, billing, evt.id);
      }
      // Any other update (card change, quantity, etc.) is intentionally ignored.
    }

    else if (evt.type === "customer.subscription.deleted" && billing) {
      const cust = await stripeCustomer(obj.customer);
      await klaviyoEvent(cust && cust.email, "Canceled Subscription",
        { plan: "membership", billing: billing }, evt.id, cust && cust.name);
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    // Still return 200 so Stripe doesn't retry a handler bug forever.
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

// Exported for local testing (see stripe-webhook.test.js). No effect in production.
if (process.env.NODE_ENV === "test") {
  module.exports._internals = { verifyStripe, membershipBilling, splitName };
}
