// Platinum Operations Platform — forms and shared views: client file, KYC form, quarterly reports, wordings, product rules.

// ---------- client underwriting file (edit) ----------
async function clientFile(pid) {
  const { party: c, file: r, policies } = await kapi({ action: "uw_file_get", party_id: pid });
  const extra = (r.extra || []).slice();
  const inp = (id, l, v, t = "text") => `<label>${l}<input id="${id}" type="${t}" value="${esc(v || "")}"></label>`;
  const ta = (f, l) => `<label style="grid-column:1/-1">${l}<textarea id="uf_${f}" rows="3">${esc(r[f] || "")}</textarea></label>`;
  const ST = { proposed: "To sign", signed: "Signed by " + esc(r.signed_by || ""), declined: "Declined" };
  $("uf").innerHTML = `<div class="card" id="ufc"><div class="row" style="justify-content:space-between"><h2>${esc(c.name)}</h2><span class="pill ${r.status === "signed" ? "a" : "p"}">${ST[r.status] || r.status}</span></div>
    <p class="note">${esc(r.covers || "")} · ${r.policies} policies · ${r.vehicles} vehicles/items · premium USD ${money(r.total_premium)} · unpaid USD ${money(r.outstanding)} · claims ${r.claims} · next renewal ${String(r.next_renewal || "").slice(0, 10)}</p>
    <h3>Client details</h3><div class="grid">${inp("cf_name", "Client name", c.name)}${inp("cf_company", "Company", c.company)}${inp("cf_phone", "Phone / WhatsApp", c.phone, "tel")}${inp("cf_email", "Email", c.email, "email")}${inp("cf_address", "Address", c.address)}${inp("cf_notes", "Notes", c.notes)}</div>
    <h3>Underwriting terms</h3><div class="grid">${ta("fleet_terms", "Fleet terms and renewal")}${ta("deductibles", "Deductibles")}${ta("special_terms", "Special terms and conditions")}${ta("risk_notes", "Risk notes")}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><h3>More details</h3><button class="btn ghost sm" id="cf_plus" title="Add a detail">＋ Add detail</button></div>
    <div id="cf_extra"></div>
    <div class="row" style="justify-content:space-between;margin-top:12px"><h3>Policies (${policies.length})</h3>${policies.some((p) => p.is_old) ? `<button class="btn sm" id="cf_riall">Replace all old policies (${policies.filter((p) => p.is_old).length})</button>` : ""}</div><div class="tablewrap" id="cf_pol"></div>
    ${r.sign_note ? `<p class="note"><b>Sign-off note:</b> ${esc(r.sign_note)}</p>` : ""}
    <p class="note">Changing a signed file sends it back for signing.</p>
    <div class="row"><button class="btn ghost" id="uf_save">Save changes</button><button class="btn" id="uf_sign">Sign file</button><button class="btn ghost" id="uf_dec">Decline</button><button class="btn ghost" id="uf_close">Close</button></div></div>`;
  table("cf_pol", policies, { hide: ["is_old"], extra: (p) => p.is_old ? `<button class="btn sm" data-ri="${esc(p.policy_no)}">Generate new policy</button>` : printBtn(p.policy_no) });
  document.querySelectorAll("[data-ri]").forEach((b) => (b.onclick = run(async () => {
    if (!confirm(`Generate a new Platinum policy to replace ${b.dataset.ri}? The old number is kept for reference; premium and accounts do not change.`)) return;
    const x = await kapi({ action: "pol_reissue", policy_no: b.dataset.ri }); say(`New policy ${x.done[0].new} replaces ${x.done[0].old}`); clientFile(pid); })));
  if ($("cf_riall")) $("cf_riall").onclick = run(async () => {
    const n = policies.filter((p) => p.is_old).length; if (!confirm(`Generate new Platinum policies for all ${n} old policies of ${c.name}?`)) return;
    const x = await kapi({ action: "pol_reissue", all: true, party_id: pid }); say(`${x.done.length} new policies generated for ${c.name}`); clientFile(pid); });
  const drawExtra = () => {
    $("cf_extra").innerHTML = extra.length ? extra.map((x, i) => `<div class="row" style="gap:8px;align-items:flex-end;margin-bottom:6px"><label style="flex:1">Detail<input data-xl="${i}" value="${esc(x.label)}" placeholder="e.g. Fleet manager"></label><label style="flex:2">Value<input data-xv="${i}" value="${esc(x.value)}" placeholder="e.g. John Doe, 0777 000 000"></label><button class="btn ghost sm" data-xd="${i}" title="Remove">✕</button></div>`).join("") : '<p class="note">No extra details yet. Tap ＋ to add one (e.g. fleet manager, preferred garage, agent, payment terms).</p>';
    document.querySelectorAll("[data-xl]").forEach((e) => (e.oninput = () => (extra[+e.dataset.xl].label = e.value)));
    document.querySelectorAll("[data-xv]").forEach((e) => (e.oninput = () => (extra[+e.dataset.xv].value = e.value)));
    document.querySelectorAll("[data-xd]").forEach((e) => (e.onclick = () => { extra.splice(+e.dataset.xd, 1); drawExtra(); }));
  };
  drawExtra();
  $("cf_plus").onclick = () => { extra.push({ label: "", value: "" }); drawExtra(); const ins = document.querySelectorAll("[data-xl]"); if (ins.length) ins[ins.length - 1].focus(); };
  const client = () => ({ name: $("cf_name").value, company: $("cf_company").value, phone: $("cf_phone").value, email: $("cf_email").value, address: $("cf_address").value, notes: $("cf_notes").value });
  const clientChanged = () => { const n = client(); return ["name", "company", "phone", "email", "address", "notes"].some((k) => (n[k] || "").trim() !== (c[k] || "")); };
  const f = (decision, note) => ({ party_id: pid, client: client(), client_changed: clientChanged(), extra: extra.filter((x) => (x.label || "").trim() || (x.value || "").trim()),
    fleet_terms: $("uf_fleet_terms").value, deductibles: $("uf_deductibles").value, special_terms: $("uf_special_terms").value, risk_notes: $("uf_risk_notes").value, decision, note });
  $("uf_save").onclick = run(async () => { const x = await kapi({ action: "uw_file_save", f: f() }); say(x.status === "proposed" && r.status === "signed" ? "Saved — the file goes back for signing" : "Saved"); await VIEWS.u_files(); clientFile(pid); });
  $("uf_sign").onclick = run(async () => { const note = prompt("Sign-off note (what you checked):"); if (!note) return; await kapi({ action: "uw_file_save", f: f("sign", note) }); say(c.name + " file signed"); VIEWS.u_files(); });
  $("uf_dec").onclick = run(async () => { const note = prompt("Why decline (non-renewal or terms)?"); if (!note) return; await kapi({ action: "uw_file_save", f: f("decline", note) }); say(c.name + " file declined"); VIEWS.u_files(); });
  $("uf_close").onclick = () => ($("uf").innerHTML = "");
  $("ufc").scrollIntoView({ behavior: "smooth" });
}

