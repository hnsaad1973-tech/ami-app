// Platinum Operations Platform — board screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== BOARD =====
  async b_report() {
    const def = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 7);
    V().innerHTML = `<div class="card"><h2>Monthly board report</h2><p class="note">Built automatically from the books: results, balance sheet, policies, claims, retention, above-limit approvals, top debtors, compliance and treaty status.</p>
      <div class="row"><label style="flex:1">Month<input type="month" id="b_m" value="${def}"></label><a class="btn" id="b_open" target="_blank" style="align-self:flex-end;display:inline-flex;align-items:center;text-decoration:none">Open report</a></div></div>`;
    const set = () => ($("b_open").href = "board.html?m=" + $("b_m").value); $("b_m").onchange = set; set();
  },
  async b_approvals() {
    const rows = (await list("uw_queue")).filter((r) => r.uw_status === "board");
    V().innerHTML = `<div class="card"><h2>Risks above USD 1,000,000 (${rows.length})</h2><p class="note">Only risks above USD 1,000,000 come to the Board, after Underwriting has signed and the General Manager has approved. Facultative reinsurance is already confirmed. The Board has 72 hours from arrival; overdue items are flagged to the CEO.</p><div class="tablewrap" id="t"></div></div>`;
    table("t", rows.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, sum_insured: r.sum_insured, gross_premium: r.gross_premium, deductible: r.deductible_text, conditions: r.uw_conditions, decide_by: r.board_due_at ? new Date(r.board_due_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "" })), { extra: (r) => `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)} <button class="btn sm" data-ok="${esc(r.policy_no)}">Approve</button> <button class="btn ghost sm" data-no="${esc(r.policy_no)}">Decline</button></span>` });
    document.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = run(async () => {
      const note = prompt(`Board approval for ${b.dataset.ok}. Note (optional):`); if (note === null) return;
      await api({ action: "uw_decide", policy_no: b.dataset.ok, decision: "approve", reason: note }); say(b.dataset.ok + " approved by the Board — back to Sales to issue"); VIEWS.b_approvals(); })));
    document.querySelectorAll("[data-no]").forEach((b) => (b.onclick = run(async () => {
      const reason = prompt("Reason for declining " + b.dataset.no); if (reason === null) return;
      await api({ action: "uw_decide", policy_no: b.dataset.no, decision: "decline", reason }); say(b.dataset.no + " declined"); VIEWS.b_approvals(); })));
  },
  async g_cbl() { quarterView("cbl", "Quarterly return to the Central Bank of Liberia", "Premium and claims by class, income statement, financial position, capital and solvency against the USD 1,500,000 minimum, retention, reinsurance arrangements, large risks and compliance. Signed by the Accountant, GM and Chairman."); },
  async g_are() { quarterView("africare", "Quarterly submission to Africa Re", "Treaty account by section with balance due, premium bordereau, claims bordereau with cash calls, excess of loss instalments and premium against estimate."); },
});
