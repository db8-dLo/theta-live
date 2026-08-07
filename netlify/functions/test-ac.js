// TEMPORARY test endpoint — adds a test contact to AC list 7 to confirm the real
// sync + list-attach flow works end to end. Remove once verified.

exports.handler = async function () {
  const base = (process.env.ACTIVECAMPAIGN_API_URL || "").replace(/\/+$/, "");
  const key = process.env.ACTIVECAMPAIGN_API_KEY;
  if (!base || !key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ACTIVECAMPAIGN_API_URL or ACTIVECAMPAIGN_API_KEY not set" }) };
  }

  const email = "dangelo.isaiah@gmail.com";
  const headers = { "Api-Token": key, "Content-Type": "application/json" };

  const syncRes = await fetch(base + "/api/3/contact/sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ contact: { email: email, firstName: "Dangelo", lastName: "Test" } }),
  });
  const syncData = await syncRes.json();
  if (!syncRes.ok) {
    return { statusCode: 502, body: JSON.stringify({ step: "sync", status: syncRes.status, data: syncData }) };
  }
  const contactId = syncData.contact && syncData.contact.id;

  const listRes = await fetch(base + "/api/3/contactLists", {
    method: "POST",
    headers,
    body: JSON.stringify({ contactList: { list: "7", contact: contactId, status: 1 } }),
  });
  const listData = await listRes.json();
  if (!listRes.ok) {
    return { statusCode: 502, body: JSON.stringify({ step: "listAdd", status: listRes.status, data: listData }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, contactId: contactId, contactList: listData.contactList }),
  };
};
