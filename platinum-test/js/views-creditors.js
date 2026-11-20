// Platinum Operations Platform — creditors screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== Creditors, purchases, petty cash (v5.0) =====
  async a_cred() {
    const d = await bapi({ action: "books_summary" }); const post = ["accountant", "admin"].includes(ME.role); const bk = d.books;
    LAST = d.suppliers.map(({ id, ...r }) => r);
    const owing = d.purchases.filter((p) => p.how === "credit" && Number(p.balance) > 0 && p.status !== "void");
    V().innerHTML = kpis([["Owed to suppliers (books)", money(bk.ap_control)], ["Sum of supplier balances", money(bk.ap_suppliers)], ["Overdue (USD)", money(d.suppliers.reduce((a, r) => a + Number(r.overdue || 0), 0)), d.suppliers.some((r) => Number(r.overdue) > 0)], ["Bills unpaid", owing.length]]) +
      `<div class="card"><p class="note"><b>${bk.balanced ? "✓ Books agree" : "⚠ Check needed"}:</b> a bill on credit posts once — Dr expense / Cr Accounts payable under the supplier. Paying it posts Dr Accounts payable / Cr Bank, Cash or Petty cash. A payment can never be more than what is left on the bill, and the same supplier invoice cannot be entered twice.</p></div>` +
      (post ? `<div class="card"><h2>Pay a supplier bill</h2><div class="grid"><label style="grid-column:1/-1">Bill<select id="cp_b"><option value="">Choose…</option>${owing.map((p) => `<option value="${p.id}" data-bal="${p.balance}">${esc(p.supplier)} · ${esc(p.invoice_no || "no inv")} · ${esc(p.description)} — owed USD ${money(p.balance)}</option>`).join("")}</select></label>
        <label>Amount (USD)<input id="cp_a" inputmode="decimal"></label><label>Date paid<input id="cp_d" type="date" value="${today()}"></label>
        <label>Paid from<select id="cp_m"><option value="bank">Bank</option><option value="cash">Cash</option><option value="petty">Petty cash</option></select></label><label>Reference<input id="cp_r" placeholder="cheque / transfer no."></label></div>
        <div class="row"><button class="btn" id="cp_go">Post payment</button><button class="btn ghost" id="cp_all">Pay full balance</button></div></div>
      <div class="card"><h2>Add a supplier</h2><div class="grid"><label>Name<input id="su_n"></label><label>Company<input id="su_c"></label><label>Phone<input id="su_p"></label><label>Email<input id="su_e"></label><label style="grid-column:1/-1">Address<input id="su_a"></label></div><button class="btn ghost" id="su_go">Save supplier</button></div>` : "") +
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>Creditors — what we owe each supplier</h2>${csvBtn("creditors")}</div><div class="tablewrap" id="t"></div></div>
      <div class="card"><h2>Unpaid bills</h2><div class="tablewrap" id="t2"></div></div>`;
    table("t", LAST); table("t2", owing.map(({ id, how, created_by, ...r }) => r)); bindCsv();
    if (!post) return;
    $("cp_all").onclick = () => { const o = $("cp_b").selectedOptions[0]; if (o && o.dataset.bal) $("cp_a").value = Number(o.dataset.bal).toFixed(2); };
    $("cp_go").onclick = run(async () => { if (!$("cp_b").value) throw new Error("Choose the bill");
      if (!confirm(`Post USD ${money($("cp_a").value)} paid on ${$("cp_d").value}?`)) return;
      const x = await bapi({ action: "purchase_pay", k: { id: $("cp_b").value, amount: $("cp_a").value, date: $("cp_d").value, method: $("cp_m").value, ref: $("cp_r").value } });
      say(`USD ${money(x.paid)} paid to ${x.supplier} · left on bill USD ${money(x.left)}`); VIEWS.a_cred(); });
    $("su_go").onclick = run(async () => { await bapi({ action: "supplier_save", s: { name: $("su_n").value, company: $("su_c").value, phone: $("su_p").value, email: $("su_e").value, address: $("su_a").value } }); say("Supplier saved"); VIEWS.a_cred(); });
  },
  async a_purch() {
    const d = await bapi({ action: "books_summary" }); const post = ["accountant", "admin"].includes(ME.role);
    LAST = d.purchases.map(({ id, ...r }) => r);
    V().innerHTML = kpis([["Purchases this month (USD)", money(d.books.purchases_month)], ["Petty cash in the box (USD)", money(d.books.petty_balance), Number(d.books.petty_balance) < 20]]) +
      (post ? `<div class="card"><h2>Enter a purchase / supplier bill</h2><p class="note">On credit = we owe the supplier (shows under Creditors). Paid now = paid on the spot from Bank, Cash or Petty cash.</p>
        <div class="grid"><label>Supplier<input id="pu_s" list="pu_sl" placeholder="Choose or type a new one"></label><datalist id="pu_sl">${d.suppliers.map((r) => `<option value="${esc(r.name)}">`).join("")}</datalist>
          <label>Invoice / receipt no.<input id="pu_i"></label><label>Date<input id="pu_d" type="date" value="${today()}"></label>
          <label style="grid-column:1/-1">What was bought<input id="pu_w" placeholder="e.g. 10 reams of paper, generator diesel"></label>
          <label>For (expense)<select id="pu_ac">${d.accounts.map((r) => `<option value="${r.code}">${esc(r.name)}</option>`).join("")}</select></label>
          <label>Amount (USD)<input id="pu_a" inputmode="decimal"></label>
          <label>How<select id="pu_h"><option value="">On credit (pay later)</option><option value="bank">Paid now — Bank</option><option value="cash">Paid now — Cash</option><option value="petty">Paid now — Petty cash</option></select></label>
          <label id="pu_dueL">Due date<input id="pu_due" type="date"></label></div>
        <button class="btn" id="pu_go">Save purchase</button></div>` : "") +
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>Purchases</h2>${csvBtn("purchases")}</div><div class="tablewrap" id="t"></div></div>`;
    table("t", d.purchases, { hide: ["id"], extra: post ? (r) => r.status !== "void" && Number(r.paid) === 0 || (r.status !== "void" && r.how !== "credit") ? `<button class="btn ghost sm" data-pv="${r.id}">Void</button>` : "" : null }); bindCsv();
    if (!post) return;
    $("pu_h").onchange = () => $("pu_dueL").classList.toggle("hide", !!$("pu_h").value);
    $("pu_go").onclick = run(async () => {
      const nm = $("pu_s").value.trim(); const ex = d.suppliers.find((r) => r.name.toUpperCase() === nm.toUpperCase());
      if (!ex && nm && !confirm(`${nm} is a new supplier. Add it?`)) return;
      await bapi({ action: "purchase_add", p: { supplier_id: ex ? ex.id : null, supplier_name: nm, invoice_no: $("pu_i").value, bill_date: $("pu_d").value, description: $("pu_w").value, account_code: $("pu_ac").value, amount: $("pu_a").value, paid_now: $("pu_h").value || null, due_date: $("pu_due").value || null } });
      say("Purchase saved"); VIEWS.a_purch(); });
    document.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = run(async () => { const reason = prompt("Why void this purchase?"); if (!reason) return;
      await bapi({ action: "purchase_void", id: +b.dataset.pv, reason }); say("Purchase voided — the entry is reversed"); VIEWS.a_purch(); })));
  },
  async a_petty() {
    const d = await bapi({ action: "books_summary" }); const post = ["accountant", "admin"].includes(ME.role);
    LAST = d.petty.map(({ id, ...r }) => r);
    V().innerHTML = kpis([["Cash in the petty box (USD)", money(d.books.petty_balance), Number(d.books.petty_balance) < 20], ["Spent this month (USD)", money(d.books.petty_spent_month)]]) +
      (post ? `<div class="card"><h2>Petty cash entry</h2><p class="note">Top up = money put in the box from the bank or main cash. Spend = money paid out of the box (keep the receipt). Return = unused money put back in the bank. You cannot spend more than is in the box.</p>
        <div class="grid"><label>Type<select id="pc_k"><option value="expense">Spend</option><option value="top_up">Top up</option><option value="return">Return to bank</option></select></label>
          <label>Date<input id="pc_d" type="date" value="${today()}"></label><label>Amount (USD)<input id="pc_a" inputmode="decimal"></label>
          <label id="pc_acL">For (expense)<select id="pc_ac">${d.accounts.map((r) => `<option value="${r.code}">${esc(r.name)}</option>`).join("")}</select></label>
          <label id="pc_srcL" class="hide">From / to<select id="pc_src"><option value="bank">Bank</option><option value="cash">Main cash</option></select></label>
          <label style="grid-column:1/-1">Description<input id="pc_w" placeholder="e.g. Taxi to Ministry of Transport for stickers"></label>
          <label>Paid to<input id="pc_to"></label><label>Receipt no.<input id="pc_r"></label></div>
        <button class="btn" id="pc_go">Save</button></div>` : "") +
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>Petty cash book</h2>${csvBtn("petty-cash")}</div><div class="tablewrap" id="t"></div></div>`;
    table("t", LAST); bindCsv();
    if (!post) return;
    $("pc_k").onchange = () => { const k = $("pc_k").value; $("pc_acL").classList.toggle("hide", k !== "expense"); $("pc_srcL").classList.toggle("hide", k === "expense"); };
    $("pc_go").onclick = run(async () => { const x = await bapi({ action: "petty_add", c: { kind: $("pc_k").value, tdate: $("pc_d").value, amount: $("pc_a").value, account_code: $("pc_ac").value, source: $("pc_src").value, description: $("pc_w").value, paid_to: $("pc_to").value, receipt_no: $("pc_r").value } });
      say(`Saved · petty cash now USD ${money(x.balance)}`); VIEWS.a_petty(); });
  },
  async a_payroll() {
    const [st, ps] = await Promise.all([list("staff"), list("payroll")]);
    V().innerHTML = `<div class="card"><h2>Staff</h2><div class="tablewrap" id="t1"></div>
        <details><summary>Add staff</summary><div class="grid" style="margin-top:10px"><label>Name<input id="s_n"></label><label>Position<input id="s_p"></label><label>Salary (USD)<input id="s_s" inputmode="decimal"></label><label>Allowances<input id="s_a" inputmode="decimal"></label></div><button class="btn" id="s_go" style="margin-top:10px">Add</button></details></div>
      <div class="card"><h2>Run payroll</h2><p class="note">PAYE on LRA bands; NASSCORP 4% staff, 6% company.</p><div class="grid">
        <label>Month (YYYY-MM)<input id="p_per" value="${today().slice(0, 7)}"></label><label>Pay date<input type="date" id="p_d" value="${today()}"></label><label>USD → LRD rate<input id="p_fx" inputmode="decimal"></label></div><button class="btn" id="p_go">Run payroll</button></div>
      <div class="card"><h2>Payslips</h2><div class="tablewrap" id="t2"></div></div>`;
    table("t1", st, { hide: ["id", "department", "currency", "basic_salary", "allowances", "active"], extra: (s) =>
      `<span class="row" style="flex-wrap:nowrap"><input style="width:100px;min-height:34px" id="sal${s.id}" value="${s.basic_salary ?? ""}" placeholder="Salary"><input style="width:80px;min-height:34px" id="all${s.id}" value="${s.allowances ?? 0}"><button class="btn sm" data-st="${s.id}" data-n="${encodeURIComponent(s.name)}" data-p="${encodeURIComponent(s.position || "")}">Save</button></span>` });
    table("t2", ps);
    document.querySelectorAll("[data-st]").forEach((b) => (b.onclick = run(async () => { const id = b.dataset.st; await api({ action: "update_staff", s: { id: +id, name: decodeURIComponent(b.dataset.n), position: decodeURIComponent(b.dataset.p), basic_salary: $("sal" + id).value, allowances: $("all" + id).value } }); say("Saved"); })));
    $("s_go").onclick = run(async () => { await api({ action: "update_staff", s: { name: $("s_n").value, position: $("s_p").value, basic_salary: $("s_s").value, allowances: $("s_a").value } }); say("Staff added"); VIEWS.a_payroll(); });
    $("p_go").onclick = run(async () => { await api({ action: "run_payroll", period: $("p_per").value, run_date: $("p_d").value, fx: $("p_fx").value }); say("Payroll posted"); VIEWS.a_payroll(); });
  },
  async a_reports() {
    V().innerHTML = `<div class="card"><div class="row"><select id="rep" style="flex:1">
      <option value="tb">Trial balance</option><option value="pnl">Profit & loss by month</option><option value="journals">Journal entries</option>
      <option value="africa_re">Africa Re quarterly statement</option><option value="prem_bdx">Premium bordereau</option><option value="clm_bdx">Claims bordereau</option>
      <option value="retention">Retention (CBL 20%)</option><option value="banks">Bank accounts</option><option value="policies">All policies</option><option value="claims">Claims</option></select>${csvBtn("report")}</div>
      <div class="tablewrap" id="t"></div></div>`;
    const load = run(async () => { LAST = await list($("rep").value); table("t", LAST); });
    $("rep").onchange = load; await load(); bindCsv();
  },
  async a_close() {
    V().innerHTML = `<div class="card"><h2>Month end</h2><p class="note">Works out unearned premium for the gross book and Africa Re's share. Run on the last day of each month, then open the board report.</p>
      <div class="row"><label style="flex:1">Month-end date<input type="date" id="me_d" value="${today()}"></label><button class="btn" id="me_go" style="align-self:flex-end">Run month end</button></div></div>`;
    $("me_go").onclick = run(async () => { await api({ action: "month_end", date: $("me_d").value }); say("Month end posted"); });
  },
  async a_comp() {
    LAST = await list("compliance"); const canEdit = ["accountant", "gm", "admin"].includes(ME.role);
    V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>Compliance — CBL, tax and treaty</h2>${csvBtn("compliance")}</div><div class="tablewrap" id="t"></div>
      ${canEdit ? `<details><summary>Add an item</summary><div class="grid" style="margin-top:10px"><label>Item<input id="cp_i"></label><label>Regulation<input id="cp_r"></label><label>Due<input type="date" id="cp_d"></label><label>Owner<input id="cp_o"></label></div><button class="btn" id="cp_go" style="margin-top:10px">Add</button></details>` : ""}</div>`;
    table("t", LAST, { hide: ["id"], extra: canEdit ? (r) => (r.status !== "done" ? `<button class="btn sm" data-done="${r.id}">Done</button>` : "") : null }); bindCsv();
    document.querySelectorAll("[data-done]").forEach((b) => (b.onclick = run(async () => { const r = LAST.find((x) => x.id == b.dataset.done); await api({ action: "update_compliance", c: { id: r.id, status: "done", due_date: r.due_date, notes: r.notes } }); say("Marked done"); VIEWS.a_comp(); })));
    if (canEdit) $("cp_go").onclick = run(async () => { await api({ action: "update_compliance", c: { item: $("cp_i").value, regulation: $("cp_r").value, due_date: $("cp_d").value, owner: $("cp_o").value } }); say("Added"); VIEWS.a_comp(); });
  },

});
