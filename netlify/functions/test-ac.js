// TEMPORARY — removes the test list-membership created during verification
// (contactList id 50804: dangelo.isaiah@gmail.com on list 7). Leaves the
// underlying contact record untouched. Delete this file after running once.

exports.handler = async function () {
  const base = (process.env.ACTIVECAMPAIGN_API_URL || "").replace(/\/+$/, "");
  const key = process.env.ACTIVECAMPAIGN_API_KEY;
  if (!base || !key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ACTIVECAMPAIGN_API_URL or ACTIVECAMPAIGN_API_KEY not set" }) };
  }

  const res = await fetch(base + "/api/3/contactLists/50804", {
    method: "DELETE",
    headers: { "Api-Token": key },
  });

  if (res.status !== 200 && res.status !== 204) {
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { statusCode: 502, body: JSON.stringify({ error: "delete failed", status: res.status, data }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, deleted: 50804 }) };
};