// ---------- KYC form ----------
const KYC_DOCS = { id: "ID / passport", address: "Proof of address", registration: "Business registration", tin: "TIN certificate", other: "Other" };
async function kycForm(pid) {
  const { party, kyc, missing } = await kapi({ action: "kyc_get", party_id: pid });
  const k = kyc || { client_type: party.company ? "company" : "individual", full_name: party.company || party.name, phone: party.phone, email: party.email, residential_address: party.address, docs: [], status: "draft" };
  const mgr = ["underwriter", "gm", "admin"].includes(ME.role);
  const locked = !mgr && !["draft", "rejected", "submitted"].includes(k.status || "draft");
  const val = (f) => esc(k[f] === null || k[f] === undefined ? "" : /date|expiry|incorporated/.test(f) ? String(k[f]).slice(0, 10) : k[f]);
  const inp = (f, l, t = "text", ph = "") => `<label>${l}<input data-k="${f}" type="${t}" value="${val(f)}" placeholder="${ph}" ${locked ? "disabled" : ""}></label>`;
  const area = (f, l, ph = "") => `<label style="grid-column:1/-1">${l}<textarea data-k="${f}" rows="2" placeholder="${ph}" ${locked ? "disabled" : ""}>${val(f)}</textarea></label>`;
  const STAT = { draft: "Draft", submitted: "With Underwriting", verified: "Verified", rejected: "Sent back — fix and resubmit", expired: "Expired — review needed" };
  $("kf").innerHTML = `<div class="card" id="kcard"><div class="row" style="justify-content:space-between"><h2>KYC — ${esc(party.name)}</h2>
    <span class="pill ${k.status === "verified" ? "a" : "p"}">${STAT[k.status || "draft"]}${k.risk ? " · " + k.risk + " risk" : ""}</span></div>
    ${missing && missing.length ? `<div class="quote" style="border-color:var(--red)"><b>Missing details (${missing.length})</b> — fill these in below or upload, then save:<br>${missing.map((m) => "• " + esc(m)).join("<br>")}</div>` : kyc ? `<div class="quote"><b>All required details are in.</b>${k.status === "draft" || k.status === "rejected" ? " Send it to Underwriting." : ""}</div>` : ""}
    ${locked ? `<p class="note">This KYC is verified. To change it, ask Underwriting — they can edit and re-check it.</p>` : ""}
    ${k.verify_note ? `<p class="note"><b>Underwriting note:</b> ${esc(k.verify_note)}</p>` : ""}
    ${k.next_review ? `<p class="note">Next review: ${String(k.next_review).slice(0, 10)}${k.verified_by ? " · verified by " + esc(k.verified_by) : ""}</p>` : ""}
    <div class="grid"><label>Client type<select data-k="client_type" ${locked ? "disabled" : ""}><option value="individual">Individual</option><option value="company">Company</option></select></label>
      ${inp("full_name", "Full name / company name")}${inp("phone", "Phone / WhatsApp", "tel")}${inp("email", "Email", "email")}${inp("tin", "TIN")}</div>
    <h3 class="kind-ind">Individual</h3><div class="grid kind-ind">
      <label>ID type<select data-k="id_type" ${locked ? "disabled" : ""}><option value="">Choose…</option>${["National ID", "Passport", "Driver's licence", "Voter card", "Residence permit"].map((x) => `<option ${k.id_type === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      ${inp("id_number", "ID number")}${inp("id_issue_date", "ID issue date", "date")}${inp("id_expiry", "ID expiry date", "date")}${inp("date_of_birth", "Date of birth", "date")}
      ${inp("nationality", "Nationality", "text", "Liberian")}<label>Gender<select data-k="gender" ${locked ? "disabled" : ""}><option value="">—</option>${["Male", "Female"].map((x) => `<option ${k.gender === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      ${inp("occupation", "Occupation")}${inp("employer_business", "Employer / own business")}</div>
    <h3 class="kind-co">Company</h3><div class="grid kind-co">
      ${inp("company_reg_no", "Business registration no.")}${inp("date_incorporated", "Date registered", "date")}${inp("business_type", "Type of business")}
      ${area("directors", "Directors (names)")}${area("beneficial_owners", "Owners with 25% or more (names and %)")}${inp("authorised_signatory", "Authorised signatory")}</div>
    <div class="grid">${area("residential_address", "Address (home or business)")}${inp("county", "County")}
      <label>Source of funds<select data-k="source_of_funds" ${locked ? "disabled" : ""}><option value="">Choose…</option>${["Salary", "Business income", "Rental income", "Savings", "Company funds", "Donor / NGO funds", "Other"].map((x) => `<option ${k.source_of_funds === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      ${inp("expected_annual_premium", "Expected yearly premium (USD)", "number")}
      <label><span>Politically exposed person (PEP)?</span><select data-k="pep" ${locked ? "disabled" : ""}><option value="">No</option><option value="1" ${k.pep ? "selected" : ""}>Yes</option></select></label>
      ${area("pep_detail", "If PEP: position held, and by whom (self or family)")}
      ${mgr ? `<label><span>Sanctions list checked</span><select data-k="sanctions_checked"><option value="">No</option><option value="1" ${k.sanctions_checked ? "selected" : ""}>Yes</option></select></label>${area("sanctions_note", "Sanctions check result (lists checked, any match)", "UN / OFAC / EU — no match")}` : ""}</div>
    <h3>Documents</h3><div id="kdocs"></div>
    ${locked ? "" : `<div class="row"><select id="kd_kind">${Object.entries(KYC_DOCS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select><input type="file" id="kd_file" accept="image/*,.pdf"><button class="btn ghost sm" id="kd_go">Upload</button></div>`}
    <div class="row" style="margin-top:12px">
      ${locked ? "" : `<button class="btn ghost" id="k_save">${k.status === "draft" || !kyc ? "Save draft" : "Save changes"}</button>${k.status === "submitted" || k.status === "verified" ? "" : `<button class="btn" id="k_sub">${mgr ? "Save and mark submitted" : "Send to Underwriting"}</button>`}`}
      ${mgr && k.status === "submitted" ? `<button class="btn" id="k_ok">Verify KYC</button><button class="btn ghost" id="k_no">Send back</button>` : ""}
    </div></div>`;
  const ct = document.querySelector('[data-k="client_type"]'); ct.value = k.client_type || "individual";
  const kindShow = () => { const co = ct.value === "company"; document.querySelectorAll(".kind-co").forEach((e) => (e.style.display = co ? "" : "none")); document.querySelectorAll(".kind-ind").forEach((e) => (e.style.display = co ? "none" : "")); };
  ct.onchange = kindShow; kindShow();
  const docs = k.docs || [];
  $("kdocs").innerHTML = docs.length ? docs.map((d) => `<div class="row" style="justify-content:space-between;border-bottom:1px solid #223;padding:6px 0"><span>${esc(KYC_DOCS[d.kind] || d.kind)} — ${esc(d.name)} <span class="note">${String(d.at || "").slice(0, 10)}</span></span><button class="btn ghost sm" data-kdo="${esc(d.path)}">Open</button></div>`).join("") : '<p class="note">No documents yet. Upload the ID first.</p>';
  document.querySelectorAll("[data-kdo]").forEach((b) => (b.onclick = run(async () => { const w = window.open("", "_blank"); const r = await kapi({ action: "kyc_doc_open", party_id: pid, path: b.dataset.kdo }); if (w) w.location = r.url; else location.href = r.url; })));
  const collect = () => { const o = {}; document.querySelectorAll("#kcard [data-k]").forEach((e) => (o[e.dataset.k] = e.value)); o.pep = !!o.pep; if ("sanctions_checked" in o) o.sanctions_checked = !!o.sanctions_checked; return o; };
  if (!locked) {
    $("kd_go").onclick = run(async () => {
      const f = $("kd_file").files[0]; if (!f) throw new Error("Choose a file first"); if (f.size > 10 * 1024 * 1024) throw new Error("File is over 10 MB");
      await kapi({ action: "kyc_save", party_id: pid, k: collect() });
      const buf = new Uint8Array(await f.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      await kapi({ action: "kyc_doc_add", party_id: pid, d: { kind: $("kd_kind").value, file: { name: f.name, type: f.type, b64: btoa(bin) } } });
      say("Document uploaded"); kycForm(pid);
    });
    $("k_save").onclick = run(async () => { const r = await kapi({ action: "kyc_save", party_id: pid, k: collect() }); say("KYC saved · risk " + r.risk + (r.missing && r.missing.length ? " · still missing " + r.missing.length : " · nothing missing")); kycForm(pid); });
    if ($("k_sub")) $("k_sub").onclick = run(async () => { await kapi({ action: "kyc_save", party_id: pid, k: collect(), submit: true }); say("KYC sent to Underwriting"); VIEWS.s_kyc(); });
  }
  if ($("k_ok")) {
    $("k_ok").onclick = run(async () => { await kapi({ action: "kyc_save", party_id: pid, k: collect() }).catch(() => null); const note = prompt("Verification note (documents seen, sanctions result):"); if (note === null) return;
      await kapi({ action: "kyc_verify", party_id: pid, decision: "verify", note }); say("KYC verified"); VIEWS.s_kyc(); });
    $("k_no").onclick = run(async () => { const note = prompt("What must be fixed?"); if (!note) return; await kapi({ action: "kyc_verify", party_id: pid, decision: "reject", note }); say("KYC sent back"); VIEWS.s_kyc(); });
  }
  $("kcard").scrollIntoView({ behavior: "smooth" });
}

function quarterView(page, title, desc) {
  const now = new Date(), opts = [];
  for (let i = 0; i < 8; i++) {
    const q = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3 - 3 * i, 1));
    if (q < new Date(Date.UTC(2026, 6, 1))) break;
    const label = `Q${Math.floor(q.getUTCMonth() / 3) + 1} ${q.getUTCFullYear()}` + (i === 0 ? " (current, to date)" : "");
    opts.push(`<option value="${q.toISOString().slice(0, 10)}"${i === 1 ? " selected" : ""}>${label}</option>`);
  }
  V().innerHTML = `<div class="card"><h2>${title}</h2><p class="note">${desc} Built from the books. The General Manager or CEO can tap <b>Edit</b> on the report to correct or add to it, then <b>Save changes</b>; <b>Back to books figures</b> removes the edits. Print or save as PDF to send.</p>
    <div class="row"><label style="flex:1">Quarter<select id="q_q">${opts.join("")}</select></label>
    <a class="btn" id="q_open" target="_blank" style="align-self:flex-end;display:inline-flex;align-items:center;text-decoration:none">Open report</a></div></div>`;
  const set = () => ($("q_open").href = page + ".html?q=" + $("q_q").value); $("q_q").onchange = set; set();
}

async function wordingView(ceo) {
  const ws = await list("wordings"); const canEdit = ["underwriter", "gm", "admin"].includes(ME.role);
  const cur = {}; ws.forEach((w) => { if (w.status !== "superseded" && (!cur[w.class_code] || w.status === "approved")) cur[w.class_code] = w; });
  const prods = Object.values(cur);
  V().innerHTML = `<div class="card"><h2>${ceo ? "Sign off standard wordings" : "Standard policy wordings"}</h2>
    <p class="note">One standard wording per product, the same for every client. Client-specific additions are made as clauses (Underwriting → Client clauses) and print after the wording. Every policy keeps the wording version it was issued under.</p>
    <label>Product<select id="w_p">${prods.map((w) => `<option value="${w.class_code}">${esc(w.product)} — ${w.status === "approved" ? "approved" : "proposed"} (v${esc(w.version)})</option>`).join("")}</select></label>
    <div id="w_box"></div></div>
    <div class="card"><h2>All versions</h2><div class="tablewrap" id="t"></div></div>`;
  table("t", ws, { hide: ["id", "class_code"] });
  const show = run(async () => {
    const { wording: w } = await api({ action: "wording_get", class_code: $("w_p").value });
    $("w_box").innerHTML = `<p class="note">Status: <span class="pill ${w.status === "approved" ? "a" : "p"}">${w.status === "approved" ? "Approved by " + esc(w.approved_by || "") : "Proposed — for sign-off"}</span> · Version ${esc(w.version)} · ${esc(w.source || "")}</p>
      <label>Title<input id="w_t" value="${esc(w.title || "")}" ${canEdit ? "" : "disabled"}></label>
      <label>Version<input id="w_v" value="" placeholder="New version name, e.g. 2027-1" ${canEdit ? "" : "disabled"}></label>
      <label>Wording<textarea id="w_b" style="min-height:420px;font-family:inherit;font-size:14px;line-height:1.45" ${canEdit ? "" : "disabled"}>${esc(w.body)}</textarea></label>
      ${canEdit ? `<div class="row"><button class="btn ghost" id="w_s">Save as proposed</button>${ME.role === "admin" ? '<button class="btn" id="w_a">Approve this wording</button>' : ""}</div>` : ""}`;
    const save = (status) => run(async () => { const r = await api({ action: "wording_save", w: { class_code: $("w_p").value, title: $("w_t").value, version: $("w_v").value, body: $("w_b").value, status } }); say("Wording " + (r.status === "approved" ? "approved — new policies use it from now" : "saved as proposed")); wordingView(ceo); });
    if ($("w_s")) $("w_s").onclick = save("proposed"); if ($("w_a")) $("w_a").onclick = save("approved");
  });
  $("w_p").onchange = show; show();
}

async function rulesView(ceo) {
  const rules = await list("rules");
  const canEdit = ["underwriter", "gm", "admin"].includes(ME.role);
  V().innerHTML = `<div class="card"><h2>${ceo ? "Sign off product rules" : "Product underwriting rules"}</h2>
    <p class="note">One rule per product: rating, minimum premium, limits, deductibles, eligibility, documents, exclusions, conditions and referral triggers. ${ceo ? "Approve each product once you agree its figures." : "Changes go back to 'Proposed' until the CEO signs them off."}</p>
    <label>Product<select id="rl_c">${rules.map((r) => `<option value="${r.class_code}">${esc(r.name)} — ${r.status === "approved" ? "approved" : "proposed"}</option>`).join("")}</select></label>
    <div id="rl_f"></div></div>
    <div class="card"><h2>All products</h2><div class="tablewrap" id="t"></div></div>`;
  table("t", rules.map((r) => ({ product: r.name, status: r.status, rate: r.rate, unit: r.rate_unit, min_premium: r.min_premium, refer_above: r.max_auto_value, max_value: r.max_value, deductible: r.deductible })));
  const F = ["rating_basis", "rate", "min_premium", "policy_fee", "max_auto_value", "max_value", "limits", "deductible", "deductible_pct", "deductible_min", "eligibility", "documents", "exclusions", "conditions", "referral_triggers"];
  const show = () => {
    const r = rules.find((x) => x.class_code === $("rl_c").value);
    $("rl_f").innerHTML = `<p class="note">Status: <span class="pill ${r.status === "approved" ? "a" : "p"}">${r.status === "approved" ? "Approved by " + esc(r.approved_by) : "Proposed — for sign-off"}</span> · Pattern ${esc(r.pattern)} · Rate unit: ${esc(r.rate_unit)} · Treaty: ${esc(r.treaty_section)}</p>
      <div class="grid">${F.map((k) => /^(rate|min_premium|policy_fee|max_auto_value|max_value|deductible_pct|deductible_min)$/.test(k)
        ? `<label>${label(k)}<input data-f="${k}" value="${esc(r[k] ?? "")}" ${canEdit ? "" : "disabled"} inputmode="decimal"></label>`
        : `<label style="grid-column:1/-1">${label(k)}<textarea data-f="${k}" ${canEdit ? "" : "disabled"}>${esc(r[k] ?? "")}</textarea></label>`).join("")}
      <label>Always refer<select data-f="always_refer" ${canEdit ? "" : "disabled"}><option value="">No</option><option value="1" ${r.always_refer ? "selected" : ""}>Yes</option></select></label></div>
      ${canEdit ? `<div class="row"><button class="btn ghost" id="rl_s">Save as proposed</button>${ME.role === "admin" ? '<button class="btn" id="rl_a">Approve and sign off</button>' : ""}</div>` : ""}`;
    const save = (status) => run(async () => {
      const o = { class_code: r.class_code, status }; document.querySelectorAll("[data-f]").forEach((i) => (o[i.dataset.f] = i.value)); o.always_refer = !!o.always_refer;
      const x = await api({ action: "save_rule", r: o }); say(`${r.name}: ${x.status === "approved" ? "approved and signed off" : "saved as proposed"}`); rulesView(ceo);
    });
    if ($("rl_s")) $("rl_s").onclick = save("proposed"); if ($("rl_a")) $("rl_a").onclick = save("approved");
  };
  $("rl_c").onchange = show; show();
}

