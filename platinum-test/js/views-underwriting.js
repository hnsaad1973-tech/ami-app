// Platinum Operations Platform — underwriting screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== UNDERWRITING =====
  async u_queue() {
    const rows = await list("uw_queue");
    const todo = rows.filter((r) => r.uw_status === "submitted");
    const facw = rows.filter((r) => r.uw_status === "referred");
    const later = rows.filter((r) => ["uw_approved", "board", "returned"].includes(r.uw_status)).map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, sum_insured: r.sum_insured, stage: STAGE[r.uw_status], deductible: r.deductible_text, signed_by: r.uw_signed_by }));
    const docs = rows.filter((r) => r.uw_status === "approved" && !r.docs_verified_at);
    V().innerHTML = `<div class="card"><h2>Policies to review (${todo.length})</h2>
      <p class="note">Check each policy against the product rules and the Africa Re treaty, set the deductible and conditions so Platinum is not over-exposed, then sign. Signed policies go automatically to the General Manager for final approval.</p>
      <div class="tablewrap" id="t"></div></div>
      <div id="rv"></div>
      ${facw.length ? `<div class="card"><h2>Awaiting facultative reinsurance (${facw.length})</h2><p class="note">Signed by Underwriting but above Africa Re capacity. Place facultative cover, then confirm it here with the reinsurer and slip reference; the policy then goes to the General Manager.</p><div class="tablewrap" id="t_fac"></div></div>` : ""}
      <div class="card"><h2>Signed — with GM / Board / returned</h2><div class="tablewrap" id="t2"></div></div>
      ${docs.length ? `<div class="card"><h2>Approved — documents still to check</h2><p class="note">No claim is accepted for a loss earlier than 15 days after the documents are checked.</p><div class="tablewrap" id="t3"></div></div>` : ""}`;
    table("t", todo.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, sum_insured: r.sum_insured, gross_premium: r.gross_premium, from_sales: r.created_by, notes: r.referral_reason })), { extra: (r) => `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)} <button class="btn sm" data-rv="${esc(r.policy_no)}">Review</button></span>` });
    table("t2", later, { extra: (r) => printBtn(r.policy_no) });
    if (facw.length) table("t_fac", facw.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, sum_insured: r.sum_insured, deductible: r.deductible_text, since: r.stage_since })), { extra: (r) => `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)} <button class="btn sm" data-fac="${esc(r.policy_no)}">Facultative confirmed</button></span>` });
    document.querySelectorAll("[data-fac]").forEach((b) => (b.onclick = run(async () => {
      const note = prompt(`Facultative for ${b.dataset.fac}: reinsurer, share placed and slip reference`); if (note === null) return;
      await api({ action: "fac_confirm", policy_no: b.dataset.fac, note }); say(b.dataset.fac + " facultative confirmed — sent to the General Manager"); VIEWS.u_queue(); })));
    if (docs.length) table("t3", docs.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name })), { extra: (r) => `<button class="btn sm" data-doc="${esc(r.policy_no)}">Documents checked</button>` });
    document.querySelectorAll("[data-doc]").forEach((b) => (b.onclick = run(async () => {
      const r = await api({ action: "verify_docs", policy_no: b.dataset.doc }); say(`Documents checked · claims accepted for losses from ${String(r.claims_from).slice(0, 10)}`); VIEWS.u_queue(); })));
    document.querySelectorAll("[data-rv]").forEach((b) => (b.onclick = run(async () => {
      const d = await api({ action: "policy_detail", policy_no: b.dataset.rv }); const p = d.p, ru = d.rule || {};
      $("rv").innerHTML = `<div class="card" style="border:2px solid var(--gold)"><h2>Review ${esc(p.policy_no)} — ${esc(p.holder)}</h2>
        <p class="note">${esc(p.class_name)} · cover ${String(p.start_date).slice(0, 10)} to ${String(p.end_date).slice(0, 10)} · premium USD ${money(p.gross_premium)} + fees ${money(p.policy_fee)} · entered by ${esc(p.created_by)}</p>
        <div class="tablewrap" id="rv_items"></div>
        ${expoBox(d.exposure)}
        <div class="quote"><b>Product rule</b><br><b>Limits:</b> ${esc(ru.limits || "—")}<br><b>Standard deductible:</b> ${esc(ru.deductible || "—")}<br><b>Exclusions:</b> ${esc(ru.exclusions || "—")}<br><b>Documents:</b> ${esc(ru.documents || "—")}</div>
        <label>Deductible for this policy<textarea id="rv_ded">${esc(p.deductible_text || ru.deductible || "")}</textarea></label>
        <label>Conditions / warranties for this policy (printed on the schedule)<textarea id="rv_cond" placeholder="e.g. vehicles garaged at night; security guard on site">${esc(p.uw_conditions || "")}</textarea></label>
        <div class="grid"><label>Premium USD (blank = keep ${money(p.gross_premium)})<input id="rv_prem" inputmode="decimal"></label><label>Note / reason<input id="rv_note"></label></div>
        <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="rv_fac" style="width:22px;min-height:22px" ${p.fac_confirmed ? "checked" : ""}> Facultative reinsurance already confirmed in writing (only needed above capacity — if not yet, sign and it waits under "Awaiting facultative")</label>
        <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="rv_docs" style="width:22px;min-height:22px" ${p.docs_verified_at ? "checked disabled" : ""}> Client documents checked</label>
        <div class="row"><button class="btn" id="rv_ok">Sign and send to GM</button><button class="btn ghost" id="rv_ret">Return to Sales</button><button class="btn ghost" id="rv_dec">Decline</button></div></div>`;
      table("rv_items", d.items, {});
      $("rv").scrollIntoView({ behavior: "smooth" });
      const go = (decision) => run(async () => {
        if (decision !== "approve" && !$("rv_note").value.trim()) throw new Error("Write the reason in Note / reason");
        const r = await api({ action: "review", policy_no: p.policy_no, decision, deductible: $("rv_ded").value, conditions: $("rv_cond").value, premium: $("rv_prem").value, note: $("rv_note").value, fac_confirmed: $("rv_fac").checked, docs_verified: $("rv_docs").checked });
        say(decision === "approve" ? (r.status === "fac_pending" ? `${p.policy_no} signed — waiting for facultative before it goes to the GM` : `${p.policy_no} signed and sent to the General Manager`) : decision === "return" ? `${p.policy_no} returned to Sales` : `${p.policy_no} declined`); VIEWS.u_queue();
      });
      $("rv_ok").onclick = go("approve"); $("rv_ret").onclick = go("return"); $("rv_dec").onclick = go("decline");
    })));
  },
  async g_appr() {
    const rows = (await list("uw_queue")).filter((r) => r.uw_status === "uw_approved");
    V().innerHTML = `<div class="card"><h2>Waiting for your final approval (${rows.length})</h2>
      <p class="note">Every policy comes here after Underwriting has checked it and signed. Your approval puts it on the books, cedes Africa Re's share and sends it back to Sales to issue to the client. Risks above USD 1,000,000 go on to the Board after you, which has 72 hours to decide. Target: decide within 24 hours.</p>
      <div class="tablewrap" id="t"></div></div><div id="gv"></div>`;
    table("t", rows.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, sum_insured: r.sum_insured, gross_premium: r.gross_premium, deductible: r.deductible_text, signed_by: r.uw_signed_by, board: r.board_approval })), { extra: (r) => `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)} <button class="btn sm" data-gv="${esc(r.policy_no)}">Open</button></span>` });
    document.querySelectorAll("[data-gv]").forEach((b) => (b.onclick = run(async () => {
      const d = await api({ action: "policy_detail", policy_no: b.dataset.gv }); const p = d.p;
      $("gv").innerHTML = `<div class="card" style="border:2px solid var(--gold)"><h2>${esc(p.policy_no)} — ${esc(p.holder)}</h2>
        <p class="note">${esc(p.class_name)} · cover ${String(p.start_date).slice(0, 10)} to ${String(p.end_date).slice(0, 10)} · premium USD ${money(p.gross_premium)} + fees ${money(p.policy_fee)}</p>
        <div class="tablewrap" id="gv_items"></div>
        ${expoBox(d.exposure)}
        <div class="quote"><b>Underwriting</b> — signed by ${esc(d.signed?.underwriter?.name || p.uw_signed_by)} on ${String(p.uw_signed_at || "").slice(0, 10)}<br><b>Deductible:</b> ${esc(p.deductible_text)}<br><b>Conditions:</b> ${esc(p.uw_conditions || "none")}<br><b>Notes:</b> ${esc(p.referral_reason || "none")}${p.board_approval ? '<br><b style="color:var(--red)">Board approval also required after yours</b>' : ""}</div>
        <label>Note / reason<input id="gv_note"></label>
        <div class="row"><button class="btn" id="gv_ok">Final approval</button><button class="btn ghost" id="gv_back">Send back to Underwriting</button><button class="btn ghost" id="gv_dec">Decline</button></div></div>`;
      table("gv_items", d.items, {}); $("gv").scrollIntoView({ behavior: "smooth" });
      const go = (decision) => run(async () => {
        const r = await api({ action: "gm_decide", policy_no: p.policy_no, decision, note: $("gv_note").value });
        say(r.status === "approved" ? `${p.policy_no} approved — back to Sales to issue to the client` : r.status === "board" ? `${p.policy_no} approved by you — now with the Board` : decision === "back" ? `${p.policy_no} sent back to Underwriting` : `${p.policy_no} declined`); VIEWS.g_appr();
      });
      $("gv_ok").onclick = go("approve"); $("gv_back").onclick = go("back"); $("gv_dec").onclick = go("decline");
    })));
  },
  async u_all() { LAST = (await list("policies")).map((r) => ({ ...r, stage: stage(r) })); V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>All policies</h2>${csvBtn("policies")}</div><div class="tablewrap" id="t"></div></div>`; table("t", LAST, { hide: ["id", "class_code"], extra: (r) => `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)}${r.uw_status === "approved" ? ` <button class="btn sm" data-cl="${esc(r.policy_no)}">Add clause</button>` : ""}</span>` }); bindCsv();
    document.querySelectorAll("[data-cl]").forEach((b) => (b.onclick = () => { ENDORSE_FOR = b.dataset.cl; openTab("u_endorse"); })); },
  async u_claims() {
    const cl = await list("claims");
    const toVerify = cl.filter((c) => c.status === "open" && String(c.stage).startsWith("registered"));
    V().innerHTML = `<div class="card"><h2>New claim</h2><p class="note">Only for losses inside the policy period and from 15 days after documents were checked. The product's deductible applies.</p><div class="grid">
        <label>Policy no.<input id="c_pol"></label><label>Date of loss<input type="date" id="c_loss" value="${today()}"></label><label>First reserve (USD)<input id="c_res" inputmode="decimal"></label></div>
        <label>What happened<textarea id="c_desc"></textarea></label><button class="btn" id="c_go">Open claim</button></div>
      <div class="card"><h2>Update a claim</h2><div class="grid">
        <label>Claim no.<select id="m_clm">${cl.filter((c) => c.status === "open").map((c) => `<option>${esc(c.claim_no)}</option>`).join("")}</select></label>
        <label>Type<select id="m_kind"><option value="reserve">New reserve (still to pay)</option><option value="salvage">Salvage / recovery</option></select></label>
        <label>Amount (USD)<input id="m_amt" inputmode="decimal"></label><label>Close<select id="m_close"><option value="">No</option><option value="1">Yes</option></select></label></div>
        <button class="btn" id="m_go">Post</button></div>
      ${toVerify.length ? `<div class="card"><h2>Claims to verify</h2><p class="note">Check the loss, the documents, the policy period and the deductible, then verify so the GM can approve the amount. You cannot verify a claim on a policy you underwrote — another underwriter or the GM's chosen stand-in must do it. Accounts pays only after GM approval.</p><div class="tablewrap" id="t_v"></div></div>` : ""}
      <div class="card"><h2>Claims</h2><div class="tablewrap" id="t"></div></div>`;
    table("t", cl);
    if (toVerify.length) table("t_v", toVerify.map((c) => ({ claim_no: c.claim_no, policy_no: c.policy_no, holder: c.holder, loss_date: c.loss_date, description: c.description, outstanding: c.outstanding, underwritten_by: c.underwritten_by })),
      { extra: (c) => `<span class="row" style="flex-wrap:nowrap"><button class="btn sm" data-cv="${esc(c.claim_no)}">Verify</button> <button class="btn ghost sm" data-cd="${esc(c.claim_no)}">Decline</button></span>` });
    document.querySelectorAll("[data-cv]").forEach((b) => (b.onclick = run(async () => { const note = prompt("Verification note (documents seen, deductible applied):"); if (note === null) return; await api({ action: "claim_verify", k: { claim_no: b.dataset.cv, note } }); say(b.dataset.cv + " verified — now with the GM"); VIEWS.u_claims(); })));
    document.querySelectorAll("[data-cd]").forEach((b) => (b.onclick = run(async () => { const note = prompt("Reason for declining the claim:"); if (!note) return; await api({ action: "claim_verify", k: { claim_no: b.dataset.cd, decline: true, note } }); say(b.dataset.cd + " declined"); VIEWS.u_claims(); })));
    $("c_go").onclick = run(async () => { const r = await api({ action: "create_claim", c: { policy_no: $("c_pol").value.trim(), loss_date: $("c_loss").value, description: $("c_desc").value, reserve: $("c_res").value } }); say("Claim " + r.claim.claim_no + " opened"); VIEWS.u_claims(); });
    $("m_go").onclick = run(async () => { await api({ action: "claim_move", m: { claim_no: $("m_clm").value, kind: $("m_kind").value, amount: $("m_amt").value, close: !!$("m_close").value } }); say("Claim updated"); VIEWS.u_claims(); });
  },
  async u_rules() { await rulesView(false); },
  async g_claims() {
    const cl = await list("claims"), due = cl.filter((c) => c.status === "open" && String(c.stage).startsWith("verified"));
    V().innerHTML = `${kpis([["Claims waiting for you", due.length, due.length > 0], ["Approved, not yet paid", cl.filter((c) => c.status === "open" && String(c.stage).startsWith("approved")).length], ["Open claims", cl.filter((c) => c.status === "open").length]])}
      <div class="card"><h2>Claims verified by Underwriting — approve the amount</h2><p class="note">Approve the amount to be paid (net of the deductible). Accounts can pay up to that amount only. You cannot approve a claim you registered or on a policy you underwrote.</p><div class="tablewrap" id="t_a"></div></div>
      <div class="card"><h2>All claims</h2><div class="tablewrap" id="t"></div></div>`;
    table("t_a", due.map((c) => ({ claim_no: c.claim_no, policy_no: c.policy_no, holder: c.holder, loss_date: c.loss_date, description: c.description, reserve: c.outstanding, verified_by: c.verified_by })), { extra: (c) => `<button class="btn sm" data-ga="${esc(c.claim_no)}">Approve amount</button>` });
    table("t", cl);
    document.querySelectorAll("[data-ga]").forEach((b) => (b.onclick = run(async () => { const amount = prompt("Amount approved for payment (USD), net of deductible:"); if (!amount) return; await api({ action: "claim_approve", k: { claim_no: b.dataset.ga, amount } }); say(b.dataset.ga + " approved — Accounts will pay"); VIEWS.g_claims(); })));
  },
  async a_claims() {
    const cl = await list("claims"), due = cl.filter((c) => c.status === "open" && String(c.stage).startsWith("approved"));
    V().innerHTML = `<div class="card"><h2>Approved claims to pay</h2><p class="note">Pay only claims the GM has approved, up to the approved amount. The claim closes when it is paid in full.</p><div class="grid">
        <label>Claim no.<select id="k_clm">${due.map((c) => `<option value="${esc(c.claim_no)}">${esc(c.claim_no)} — ${esc(c.holder)} (approved ${money(c.approved_amount)}, paid ${money(c.paid)})</option>`).join("")}</select></label>
        <label>Amount paid (USD)<input id="k_amt" inputmode="decimal"></label><label>Date<input type="date" id="k_date" value="${today()}"></label><label>Cheque / transfer ref.<input id="k_ref"></label></div>
        <button class="btn" id="k_go"${due.length ? "" : " disabled"}>Record claim payment</button></div>
      <div class="card"><h2>All claims</h2><div class="tablewrap" id="t"></div></div>`;
    table("t", cl);
    $("k_go").onclick = run(async () => { await api({ action: "claim_pay", k: { claim_no: $("k_clm").value, amount: $("k_amt").value, mdate: $("k_date").value, ref: $("k_ref").value } }); say("Claim payment recorded"); VIEWS.a_claims(); });
  },
  async u_treaty() {
    const [t, x] = await Promise.all([list("treaty"), list("xl")]);
    V().innerHTML = `<div class="card"><h2>Africa Re 2027 — treaty sections</h2><p class="note">Offer terms (14 Nov 2026), not yet bound.</p><div class="tablewrap" id="t1"></div></div><div class="card"><h2>Excess of loss covers</h2><div class="tablewrap" id="t2"></div></div>`;
    table("t1", t, { hide: ["terms_source", "reinsurer"] }); table("t2", x);
  },

  async u_endorse() {
    const [pol, cl, en] = await Promise.all([list("policies"), list("clauses"), list("endorsements")]);
    const ok = pol.filter((p) => p.uw_status === "approved");
    V().innerHTML = `<div class="card"><h2>Add a clause to a client's policy</h2>
      <p class="note">The standard wording stays the same for every client. Use this to add what is special for this client: a standard clause from the list, or your own wording. Extra premium is added to the policy, ceded to Africa Re at the policy's share, and printed as an endorsement.</p>
      <div class="grid">
        <label>Policy<select id="e_pol">${ok.map((p) => `<option value="${esc(p.policy_no)}" ${p.policy_no === ENDORSE_FOR ? "selected" : ""}>${esc(p.policy_no)} — ${esc(p.holder)} (${esc(p.class_name)})</option>`).join("")}</select></label>
        <label>Standard clause<select id="e_cl"><option value="">— Own wording —</option>${cl.map((c) => `<option value="${c.code}">${esc(c.title)}${c.premium_basis === "flat" ? " · +USD " + c.premium_value + " each" : c.premium_basis === "pct_premium" ? " · +" + c.premium_value + "% of premium" : ""}</option>`).join("")}</select></label>
        <label>Units (vehicles) for per-unit clauses<input id="e_units" inputmode="numeric" value="1"></label>
        <label>Extra premium USD (blank = from the clause)<input id="e_prem" inputmode="decimal"></label>
        <label>Effective date<input type="date" id="e_date" value="${today()}"></label>
      </div>
      <label>Title<input id="e_title"></label>
      <label>Wording<textarea id="e_body" style="min-height:120px"></textarea></label>
      <div class="row"><button class="btn" id="e_go">Add to policy</button><a class="btn ghost" id="e_print" target="_blank" style="display:inline-flex;align-items:center;text-decoration:none">Print policy</a></div></div>
      <div class="card"><h2>Clauses added to policies</h2><div class="tablewrap" id="t"></div></div>
      <div class="card"><h2>Standard clause list</h2><div class="tablewrap" id="t2"></div></div>`;
    ENDORSE_FOR = null;
    const setPrint = () => ($("e_print").href = "print.html?no=" + encodeURIComponent($("e_pol").value)); $("e_pol").onchange = setPrint; setPrint();
    $("e_cl").onchange = () => { const c = cl.find((x) => x.code === $("e_cl").value); $("e_title").value = c ? c.title : ""; $("e_body").value = c ? c.body : ""; };
    table("t", en, { hide: ["id"] }); table("t2", cl.map((c) => ({ title: c.title, wording: c.body, products: (c.applies_to || ["all"]).join(", "), extra_premium: c.premium_basis === "flat" ? "USD " + c.premium_value + " each" : c.premium_basis === "pct_premium" ? c.premium_value + "% of premium" : "none" })));
    $("e_go").onclick = run(async () => {
      const r = await api({ action: "endorse", e: { policy_no: $("e_pol").value, clause_code: $("e_cl").value, title: $("e_title").value, body: $("e_body").value, premium: $("e_prem").value, units: $("e_units").value, date: $("e_date").value } });
      say(`Clause added to ${$("e_pol").value}${r.premium ? " · extra premium USD " + money(r.premium) : ""}`); VIEWS.u_endorse();
    });
  },
  async u_word() { await wordingView(false); },
  async c_word() { await wordingView(true); },
  async u_lib() {
    const LIB = (await api({ action: "lib_list" })).rows; LAST = LIB.map(({ link, ...r }) => r); const canEdit = ["underwriter", "gm", "admin"].includes(ME.role);
    const cats = ["Policy wording", "Proposal form", "Schedule / certificate template", "Rate card", "Underwriting guide", "Claims form", "Regulation", "Reinsurance", "Other"];
    const classes = CLASSES.length ? CLASSES : (CLASSES = await list("classes"));
    V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>Policy library</h2>${csvBtn("library")}</div>
      <p class="note">Wordings, proposal forms, certificate templates, rate cards, underwriting guides, CBL regulations and reinsurance documents. Lines marked "missing" still need a document.</p>
      <div class="row"><select id="lb_f" style="max-width:280px"><option value="">All categories</option>${cats.map((c) => `<option>${c}</option>`).join("")}</select></div>
      <div class="tablewrap" id="t"></div></div>
      ${canEdit ? `<div class="card"><h2>Add or replace a document</h2><div class="grid">
        <label>Title<input id="lb_t"></label><label>Category<select id="lb_c">${cats.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label>Product<select id="lb_p"><option value="">All products</option>${classes.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("")}</select></label>
        <label>Version<input id="lb_v" placeholder="e.g. 2027-1"></label><label>Effective date<input type="date" id="lb_d"></label>
        <label>Replaces<select id="lb_r"><option value="">Nothing (new document)</option>${LAST.filter((x) => x.status !== "superseded").map((x) => `<option value="${x.id}">${esc(x.title)}${x.status === "missing" ? " (missing)" : ""}</option>`).join("")}</select></label>
        <label>File (PDF, Word, image — up to 15 MB)<input type="file" id="lb_file" style="padding-top:10px"></label><label>…or a link<input id="lb_u" placeholder="https://"></label></div>
        <label>Notes<input id="lb_n"></label><button class="btn" id="lb_go">Save to library</button></div>` : ""}`;
    const show = () => table("t", LIB.filter((x) => !$("lb_f").value || x.category === $("lb_f").value).map((x) => ({ id: x.id, title: x.title, category: x.category, product: x.class_code || "All", version: x.version, status: x.status, notes: x.notes, link: x.link })), { hide: ["id", "link"], extra: (r) =>
      (r.link ? `<a class="btn sm" style="display:inline-flex;align-items:center;text-decoration:none" href="${esc(r.link)}" target="_blank" rel="noopener">Open</a>` : `<span class="note">not uploaded</span>`) + (canEdit && r.status === "current" ? ` <button class="btn ghost sm" data-sup="${r.id}">Superseded</button>` : "") });
    const bind = () => {
      document.querySelectorAll("[data-sup]").forEach((b) => (b.onclick = run(async () => { await api({ action: "lib_status", id: +b.dataset.sup, status: "superseded" }); say("Marked superseded"); VIEWS.u_lib(); })));
    };
    $("lb_f").onchange = () => { show(); bind(); }; show(); bind(); bindCsv();
    if (canEdit) {
      $("lb_r").onchange = () => { const x = LAST.find((y) => y.id == $("lb_r").value); if (x) { $("lb_t").value = x.title.replace(/ — policy wording$/, " — policy wording"); $("lb_c").value = x.category; $("lb_p").value = x.class_code || ""; } };
      $("lb_go").onclick = run(async () => {
        const f = $("lb_file").files[0]; let file = null;
        if (f) { if (f.size > 15 * 1024 * 1024) throw new Error("File is over 15 MB"); const buf = new Uint8Array(await f.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); file = { name: f.name, type: f.type, b64: btoa(bin) }; }
        await api({ action: "lib_add", d: { title: $("lb_t").value.trim(), category: $("lb_c").value, class_code: $("lb_p").value, version: $("lb_v").value, effective_date: $("lb_d").value, replace_id: $("lb_r").value, url: $("lb_u").value.trim(), notes: $("lb_n").value, file } });
        say("Saved to the library"); VIEWS.u_lib();
      });
    }
  },

});
