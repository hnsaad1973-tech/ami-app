// Platinum Operations Platform — reinsurers screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== Reinsurer accounts (v5.3) =====
  async re_acc(id) {
    const d = await reapi({ action: "summary", id: typeof id === "number" ? id : RE_SEL }); RE_SEL = d.selected;
    const ac = d.access, boss = ac.boss, sel = d.reinsurers.find((r) => Number(r.id) === Number(d.selected)) || {};
    const pend = d.payments.filter((x) => x.status === "prepared");
    let bal = 0; const stmt = d.statement.map((l) => { bal += Number(l.credit || 0) - Number(l.debit || 0); return { date: String(l.date).slice(0, 10), details: l.memo, we_owe_more: l.credit, paid_or_less: l.debit, balance_owed: bal }; });
    LAST = stmt;
    V().innerHTML = kpis(d.reinsurers.map((r) => [r.name + " — we owe", money(r.owed_to_reinsurer)]).concat([["Due to us on claims", money(sel.recoverable || 0)], ["Waiting for approval", pend.length, pend.length > 0 && boss]])) +
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>Reinsurer</h2><select id="re_sel" style="max-width:340px">${d.reinsurers.map((r) => `<option value="${r.id}"${Number(r.id) === Number(d.selected) ? " selected" : ""}>${esc(r.name)} (${r.kind}, account ${esc(r.account)})</option>`).join("")}</select></div>
        <p class="note">Each policy posts the reinsurer's share automatically when it is issued: their share of the premium is what we owe them, less the commission they give us back. Their share of paid claims is what they owe us. Motor is under the Motor XL treaty — no share per policy (${d.motor_xl.n} motor policies, USD ${money(d.motor_xl.premium)} premium); Africa Re pays only large claims above Platinum's limit for a fixed quarterly XL premium.</p></div>
      ${pend.length && boss ? `<div class="card"><h2>Payments waiting for your approval</h2><div class="tablewrap" id="re_p"></div></div>` : ""}
      ${ac.prepare ? `<div class="card"><h2>${boss ? "Record a payment" : "Prepare a payment (posts after GM / CEO approval)"}</h2><div class="grid">
        <label>Type<select id="rp_dir"><option value="pay">We pay ${esc(sel.name || "")}</option><option value="receive">${esc(sel.name || "")} pays us (claims)</option></select></label>
        <label>Amount (USD)<input id="rp_a" inputmode="decimal"></label><label>Date<input id="rp_d" type="date" value="${today()}"></label>
        <label>Bank / cash<select id="rp_m"><option value="bank">Bank</option><option value="cash">Cash</option></select></label><label>Reference<input id="rp_r" placeholder="transfer no."></label><label>Note<input id="rp_n"></label></div>
        <div class="row"><button class="btn" id="rp_go">${boss ? "Post payment" : "Send for approval"}</button><button class="btn ghost" id="rp_all">Full balance</button></div></div>` : ""}
      <div class="card"><div class="row" style="justify-content:space-between"><h2>Statement — ${esc(sel.name || "")}</h2>${csvBtn("reinsurer-statement")}</div><div class="tablewrap" id="re_s"></div></div>
      ${d.cessions.length ? `<div class="card"><h2>Policies ceded to ${esc(sel.name || "")}</h2><div class="tablewrap" id="re_c"></div></div>` : ""}
      <div class="card"><h2>Payments</h2><div class="tablewrap" id="re_h"></div></div>
      ${boss ? `<div class="card"><h2>Add a reinsurer</h2><p class="note">For a new treaty or facultative reinsurer. It gets its own account in the books.</p><div class="grid"><label>Name<input id="ra_n"></label><label>Type<select id="ra_k"><option value="facultative">Facultative</option><option value="treaty">Treaty</option></select></label><label>Contact<input id="ra_c"></label><label>Email<input id="ra_e"></label></div><button class="btn ghost" id="ra_go">Add reinsurer</button></div>
      <div class="card"><h2>Who can see reinsurer accounts</h2><p class="note">Held by the General Manager and the CEO. You can let Accounting see the accounts, and let Accounting prepare payments that still need your approval.</p>
        <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="rx_v" style="width:22px;min-height:22px"${ac.setting.accounting_can_view ? " checked" : ""}> Accounting can see reinsurer accounts</label>
        <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="rx_p" style="width:22px;min-height:22px"${ac.setting.accounting_can_prepare ? " checked" : ""}> Accounting can prepare payments (you approve)</label>
        <button class="btn ghost" id="rx_go">Save access</button></div>` : ""}`;
    table("re_s", stmt); bindCsv();
    if (d.cessions.length) table("re_c", d.cessions.map(({ ceded_pct_shown, ...c }) => ({ ...c, reinsurer_share: ceded_pct_shown + "%" })));
    table("re_h", d.payments.map(({ id, ...x }) => x));
    $("re_sel").onchange = () => VIEWS.re_acc(+$("re_sel").value);
    if ($("re_p")) { table("re_p", pend, { hide: ["id", "status"], extra: (x) => `<button class="btn sm" data-rd="${x.id}" data-v="approve">Approve</button> <button class="btn ghost sm" data-rd="${x.id}" data-v="decline">Decline</button>` });
      document.querySelectorAll("[data-rd]").forEach((b) => (b.onclick = run(async () => { if (b.dataset.v === "approve" && !confirm("Approve and post this payment?")) return;
        await reapi({ action: "decide", id: +b.dataset.rd, decision: b.dataset.v }); say(b.dataset.v === "approve" ? "Approved and posted" : "Declined"); VIEWS.re_acc(); }))); }
    if ($("rp_go")) {
      $("rp_all").onclick = () => ($("rp_a").value = Number($("rp_dir").value === "pay" ? sel.owed_to_reinsurer : sel.recoverable || 0).toFixed(2));
      $("rp_go").onclick = run(async () => { const dir = $("rp_dir").value;
        if (!confirm(`${dir === "pay" ? "Pay" : "Receive from"} ${sel.name} USD ${money($("rp_a").value)} on ${$("rp_d").value}?`)) return;
        const x = await reapi({ action: "prepare", p: { reinsurer_id: sel.id, direction: dir, amount: $("rp_a").value, pdate: $("rp_d").value, method: $("rp_m").value, ref: $("rp_r").value, note: $("rp_n").value } });
        say(x.posted ? "Payment posted" : "Sent to the GM / CEO for approval"); VIEWS.re_acc(); });
    }
    if ($("ra_go")) $("ra_go").onclick = run(async () => { const x = await reapi({ action: "add", name: $("ra_n").value, kind: $("ra_k").value, contact: $("ra_c").value, email: $("ra_e").value }); say("Reinsurer added — account " + x.account); RE_SEL = x.id; VIEWS.re_acc(); });
    if ($("rx_go")) $("rx_go").onclick = run(async () => { await reapi({ action: "access_set", view: $("rx_v").checked, prepare: $("rx_p").checked }); say("Access saved"); });
  },
});
