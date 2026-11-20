// Platinum Operations Platform — sales screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== SALES =====
  async s_new() {
    if (!TARIFF.length) TARIFF = await list("tariff");
    if (!CLASSES.length) CLASSES = await list("classes");
    V().innerHTML = `<div class="card">
      <h2>New policy request</h2>
      <p class="note">Enter the client and what is to be insured. The system prices it from the approved rates and sends it to Underwriting. Underwriting checks it against the product rules and the Africa Re treaty and signs it; the General Manager gives final approval; then it comes back to you under My policies to issue to the client.</p>
      <div class="grid">
        <label>Product<select id="n_class">${CLASSES.filter((c) => !c.blocked).map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("")}</select></label>
        <label>Client name<input id="n_holder" list="n_cl"></label>
        <label>Phone<input id="n_phone" inputmode="tel"></label>
        <label>Cover starts<input type="date" id="n_start" value="${today()}"></label>
      </div>
      <datalist id="n_cl"></datalist>
      <div class="card" style="background:var(--navy)">
        <div class="row" style="justify-content:space-between"><h3>Vehicles / items</h3><button class="btn ghost sm" id="n_add" type="button">+ Add</button></div>
        <div id="n_items"></div>
      </div>
      <button class="btn ghost" id="n_quote">Get price</button>
      <div id="n_q"></div>
      <div id="n_issue" class="hide card" style="background:var(--navy)">
        <div class="grid">
          <label>Client email (optional)<input id="n_email" inputmode="email"></label>
          <label id="n_ovL" class="hide">Premium (underwriter)<input id="n_ov" inputmode="decimal" placeholder="Blank = rate table"></label>
        </div>
        <label>Notes for Underwriting<textarea id="n_note" placeholder="Anything the underwriter should know: use of vehicles, claims history, documents received…"></textarea></label>
        <label style="flex-direction:row;align-items:center;gap:8px" id="n_docsL"><input type="checkbox" id="n_docs" style="width:22px;min-height:22px"> Documents seen and checked</label>
        <button class="btn" id="n_go">Send to Underwriting</button>
      </div>
    </div>`;
    if (["underwriter", "gm", "admin"].includes(ME.role)) $("n_ovL").classList.remove("hide"); else $("n_docsL").classList.add("hide");
    api({ action: "my_clients" }).then((c) => ($("n_cl").innerHTML = c.rows.map((x) => `<option value="${esc(x.client)}">`).join(""))).catch(() => {});
    const isTariff = () => ["MTPL", "MFLEET"].includes($("n_class").value);
    const addItem = () => {
      const d = document.createElement("div"); d.className = "grid it"; d.style.cssText = "border-top:1px solid var(--line);padding-top:10px";
      d.innerHTML = (isTariff() ? `<label style="grid-column:1/-1">Tariff category${tariffSelect('data-k="tariff_id"')}</label>` : "") +
        `<label>Description<input data-k="description"></label><label>Plate no.<input data-k="plate_no"></label><label>Chassis / VIN<input data-k="chassis_vin"></label>
         <label>Make / model<input data-k="make_model"></label><label>Year<input data-k="year" inputmode="numeric"></label>
         <label>Use / location<input data-k="use_category"></label>` + ($("n_class").value === "MTPL" ? "" : `<label>Value / sum insured (USD)<input data-k="sum_insured" inputmode="decimal"></label>`);
      $("n_items").appendChild(d);
    };
    const reset = () => { $("n_items").innerHTML = ""; addItem(); $("n_q").innerHTML = ""; $("n_issue").classList.add("hide"); };
    $("n_class").onchange = reset; $("n_add").onclick = addItem; reset();
    const read = () => ({
      class_code: $("n_class").value, holder: $("n_holder").value.trim(), phone: $("n_phone").value.trim(), start_date: $("n_start").value,
      items: [...document.querySelectorAll("#n_items .it")].map((d) => { const o = {}; d.querySelectorAll("[data-k]").forEach((i) => (o[i.dataset.k] = i.value.trim())); return o; }),
      premium_override: $("n_ov").value, email: $("n_email").value.trim(), note: $("n_note").value.trim(), docs_verified: $("n_docs").checked,
    });
    $("n_quote").onclick = run(async () => {
      const { quote: q } = await api({ action: "quote", p: read() });
      $("n_q").innerHTML = `<div class="quote">
        <b style="font-size:18px;color:var(--gold)">Premium USD ${money(q.premium)}</b> + fees ${money(q.fee)} = <b>USD ${money(q.total)}</b><br>
        Cover ${q.start_date} to ${q.end_date}${q.sum_insured ? ` · Sum insured USD ${money(q.sum_insured)}` : ""}<br>
        <b>Limits:</b> ${esc(q.limits)}<br><b>Deductible:</b> ${esc(q.deductible)}<br><b>Documents needed:</b> ${esc(q.documents)}<br>
        <b>Next:</b> Underwriting review → General Manager final approval${q.board ? " → Board" : ""} → back to you to issue.${q.why ? `<br><b>Underwriting will look at:</b> ${esc(q.why)}` : ""}
        ${q.rule_status === "proposed" ? '<br><span class="pill p">Rates proposed — not yet signed off</span>' : ""}</div>`;
      $("n_issue").classList.remove("hide");
    });
    $("n_go").onclick = run(async () => {
      const { policy: p } = await api({ action: "create_policy", p: read() });
      say(`${p.policy_no} sent to Underwriting. You will find it under My policies when it is approved.`);
      ["n_holder", "n_phone", "n_email", "n_note", "n_ov"].forEach((i) => ($(i).value = "")); reset();
    });
  },
  async s_mine() {
    const rows = (await api({ action: "my_policies" })).rows.map((r) => ({ ...r, stage: stage(r) }));
    const toIssue = rows.filter((r) => r.uw_status === "approved" && !r.issued_to_client_at && !r.lapsed_at);
    const returned = rows.filter((r) => r.uw_status === "returned");
    const unpaid = rows.filter((r) => r.uw_status === "approved" && Number(r.balance) > 0 && !r.lapsed_at);
    const soon = rows.filter((r) => r.uw_status === "approved" && r.end_date && new Date(r.end_date) - new Date() < 30 * 864e5 && r.end_date >= today());
    V().innerHTML = `${kpis([["Approved — issue to client", toIssue.length, toIssue.length > 0], ["Returned to you", returned.length, returned.length > 0], ["Waiting for payment", unpaid.length, unpaid.some((r) => r.pay_by && String(r.pay_by).slice(0, 10) <= today())], ["In approval", rows.filter((r) => ["submitted", "referred", "uw_approved", "board"].includes(r.uw_status)).length]])}
      ${toIssue.length ? `<div class="card"><h2>Approved — issue to the client now</h2><p class="note">Final approval is given. Issue the stamped policy and send it to the client for immediate payment. Cover starts only when the premium is paid (CBL No Premium, No Cover). If nothing is paid within 7 days of approval, the policy lapses automatically.</p><div class="tablewrap" id="t_issue"></div></div>` : ""}
      ${returned.length ? `<div class="card"><h2>Returned to you by Underwriting</h2><div class="tablewrap" id="t_ret"></div></div>` : ""}
      ${unpaid.length ? `<div class="card"><h2>Waiting for payment</h2><p class="note">Only Accounts records payments. Send the client to pay at Accounts, by bank or by mobile money; the policy goes into force as soon as Accounts posts the receipt.</p><div class="tablewrap" id="t_unpaid"></div></div>` : ""}
      ${soon.length ? `<div class="card"><h2>Renewals due in 30 days</h2><div class="tablewrap" id="t_soon"></div></div>` : ""}
      <div class="card"><h2>My policies</h2><div class="tablewrap" id="t_mine"></div></div>`;
    const hide = ["id", "class_code", "created_by", "uw_status", "referred_to", "docs_verified_at", "items", "issued_to_client_at", "status", "lapsed_at"];
    const send = (r) => {
      const total = money(Number(r.gross_premium) + Number(r.policy_fee || 0));
      const msg = `Dear ${r.holder}, your Platinum Insurers policy ${r.policy_no} (${r.class_name}) has been approved. Premium due: USD ${total}${r.pay_by ? ", to be paid by " + String(r.pay_by).slice(0, 10) : ""}. Please settle today at our office (Stop & Shop Building, Randall Street, Monrovia) or by bank transfer — cover starts only when the premium is received, and the approval lapses if it is not paid in time. Thank you. Platinum Insurers, Inc.`;
      const ph = String(r.phone || "").replace(/[^\d]/g, "").replace(/^0/, "231");
      return `${ph ? `<a class="btn ghost sm" style="display:inline-flex;align-items:center;text-decoration:none" target="_blank" href="https://wa.me/${ph}?text=${encodeURIComponent(msg)}">WhatsApp client</a> ` : ""}<a class="btn ghost sm" style="display:inline-flex;align-items:center;text-decoration:none" href="mailto:?subject=${encodeURIComponent("Your Platinum Insurers policy " + r.policy_no)}&body=${encodeURIComponent(msg + "\n\nYour policy document is attached.")}">Email client</a>`;
    };
    if (toIssue.length) table("t_issue", toIssue, { hide, extra: (r) => `<span class="row" style="flex-wrap:nowrap"><button class="btn sm" data-iss="${esc(r.policy_no)}">Issue stamped policy</button> ${send(r)}</span>` });
    if (returned.length) table("t_ret", returned.map((r) => ({ policy_no: r.policy_no, holder: r.holder, class_name: r.class_name, gross_premium: r.gross_premium })), { extra: (r) => `<button class="btn sm" data-rs="${esc(r.policy_no)}">Resubmit</button>` });
    if (unpaid.length) table("t_unpaid", unpaid.map((r) => ({ policy_no: r.policy_no, holder: r.holder, balance: r.balance, pay_by: r.pay_by ? String(r.pay_by).slice(0, 10) : "" })), { extra: (r) => send(rows.find((x) => x.policy_no === r.policy_no)) });
    if (soon.length) table("t_soon", soon, { hide, extra: (r) => printBtn(r.policy_no) });
    table("t_mine", rows, { hide, extra: (r) => r.uw_status === "approved" ? `<span class="row" style="flex-wrap:nowrap">${printBtn(r.policy_no)} ${send(r)}</span>` : "" });
    document.querySelectorAll("[data-iss]").forEach((b) => (b.onclick = run(async () => {
      const w = window.open("print.html?no=" + encodeURIComponent(b.dataset.iss), "_blank");
      await api({ action: "issue_client", policy_no: b.dataset.iss }); say(b.dataset.iss + " issued. Send it to the client for payment."); if (!w) location.href = "print.html?no=" + encodeURIComponent(b.dataset.iss); VIEWS.s_mine(); })));
    document.querySelectorAll("[data-rs]").forEach((b) => (b.onclick = run(async () => {
      const note = prompt("What did you change or add for Underwriting?"); if (note === null) return;
      await api({ action: "resubmit", policy_no: b.dataset.rs, note }); say(b.dataset.rs + " sent back to Underwriting"); VIEWS.s_mine(); })));
  },
  async s_clients() {
    if (!["gm", "admin"].includes(ME.role)) {
      const rows = (await api({ action: "my_clients" })).rows;
      V().innerHTML = `<div class="card"><h2>Add a client contact</h2><p class="note">Record every client you meet here. It builds Platinum's client records and saves you time on new policies. Once saved, details can only be changed by Underwriting or management.</p>
        <div class="grid"><label>Client name<input id="cc_n"></label><label>Company<input id="cc_co"></label><label>Phone / WhatsApp<input id="cc_p" inputmode="tel"></label>
        <label>Email<input id="cc_e" inputmode="email"></label><label>Address<input id="cc_a"></label><label>Notes<input id="cc_no" placeholder="e.g. 3 trucks, renewal in March"></label></div>
        <button class="btn" id="cc_go">Save contact</button></div>
        <div class="card"><h2>My client contacts (${rows.length})</h2><p class="note">View only. Your contacts and clients of policies you entered.</p><div class="tablewrap noCopy" id="t"></div></div>`;
      table("t", rows);
      const box = $("t"); box.style.userSelect = "none"; box.style.webkitUserSelect = "none";
      ["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach((ev) => box.addEventListener(ev, (e) => e.preventDefault()));
      $("cc_go").onclick = run(async () => {
        await api({ action: "add_contact", c: { name: $("cc_n").value, company: $("cc_co").value, phone: $("cc_p").value, email: $("cc_e").value, address: $("cc_a").value, notes: $("cc_no").value } });
        say("Contact saved to Platinum's client records"); VIEWS.s_clients(); });
      return;
    }
    LAST = await list("clients"); V().innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>All client contacts — consolidated</h2>${csvBtn("clients")}</div><div class="tablewrap" id="t"></div></div>`; table("t", LAST, { hide: ["id"] }); bindCsv(); },
  async u_files() {
    const rows = (await kapi({ action: "uw_files" })).rows; LAST = rows;
    const board = ME.role === "board";
    const n = (st) => rows.filter((r) => r.status === st).length;
    const prem = rows.reduce((a, r) => a + Number(r.total_premium || 0), 0), out = rows.reduce((a, r) => a + Number(r.outstanding || 0), 0);
    V().innerHTML = kpis([["Clients", rows.length], ["To sign", n("proposed"), n("proposed") > 0 && !board], ["Signed", n("signed")], ["Premium (USD)", money(prem)], ...(board ? [] : [["Unpaid (USD)", money(out), out > 0]])]) +
      (board ? "" : `<div class="card"><div class="row" style="justify-content:space-between"><div><h2>Replace old policies</h2><p class="note">Generate new Platinum policies (new number, Platinum wording, printable) for every old policy from the opening book and the register. Old numbers are kept for reference. Premiums and accounts do not change.</p></div><button class="btn" id="ri_all">Replace all old policies</button></div></div>`) +
      `<div class="card"><h2>Client underwriting files</h2><p class="note">${board ? "One file per client: covers, vehicles and premium. Underwriting signs each file." : "One file per client, built from the book: covers, vehicles, premium, unpaid balance, claims, fleet terms, deductibles and special terms. Check it, adjust the terms, then sign. Open a file to edit."}</p><div class="tablewrap" id="t"></div></div><div id="uf"></div>`;
    table("t", board ? rows : rows.map((r) => ({ client: r.client, kyc: r.kyc, covers: r.covers, policies: r.policies, vehicles: r.vehicles, total_premium: r.total_premium, outstanding: r.outstanding, claims: r.claims, next_renewal: r.next_renewal, status: r.status === "proposed" ? "To sign" : r.status, party_id: r.party_id })),
      { hide: ["party_id"], extra: board ? null : (r) => `<button class="btn sm ${r.status === "To sign" ? "" : "ghost"}" data-uf="${r.party_id}">Open / edit</button>` });
    document.querySelectorAll("[data-uf]").forEach((b) => (b.onclick = run(() => clientFile(+b.dataset.uf))));
    if ($("ri_all")) $("ri_all").onclick = run(async () => {
      if (!confirm("Generate new Platinum policies for ALL old policies (opening book and register)? Old numbers are kept for reference; premiums and accounts do not change.")) return;
      const x = await kapi({ action: "pol_reissue", all: true }); say(`${x.done.length} new policies generated`); VIEWS.u_files(); });
  },
  async u_certs() {
    const { rows, sum } = await kapi({ action: "cert_list" }); LAST = rows;
    const KN = { sticker: "Sticker", brown_card: "Brown Card" };
    V().innerHTML = kpis([["Stickers in stock", sum.stickers_in_stock, sum.stickers_in_stock < 20], ["Stickers used", sum.stickers_used], ["Brown Cards in stock", sum.brown_in_stock], ["Brown Cards used", sum.brown_used], ["Void / lost", sum.void_lost, sum.void_lost > 0], ["Vehicles without sticker", sum.vehicles_without_sticker, sum.vehicles_without_sticker > 0]]) +
      `<div class="card"><h2>Give stickers and Brown Cards to a policy</h2><p class="note">Enter the policy number (new or old). Each vehicle gets its own sticker and, if it travels to ECOWAS countries, a Brown Card. Leave the number empty to take the next one in stock.</p>
        <div class="row"><input id="ca_pol" placeholder="Policy number" style="max-width:260px"><button class="btn" id="ca_go">Open policy</button></div><div id="ca_box"></div></div>
      <div class="card"><h2>Add stock received</h2><p class="note">Upload the numbers bought from the Ministry of Transport (stickers) or the Brown Card bureau. Give a range (first and last number) or paste a list.</p>
        <div class="grid"><label>Type<select id="cs_kind"><option value="sticker">Insurance sticker (Ministry of Transport)</option><option value="brown_card">ECOWAS Brown Card</option></select></label>
          <label>First number<input id="cs_from" placeholder="e.g. MOT-000101"></label><label>Last number<input id="cs_to" placeholder="e.g. MOT-000600"></label>
          <label>Batch / receipt no.<input id="cs_batch"></label><label>Date received<input id="cs_date" type="date" value="${today()}"></label><label>Cost each (USD)<input id="cs_cost" type="number" step="0.01"></label>
          <label style="grid-column:1/-1">Or paste numbers (one per line or separated by commas)<textarea id="cs_list" rows="3"></textarea></label></div>
        <button class="btn" id="cs_go">Add to stock</button></div>
      <div class="card"><div class="row" style="justify-content:space-between"><h2>Register</h2>${csvBtn("stickers")}</div>
        <div class="row"><select id="cr_k"><option value="">All types</option><option value="sticker">Stickers</option><option value="brown_card">Brown Cards</option></select>
        <select id="cr_s"><option value="">All statuses</option><option value="in_stock">In stock</option><option value="allocated">Allocated</option><option value="void">Void</option><option value="lost">Lost</option></select>
        <input id="cr_q" placeholder="Search number, policy or client" style="max-width:260px"></div><div class="tablewrap" id="t"></div></div>`;
    const draw = () => { const k = $("cr_k").value, st = $("cr_s").value, q = $("cr_q").value.toLowerCase();
      table("t", rows.filter((r) => (!k || r.kind === k) && (!st || r.status === st) && (!q || [r.serial, r.policy_no, r.client].some((x) => String(x || "").toLowerCase().includes(q)))).map((r) => ({ ...r, kind: KN[r.kind], status: String(r.status).replace("_", " ") })).slice(0, 500),
        { hide: ["id"], extra: (r) => r.status === "void" || r.status === "lost" ? "" : `<button class="btn ghost sm" data-cv="${r.id}">Void / lost</button>` });
      document.querySelectorAll("[data-cv]").forEach((b) => (b.onclick = run(async () => { const reason = prompt("Reason (spoilt, lost, returned, wrong vehicle…). Start with LOST if it is lost:"); if (!reason) return;
        await kapi({ action: "cert_void", k: { id: +b.dataset.cv, reason, lost: /^lost/i.test(reason) } }); say("Updated"); VIEWS.u_certs(); }))); };
    ["cr_k", "cr_s"].forEach((i) => ($(i).onchange = draw)); $("cr_q").oninput = draw; draw(); bindCsv();
    $("cs_go").onclick = run(async () => { const r = await kapi({ action: "cert_add", c: { kind: $("cs_kind").value, from: $("cs_from").value, to: $("cs_to").value, list: $("cs_list").value, batch: $("cs_batch").value, received_on: $("cs_date").value, unit_cost: $("cs_cost").value } });
      say(`${r.added} added to stock${r.skipped ? " · " + r.skipped + " already in the register (skipped)" : ""}`); VIEWS.u_certs(); });
    const openPol = async () => {
      const { policy: p, items, next } = await kapi({ action: "cert_policy", policy_no: $("ca_pol").value });
      const nx = (k) => (next.find((x) => x.kind === k) || {}).serial || "none in stock";
      $("ca_box").innerHTML = `<p class="note"><b>${esc(p.policy_no)}</b>${p.old_policy_no ? " (was " + esc(p.old_policy_no) + ")" : ""} · ${esc(p.client || "")} · ${items.length} vehicle(s) · next sticker ${esc(nx("sticker"))} · next Brown Card ${esc(nx("brown_card"))}</p><div class="tablewrap" id="ca_t"></div>`;
      table("ca_t", items, { hide: ["item_id"], extra: (r) => `<input data-pl="${r.item_id}" placeholder="Plate no." value="${esc(r.plate_no || "")}" style="width:110px"> ` +
        (r.sticker ? "" : `<input data-sn="${r.item_id}" placeholder="Sticker no. (blank = next)" style="width:170px"> <button class="btn sm" data-gs="${r.item_id}">Give sticker</button> `) +
        (r.brown_card ? "" : `<input data-bn="${r.item_id}" placeholder="Brown Card no. (blank = next)" style="width:190px"> <button class="btn ghost sm" data-gb="${r.item_id}">Give Brown Card</button>`) });
      const give = (kind, id, numEl) => run(async () => { const x = await kapi({ action: "cert_allocate", k: { kind, item_id: id, serial: numEl ? numEl.value : "", plate_no: (document.querySelector(`[data-pl="${id}"]`) || {}).value } });
        say(`${kind === "sticker" ? "Sticker" : "Brown Card"} ${x.serial} given`); openPol(); });
      document.querySelectorAll("[data-gs]").forEach((b) => (b.onclick = give("sticker", +b.dataset.gs, document.querySelector(`[data-sn="${b.dataset.gs}"]`))));
      document.querySelectorAll("[data-gb]").forEach((b) => (b.onclick = give("brown_card", +b.dataset.gb, document.querySelector(`[data-bn="${b.dataset.gb}"]`))));
    };
    $("ca_go").onclick = run(openPol); $("ca_pol").addEventListener("keydown", (e) => { if (e.key === "Enter") $("ca_go").click(); });
  },
});
