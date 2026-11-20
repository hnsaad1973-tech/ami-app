// Platinum Operations Platform — gm ceo screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== GM / CEO =====
  async g_over() {
    const { d } = await api({ action: "dashboard" });
    V().innerHTML = kpis([
      ["Premium written", money(d.gwp)], ["Result so far", money(d.result), d.result < 0], ["Premium owed to us", money(d.receivable)], ["Cash and bank", money(d.cash), d.cash < 0],
      ["Claims reserve", money(d.claims_reserve)], ["Policies in force", d.policies], ["Waiting for approval", d.referred], ["Waiting for Board", d.board_pending, d.board_pending > 0],
      ["Open claims", d.open_claims], ["Urgent alerts", d.urgent, d.urgent > 0], ["Compliance overdue", d.compliance_overdue, d.compliance_overdue > 0],
      ["Kept by Platinum", d.retained_pct == null ? "—" : (d.retained_pct * 100).toFixed(1) + "%"], ["Product rules not signed", d.rules_unsigned, d.rules_unsigned > 0],
    ]) + `<div class="card"><h2>Urgent</h2><div class="tablewrap" id="t"></div></div>`;
    table("t", (await list("alerts")).filter((a) => a.sev === 1), { hide: ["sev"] });
  },
  async g_alerts() { LAST = await list("alerts"); V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>Alerts</h2>${csvBtn("alerts")}</div><p class="note">Renewals due, expired policies, approvals waiting, documents not checked, premium unpaid over 60 days, compliance deadlines.</p><div class="tablewrap" id="t"></div></div>`; table("t", LAST, { hide: ["sev"] }); bindCsv(); },
  async c_team() {
    const tapi = async (body) => { const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(SB_URL + "/functions/v1/platteam", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ error: "Server error" })); if (!r.ok || j.error) throw new Error(j.error || "Error"); return j; };
    const { users, removed, licence: L } = await tapi({ action: "list" }); LAST = users;
    const RN = { admin: "CEO — everything", gm: "General Manager", accountant: "Accounting", underwriter: "Underwriting", sales: "Sales", board: "Board", viewer: "View only" };
    const full = L.used >= L.max_users;
    V().innerHTML = kpis([["Users", L.used + " of " + L.max_users, full], ["Places left", L.max_users - L.used], ["Removed", removed.length]]) +
      `<div class="card"><h2>${full ? "All " + L.max_users + " places are in use" : "Add or change a person"}</h2><p class="note">Licence: ${esc(L.licensee)} — up to ${L.max_users} users. Adding a person creates their sign-in at once: they open the Platinum link, enter their email and sign in with the code sent to them. To change someone, enter the same email.</p>
        <div class="grid"><label>Email<input id="u_e" type="email"></label><label>Name<input id="u_n"></label><label>Position<input id="u_t" placeholder="e.g. Sales officer"></label>
        <label>Access<select id="u_r">${Object.entries(RN).filter(([k]) => k !== "viewer").map(([k, v]) => `<option value="${k}"${k === "sales" ? " selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Approval limit (USD)<input id="u_l" inputmode="decimal" placeholder="Underwriting 250000 · GM 1000000"></label></div>
        <button class="btn" id="u_go">Save person</button></div>
      <div class="card"><div class="row" style="justify-content:space-between"><h2>Who has access</h2>${csvBtn("team")}</div><div class="tablewrap" id="t"></div></div>
      ${removed.length ? `<div class="card"><h2>Removed (no access)</h2><div class="tablewrap" id="t2"></div></div>` : ""}`;
    table("t", users.map((u) => ({ ...u, access: RN[u.role] || u.role })), { hide: ["role"], extra: (u) => `<button class="btn ghost sm" data-ue="${esc(u.email)}">Edit</button>${u.email === (ME.email || "").toLowerCase() ? "" : ` <button class="btn ghost sm" data-ux="${esc(u.email)}">Remove</button>`}` });
    if (removed.length) table("t2", removed.map((u) => ({ ...u, access: RN[u.role] || u.role })), { hide: ["role"], extra: (u) => `<button class="btn ghost sm" data-ur="${esc(u.email)}">Restore</button>` });
    bindCsv();
    document.querySelectorAll("[data-ue]").forEach((b) => (b.onclick = () => { const u = users.find((x) => x.email === b.dataset.ue);
      $("u_e").value = u.email; $("u_n").value = u.name || ""; $("u_t").value = u.title || ""; $("u_r").value = u.role; $("u_l").value = u.authority_limit ?? ""; $("u_e").scrollIntoView({ behavior: "smooth", block: "center" }); }));
    document.querySelectorAll("[data-ux]").forEach((b) => (b.onclick = run(async () => { if (!confirm(`Remove ${b.dataset.ux}? Their access stops immediately. You can restore them later.`)) return;
      await tapi({ action: "remove", email: b.dataset.ux }); say("Removed — access stopped"); VIEWS.c_team(); })));
    document.querySelectorAll("[data-ur]").forEach((b) => (b.onclick = run(async () => { await tapi({ action: "restore", email: b.dataset.ur }); say("Restored"); VIEWS.c_team(); })));
    $("u_go").onclick = run(async () => {
      const x = await tapi({ action: "save", u: { email: $("u_e").value, name: $("u_n").value, title: $("u_t").value, role: $("u_r").value, authority_limit: $("u_l").value } });
      say(x.created ? "Added — they can sign in now with their email code" : "Saved"); VIEWS.c_team(); });
  },
  async c_rules() { await rulesView(true); },
  async c_audit() { LAST = await list("audit"); V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>Audit trail — who did what</h2>${csvBtn("audit")}</div><div class="tablewrap" id="t"></div></div>`; table("t", LAST); bindCsv(); },

});
