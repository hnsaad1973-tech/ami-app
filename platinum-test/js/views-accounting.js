// Platinum Operations Platform — accounting screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== ACCOUNTING =====
  async a_receipts() {
    const pol = await list("policies"); LAST = await list("receipts");
    V().innerHTML = `<div class="card"><h2>Record a receipt</h2><div class="grid">
        <label>Policy no.<select id="r_pol">${pol.filter((p) => p.uw_status === "approved" && Number(p.balance) > 0).map((p) => `<option value="${esc(p.policy_no)}">${esc(p.policy_no)} — ${esc(p.holder)} (${money(p.balance)})</option>`).join("")}</select></label>
        <label>Amount (USD)<input id="r_amt" inputmode="decimal"></label><label>Date<input type="date" id="r_date" value="${today()}"></label>
        <label>Paid by<select id="r_m"><option value="bank">Bank</option><option value="cash">Cash</option><option value="momo">Mobile money</option><option value="cheque">Cheque</option></select></label>
        <label>Reference<input id="r_ref"></label></div><button class="btn" id="r_go">Post receipt</button></div>
      <div class="card"><div class="row" style="justify-content:space-between"><h2>Receipts</h2>${csvBtn("receipts")}</div><div class="tablewrap" id="t"></div></div>`;
    table("t", LAST); bindCsv();
    $("r_go").onclick = run(async () => { await api({ action: "add_receipt", r: { policy_no: $("r_pol").value, amount: $("r_amt").value, rdate: $("r_date").value, method: $("r_m").value, ref: $("r_ref").value } }); say("Receipt posted"); VIEWS.a_receipts(); });
  },
  async a_debtors() {
    LAST = (await bapi({ action: "debtors" })).rows;
    const by = {}; LAST.forEach((r) => { by[r.agent] = (by[r.agent] || 0) + Number(r.balance || 0); });
    V().innerHTML = kpis([["Total owed (USD)", money(LAST.reduce((a, r) => a + Number(r.balance || 0), 0))], ["Through agents (USD)", money(LAST.filter((r) => r.agent !== "Direct").reduce((a, r) => a + Number(r.balance || 0), 0))], ["Direct (USD)", money(by.Direct || 0)], ["Over 60 days", LAST.filter((r) => r.days_outstanding > 60).length, LAST.some((r) => r.days_outstanding > 60)]]) +
      `<div class="card"><h2>Owed by agent / broker</h2><div class="tablewrap" id="t1"></div></div>
      <div class="card"><div class="row" style="justify-content:space-between"><h2>Premium owed to Platinum</h2>${csvBtn("debtors")}</div><div class="row"><select id="db_ag"><option value="">All agents and direct</option>${Object.keys(by).map((k) => `<option>${esc(k)}</option>`).join("")}</select></div><div class="tablewrap" id="t"></div></div>`;
    table("t1", Object.entries(by).map(([agent, owed]) => ({ agent, policies: LAST.filter((r) => r.agent === agent).length, owed })), { nosearch: true });
    const draw = () => table("t", LAST.filter((r) => !$("db_ag").value || r.agent === $("db_ag").value)); $("db_ag").onchange = draw; draw(); bindCsv();
  },
  async a_comm() {
    const pay = ["accountant", "admin"].includes(ME.role);
    const [{ rows }, { books: bk, payments }] = await Promise.all([gapi({ action: "agent_list" }), gapi({ action: "agent_books" })]);
    LAST = rows.map((r) => ({ code: r.code, name: r.name, earned: r.earned, paid: r.paid, owed: r.owed }));
    V().innerHTML = kpis([["Commission payable (books)", money(bk.payable_control)], ["Sum of agent balances", money(bk.payable_agents)], ["Not linked to an agent", money(bk.payable_unlinked), Math.abs(Number(bk.payable_unlinked)) >= 0.01], ["Commission expense to date", money(bk.expense_total)]]) +
      `<div class="card"><p class="note"><b>${bk.balanced ? "✓ Books agree" : "⚠ Check needed"}:</b> commission is posted once, when the client pays — Dr Commission expense / Cr Commission payable, under the agent's name. Paying an agent posts Dr Commission payable / Cr Bank or Cash. Each agent's balance is their part of the one Commission payable account, so there is no second set of books. A payment can never be more than the agent is owed, and the same payment cannot be posted twice by mistake.</p></div>` +
      (pay ? `<div class="card"><h2>Pay an agent / broker</h2><div class="grid"><label>Agent / broker<select id="k_b"><option value="">Choose…</option>${rows.filter((r) => Number(r.owed) > 0).map((r) => `<option value="${r.id}" data-owed="${r.owed}">${esc(r.code + " · " + r.name)} — owed USD ${money(r.owed)}</option>`).join("")}</select></label>
        <label>Amount (USD)<input id="k_a" inputmode="decimal"></label><label>Date paid<input id="k_d" type="date" value="${today()}"></label>
        <label>Paid by<select id="k_m"><option value="bank">Bank</option><option value="cash">Cash</option></select></label><label>Reference (cheque / transfer no.)<input id="k_r"></label></div>
        <label style="flex-direction:row;align-items:center;gap:8px" class="hide" id="k_dupL"><input type="checkbox" id="k_dup" style="width:22px;min-height:22px"> This is a second payment — post it again</label>
        <div class="row"><button class="btn" id="k_go">Post payment</button><button class="btn ghost" id="k_all">Pay all owed</button></div></div>` : "") +
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>What each agent is owed</h2>${csvBtn("commissions")}</div><div class="tablewrap" id="t"></div></div>
      <div class="card"><h2>Payments made</h2><div class="tablewrap" id="t2"></div></div>`;
    table("t", LAST); table("t2", payments); bindCsv();
    if (!pay) return;
    $("k_all").onclick = () => { const o = $("k_b").selectedOptions[0]; if (o && o.dataset.owed) $("k_a").value = Number(o.dataset.owed).toFixed(2); };
    $("k_go").onclick = run(async () => {
      if (!$("k_b").value) throw new Error("Choose the agent");
      const who = $("k_b").selectedOptions[0].text.split(" — ")[0];
      if (!confirm(`Post USD ${money($("k_a").value)} paid to ${who} on ${$("k_d").value}?`)) return;
      try {
        const x = await gapi({ action: "agent_pay", c: { agent_id: $("k_b").value, amount: $("k_a").value, date: $("k_d").value, method: $("k_m").value, ref: $("k_r").value, confirm_duplicate: $("k_dup").checked } });
        say(`USD ${money(x.paid)} paid to ${x.name} posted · still owed USD ${money(x.owed_after)}`); VIEWS.a_comm();
      } catch (e) { if (/already posted/.test(e.message)) $("k_dupL").classList.remove("hide"); throw e; }
    });
  },
});
