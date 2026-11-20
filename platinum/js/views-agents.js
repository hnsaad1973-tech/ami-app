// Platinum Operations Platform — agents screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== Agents and brokers (v4.1) =====
  async u_agents() {
    const { rows, sum } = await gapi({ action: "agent_list" }); LAST = rows;
    const board = ME.role === "board", mode = CUR_TAB === "ag_alloc" ? "alloc" : CUR_TAB === "ag_pol" ? "pol" : "list";
    const acct = mode === "pol", canEdit = ["underwriter", "gm", "admin"].includes(ME.role), edit = mode === "list" && canEdit, alloc = mode === "alloc" && canEdit;
    const TY = { agent: "Agent", broker: "Broker" };
    V().innerHTML = (board || mode !== "list" ? "" : kpis([["Active agents", sum.active], ["Licences expiring (30 days)", sum.licence_due, sum.licence_due > 0], ["Policies with no agent", sum.direct_policies], ["Commission owed (USD)", money(sum.owed), Number(sum.owed) > 0]])) +
      (edit ? `<div class="card"><div class="row" style="justify-content:space-between"><div><h2>Agents and brokers</h2><p class="note">Register each agent or broker with their licence and commission rate, then give them their policies. Commission is earned when the client pays and is paid from Agents & Brokers → Commission payments.</p></div><button class="btn" id="ag_new">＋ New agent / broker</button></div><div id="ag_form"></div></div>` : "") + (alloc ? `
<div id="as_holder"></div>` : "") + (mode !== "list" ? "" :
      `<div class="card"><div class="row" style="justify-content:space-between"><h2>${board || acct ? "Agents and brokers" : "Register"}</h2>${csvBtn("agents")}</div><div class="tablewrap" id="t"></div></div><div id="ag_view"></div>`) +
      (acct ? `<div class="card"><h2>Policies given to agents and brokers</h2><p class="note">Only policies under an agent or broker. Tap <b>Account</b> on an agent for their statement.</p><div class="tablewrap" id="acc_all"><p class="note" style="padding:12px">Loading…</p></div></div>` : "");
    if (mode === "list") table("t", rows.map((r) => board ? { ...r, agent_type: TY[r.agent_type] } : { code: r.code, name: r.name, type: TY[r.agent_type], area: r.area, phone: r.phone, licence_no: r.licence_no, licence_expiry: r.licence_expiry, rate: r.comm_pct + "%", status: r.status, policies: r.policies, premium: r.premium, earned: r.earned, paid: r.paid, owed: r.owed, id: r.id }),
      { hide: ["id"], extra: board ? null : (r) => `<button class="btn sm" data-acc="${r.id}">Account</button>${edit ? ` <button class="btn ghost sm" data-ag="${r.id}">Edit</button>${r.status === "active" ? ` <button class="btn ghost sm" data-agp="${r.id}" data-agn="${esc(r.code + " · " + r.name)}">Give policies</button>` : ""}` : ""}` });
    bindCsv();
    document.querySelectorAll("[data-ag]").forEach((b) => (b.onclick = run(() => agentForm(+b.dataset.ag, edit))));
    document.querySelectorAll("[data-acc]").forEach((b) => (b.onclick = run(() => agentAccount(+b.dataset.acc, edit))));
    document.querySelectorAll("[data-agp]").forEach((b) => (b.onclick = run(() => { if ($("ag_form")) $("ag_form").innerHTML = ""; return policyPicker($("ag_view"), rows, b.dataset.agp, () => VIEWS.u_agents(), "Give policies to " + b.dataset.agn); })));
    if (acct) {
      const withPol = rows.filter((r) => r.policies > 0);
      Promise.all(withPol.map((r) => gapi({ action: "agent_get", id: r.id }).then((x) => x.policies.map((p) => ({ agent: r.code + " · " + r.name, policy_no: p.policy_no, client: p.client, cover: p.class_code, start_date: p.start_date, end_date: p.end_date, status: p.status, premium: p.gross_premium, received: p.received, rate: p.comm_pct + "%", commission: p.commission })))))
        .then((all) => table("acc_all", all.flat())).catch((e) => ($("acc_all").innerHTML = `<p class="note" style="padding:12px">${esc(e.message)}</p>`));
    }
    if (edit) $("ag_new").onclick = () => agentForm(null, true);
    if (!alloc) return;
    await policyPicker($("as_holder"), rows, PRESEL_AG); PRESEL_AG = "";
  },
  ag_list() { return VIEWS.u_agents(); }, ag_alloc() { return VIEWS.u_agents(); }, ag_pol() { return VIEWS.u_agents(); },
});

