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
    const u = await list("users");
    V().innerHTML = `<div class="card"><h2>Who has access</h2><div class="tablewrap" id="t"></div></div>
      <div class="card"><h2>Add or change a person</h2><div class="grid">
        <label>Email<input id="u_e" type="email"></label><label>Name<input id="u_n"></label><label>Position<input id="u_t" placeholder="e.g. Sales officer"></label>
        <label>Access<select id="u_r">
          <option value="sales">Sales — sales section only</option><option value="underwriter">Underwriting — sales + underwriting</option>
          <option value="accountant">Accounting — accounting section only</option><option value="gm">General Manager — sales, underwriting, accounting, GM</option>
          <option value="board">Board — board report and above-limit approvals</option><option value="admin">CEO — everything</option><option value="viewer">View only</option></select></label>
        <label>Approval limit (USD)<input id="u_l" inputmode="decimal" placeholder="Underwriting 250000 · GM 1000000"></label></div>
        <p class="note">They need an AMI sign-in for the same email; ask Claude to set one up if they don't have one.</p><button class="btn" id="u_go">Save</button></div>`;
    table("t", u);
    $("u_go").onclick = run(async () => { await api({ action: "add_user", u: { email: $("u_e").value, name: $("u_n").value, title: $("u_t").value, role: $("u_r").value, authority_limit: $("u_l").value } }); say("Saved"); VIEWS.c_team(); });
  },
  async c_rules() { await rulesView(true); },
  async c_audit() { LAST = await list("audit"); V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>Audit trail — who did what</h2>${csvBtn("audit")}</div><div class="tablewrap" id="t"></div></div>`; table("t", LAST); bindCsv(); },

});
