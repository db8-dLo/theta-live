// TEMPORARY test endpoint — confirms ACTIVECAMPAIGN_API_URL / ACTIVECAMPAIGN_API_KEY
// are set correctly and that list 7 is "Theta Intro Students - Newsletter". Remove
// once verified; this isn't meant to stay in production.

exports.handler = async function () {
  const base = (process.env.ACTIVECAMPAIGN_API_URL || "").replace(/\/+$/, "");
  const key = process.env.ACTIVECAMPAIGN_API_KEY;
  if (!base || !key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ACTIVECAMPAIGN_API_URL or ACTIVECAMPAIGN_API_KEY not set" }) };
  }

  const res = await fetch(base + "/api/3/lists/7", {
    headers: { "Api-Token": key },
  });
  const data = await res.json();
  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: "AC request failed", status: res.status, data }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, list: data.list ? { id: data.list.id, name: data.list.name } : data }),
  };
};