// ---------- agents: policy picker, account, edit form ----------
async function policyPicker(holder, rows, preset, after, title) {
  holder.innerHTML = `<div class="card" id="as_card"><div class="row" style="justify-content:space-between"><h2>${esc(title || "Give policies to an agent")}</h2>${title ? '<button class="btn ghost sm" id="as_close">Close</button>' : ""}</div><p class="note">Tick the policies, pick the agent, then tap <b>Give to agent</b>. Leave the rate empty to use the agent's own rate. Choose "No agent (direct)" to take policies away from an agent. Commission already booked on money received moves to the new agent.</p>
        <div class="grid"><label>Agent<select id="as_ag"><option value="">No agent (direct)</option>${rows.filter((r) => r.status === "active").map((r) => `<option value="${r.id}">${esc(r.code + " · " + r.name)} (${r.comm_pct}%)</option>`).join("")}</select></label>
          <label>Commission % (optional)<input id="as_pct" type="number" step="0.01" placeholder="agent's rate"></label>
          <label>Show<select id="as_f"><option value="none">Policies with no agent</option><option value="">All policies</option></select></label>
          <label>Search<input id="as_q" placeholder="Client or policy number"></label></div>
        <div class="row" style="justify-content:space-between;margin:8px 0"><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="as_all" style="width:22px;min-height:22px"> Tick all shown</label><span class="note" id="as_n">0 ticked</span></div>
        <div class="tablewrap" id="as_t"><p class="note" style="padding:12px">Loading policies…</p></div>
        <button class="btn" id="as_go" style="margin-top:10px">Give to agent</button></div>`;
  if (preset) $("as_ag").value = String(preset);
  if ($("as_close")) $("as_close").onclick = () => (holder.innerHTML = "");
    let POL = []; const tick = new Set();
    const drawP = () => {
      const f = $("as_f").value, q = $("as_q").value.toLowerCase();
      const shown = POL.filter((r) => (f !== "none" || !r.agent) && (!q || [r.client, r.policy_no, r.old_policy_no].some((x) => String(x || "").toLowerCase().includes(q))));
      $("as_t").innerHTML = shown.length ? `<table><thead><tr><th></th><th>Policy</th><th>Client</th><th>Cover</th><th>Start</th><th>End</th><th>Premium</th><th>Agent now</th></tr></thead><tbody>` +
        shown.map((r) => `<tr><td><input type="checkbox" data-tp="${r.id}" ${tick.has(r.id) ? "checked" : ""} style="width:22px;min-height:22px"></td><td>${esc(r.policy_no)}${r.old_policy_no ? `<br><span class="note">was ${esc(r.old_policy_no)}</span>` : ""}</td><td>${esc(r.client || "")}</td><td>${esc(r.cover || "")}</td><td>${esc(String(r.start_date || "").slice(0, 10))}</td><td>${esc(String(r.end_date || "").slice(0, 10))}</td><td class="n">${money(r.premium)}</td><td>${r.agent ? esc(r.agent_code + " · " + r.agent) + ` (${r.rate}%)` : '<span class="note">Direct</span>'}</td></tr>`).join("") + "</tbody></table>"
        : '<p class="note" style="padding:12px">No policies to show.</p>';
      document.querySelectorAll("[data-tp]").forEach((c) => (c.onchange = () => { const id = +c.dataset.tp; c.checked ? tick.add(id) : tick.delete(id); $("as_n").textContent = tick.size + " ticked"; }));
      $("as_all").checked = shown.length > 0 && shown.every((r) => tick.has(r.id));
      $("as_all").onchange = () => { shown.forEach((r) => ($("as_all").checked ? tick.add(r.id) : tick.delete(r.id))); drawP(); };
      $("as_n").textContent = tick.size + " ticked";
    };
    $("as_f").onchange = drawP; $("as_q").oninput = drawP;
    gapi({ action: "agent_policies" }).then((x) => { POL = x.rows; drawP(); }).catch((e) => ($("as_t").innerHTML = `<p class="note" style="padding:12px">${esc(e.message)}</p>`));
    $("as_go").onclick = run(async () => {
      if (!tick.size) throw new Error("Tick at least one policy");
      const agent = $("as_ag"); const who = agent.value ? agent.options[agent.selectedIndex].text : "no agent (direct)";
      if (!confirm(`Give ${tick.size} polic${tick.size === 1 ? "y" : "ies"} to ${who}?`)) return;
      const x = await gapi({ action: "agent_assign", k: { agent_id: agent.value || null, comm_pct: $("as_pct").value, policy_ids: [...tick] } });
      say(`${x.count} polic${x.count === 1 ? "y" : "ies"} given to ${who} at ${x.rate}%${x.adjusted ? " · commission already booked moved on " + x.adjusted : ""}`); after ? after() : VIEWS.u_agents(); });
  holder.scrollIntoView({ behavior: "smooth" });
}
async function agentAccount(id, edit) {
  const { agent: g, policies, lines } = await gapi({ action: "agent_get", id });
  const tot = (k) => policies.reduce((a, p) => a + Number(p[k] || 0), 0);
  const earned = lines.reduce((a, l) => a + Number(l.earned || 0), 0), paid = lines.reduce((a, l) => a + Number(l.paid || 0), 0);
  let bal = 0; const stmt = lines.map((l) => { bal += Number(l.earned || 0) - Number(l.paid || 0); return { date: String(l.jdate).slice(0, 10), details: l.memo, earned: l.earned, paid: l.paid, balance: bal }; });
  const box = $("ag_view"); if ($("ag_form")) $("ag_form").innerHTML = "";
  box.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><div><h2>Account — ${esc(g.code)} · ${esc(g.name)}</h2><p class="note">${g.agent_type === "broker" ? "Broker" : "Agent"} · ${esc(g.status)} · commission ${g.comm_pct}%${g.phone ? " · " + esc(g.phone) : ""}${g.licence_no ? " · licence " + esc(g.licence_no) : ""}${g.licence_expiry ? " (expires " + String(g.licence_expiry).slice(0, 10) + ")" : ""}</p></div>
      <div class="row">${edit ? `<button class="btn ghost sm" id="acc_edit">Edit</button>` : ""}<button class="btn ghost sm" id="acc_close">Close</button></div></div>
    ${kpis([["Policies", policies.length], ["Premium (USD)", money(tot("gross_premium"))], ["Client paid (USD)", money(tot("received"))], ["Commission earned", money(earned)], ["Commission paid", money(paid)], ["Commission owed", money(earned - paid), earned - paid > 0]])}
    <h2 style="margin-top:12px">Policies under this ${g.agent_type === "broker" ? "broker" : "agent"}</h2><div class="tablewrap" id="acc_p"></div>
    <h2 style="margin-top:16px">Commission statement</h2><div class="tablewrap" id="acc_s"></div></div>`;
  table("acc_p", policies.map(({ comm_pct, gross_premium, ...p }) => ({ policy_no: p.policy_no, was: p.old_policy_no, client: p.client, cover: p.class_code, start_date: p.start_date, end_date: p.end_date, status: p.status, premium: gross_premium, received: p.received, rate: comm_pct + "%", commission: p.commission })),
    { extra: (r) => printBtn(r.policy_no) });
  table("acc_s", stmt);
  $("acc_close").onclick = () => (box.innerHTML = "");
  const ref = g.code; const sc = await sapi({ action: "check", kind: "statement", ref }).catch(() => ({ allowed: false }));
  const tools = document.createElement("div"); tools.className = "row"; tools.style.marginTop = "10px"; box.firstElementChild.appendChild(tools);
  if (sc.allowed) {
    tools.innerHTML = `<button class="btn ghost sm" id="acc_pr">Print / save statement</button>${sc.boss ? "" : `<span class="note">Approved to share until ${new Date(sc.until).toLocaleString("en-GB")}</span>`}`;
    $("acc_pr").onclick = () => { const w = window.open("", "_blank"); w.document.write(`<html><head><title>Statement of account — ${esc(g.code)} ${esc(g.name)}</title><style>body{font:13px Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}.tsearch{display:none}</style></head><body><h2>Platinum Insurers — Statement of account</h2><p>${esc(g.code)} · ${esc(g.name)} · ${new Date().toLocaleDateString("en-GB")}</p>${$("acc_p").innerHTML}<h3>Commission statement</h3>${$("acc_s").innerHTML}</body></html>`); w.document.close(); w.print(); };
  } else {
    const c = box.firstElementChild; c.style.userSelect = "none"; c.style.webkitUserSelect = "none";
    ["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach((ev) => c.addEventListener(ev, (e) => e.preventDefault()));
    tools.innerHTML = `<span class="note">Statements cannot be printed, copied or shared without GM or CEO approval.</span> <button class="btn ghost sm" id="acc_ask"${sc.pending ? " disabled" : ""}>${sc.pending ? "Waiting for GM / CEO approval" : "Ask GM / CEO to approve sharing"}</button>`;
    $("acc_ask").onclick = run(async () => { const reason = prompt("Why must this statement be shared?"); if (!reason) return; const to = prompt("Who will receive it? (name / email / phone)") || "";
      await sapi({ action: "request", kind: "statement", ref, reason, send_to: to }); say("Sent to the General Manager and CEO for approval"); $("acc_ask").disabled = true; $("acc_ask").textContent = "Waiting for GM / CEO approval"; });
  }
  if ($("acc_edit")) $("acc_edit").onclick = run(() => agentForm(id, true));
  box.scrollIntoView({ behavior: "smooth" });
}
async function agentForm(id, edit) {
  const d = id ? await gapi({ action: "agent_get", id }) : { agent: { agent_type: "agent", status: "active", comm_pct: "", extra: [] }, policies: [], lines: [] };
  const g = d.agent; let extra = Array.isArray(g.extra) ? g.extra.slice() : [];
  const box = id ? $("ag_view") : $("ag_form");
  if (id && $("ag_form")) $("ag_form").innerHTML = "";
  const v = (x) => esc(x === null || x === undefined ? "" : String(x));
  const dis = edit ? "" : " disabled";
  box.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><h2>${id ? v(g.code) + " · " + v(g.name) : "New agent / broker"}</h2><button class="btn ghost sm" id="ag_close">Close</button></div>
    <div class="grid"><label>Type<select id="ag_type"${dis}><option value="agent">Agent</option><option value="broker">Broker</option></select></label>
      <label>Name<input id="ag_name" value="${v(g.name)}"${dis}></label><label>Company<input id="ag_co" value="${v(g.company)}"${dis}></label>
      <label>Phone<input id="ag_ph" value="${v(g.phone)}"${dis}></label><label>Email<input id="ag_em" value="${v(g.email)}"${dis}></label>
      <label>Address<input id="ag_ad" value="${v(g.address)}"${dis}></label><label>Area / county<input id="ag_area" value="${v(g.area)}"${dis}></label>
      <label>Licence no. (CBL)<input id="ag_lic" value="${v(g.licence_no)}"${dis}></label><label>Licence expiry<input id="ag_exp" type="date" value="${v(String(g.licence_expiry || "").slice(0, 10))}"${dis}></label>
      <label>Commission %<input id="ag_pct" type="number" step="0.01" value="${v(g.comm_pct)}"${dis}></label>
      <label>Status<select id="ag_st"${dis}><option value="active">Active</option><option value="suspended">Suspended</option><option value="terminated">Terminated</option></select></label>
      <label style="grid-column:1/-1">Payment details (bank or mobile money)<input id="ag_pay" value="${v(g.payment_details)}"${dis}></label>
      <label style="grid-column:1/-1">Notes<textarea id="ag_notes" rows="2"${dis}>${v(g.notes)}</textarea></label></div>
    <div class="row" style="justify-content:space-between"><b>More details</b>${edit ? '<button class="btn ghost sm" id="ag_add">＋ Add detail</button>' : ""}</div><div id="ag_extra"></div>
    ${edit ? `<div class="row"><button class="btn" id="ag_save">Save</button>${id && g.status === "active" ? '<button class="btn ghost" id="ag_give">Give policies to this agent</button>' : ""}</div>` : ""}
    ${id ? `<h2 style="margin-top:16px">Policies (${d.policies.length})</h2><div class="tablewrap" id="ag_pt"></div><h2 style="margin-top:16px">Commission statement</h2><div class="tablewrap" id="ag_lt"></div>` : ""}</div>`;
  $("ag_type").value = g.agent_type || "agent"; $("ag_st").value = g.status || "active";
  const drawX = () => {
    $("ag_extra").innerHTML = extra.length ? extra.map((x, i) => `<div class="row" style="gap:8px;align-items:flex-end;margin-bottom:6px"><label style="flex:1">Detail<input data-axl="${i}" value="${v(x.label)}" placeholder="e.g. ID number"${dis}></label><label style="flex:2">Value<input data-axv="${i}" value="${v(x.value)}"${dis}></label>${edit ? `<button class="btn ghost sm" data-axd="${i}">✕</button>` : ""}</div>`).join("") : '<p class="note">No extra details yet.</p>';
    document.querySelectorAll("[data-axl]").forEach((e) => (e.oninput = () => (extra[+e.dataset.axl].label = e.value)));
    document.querySelectorAll("[data-axv]").forEach((e) => (e.oninput = () => (extra[+e.dataset.axv].value = e.value)));
    document.querySelectorAll("[data-axd]").forEach((b) => (b.onclick = () => { extra.splice(+b.dataset.axd, 1); drawX(); }));
  };
  drawX();
  $("ag_close").onclick = () => (box.innerHTML = "");
  if ($("ag_give")) $("ag_give").onclick = run(async () => { const { rows } = await gapi({ action: "agent_list" }); await policyPicker($("ag_view"), rows, id, () => VIEWS.u_agents(), "Give policies to " + g.code + " · " + g.name); });
  if (edit) {
    $("ag_add").onclick = () => { extra.push({ label: "", value: "" }); drawX(); };
    $("ag_save").onclick = run(async () => {
      const x = await gapi({ action: "agent_save", g: { id, agent_type: $("ag_type").value, name: $("ag_name").value, company: $("ag_co").value, phone: $("ag_ph").value, email: $("ag_em").value, address: $("ag_ad").value,
        area: $("ag_area").value, licence_no: $("ag_lic").value, licence_expiry: $("ag_exp").value, comm_pct: $("ag_pct").value, status: $("ag_st").value, payment_details: $("ag_pay").value, notes: $("ag_notes").value, extra } });
      say(`Saved · ${x.code}`); await VIEWS.u_agents(); await agentForm(x.id, true); });
  }
  if (id) {
    table("ag_pt", d.policies.map((p) => ({ ...p, comm_pct: undefined, rate: p.comm_pct + "%" })).map(({ comm_pct, ...r }) => r));
    table("ag_lt", d.lines);
  }
  box.scrollIntoView({ behavior: "smooth" });
}

