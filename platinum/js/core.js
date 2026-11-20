// Platinum Operations Platform — core: settings, helpers, server calls, tables, sections, sign-in. Loaded first.
const SB_URL = "https://xxdqrvcpxhsepwzfmnjs.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZHFydmNweGhzZXB3emZtbmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MTQxNzQsImV4cCI6MjExMDE5MDE3NH0.ZjN4PXCs7IilwaO16o6kg1Bu1K66V_vfoUILHMjgGBU";
const sb = window.supabase.createClient(SB_URL, SB_KEY);
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const V = () => $("view");
let ME = null, LAST = [], TARIFF = [], CLASSES = [], ENDORSE_FOR = null;

// ---------- helpers ----------
function say(t, ok = true) { const m = $("msg"); m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); window.scrollTo({ top: 0, behavior: "smooth" }); if (ok) setTimeout(() => (m.className = "msg"), 7000); }
const money = (v) => v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (v) => (v === null || v === undefined ? "" : String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
const isNum = (k, v) => v !== null && v !== "" && typeof v !== "boolean" && !isNaN(v) && !/(_no|code|phone|period|quarter|yr|^id$|last4|certificate|sev|items|policies|year|months)$/i.test(k) && !/date|_at$|due/i.test(k);
const label = (k) => k.replace(/_/g, " ").replace(/\bpct\b/, "%").replace(/^./, (c) => c.toUpperCase());
const LONG = /limits|deductible|eligibility|documents|exclusions|conditions|triggers|basis|reason|description|notes|item$|detail|who|rating/;

async function api(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/plat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
const list = async (name) => (await api({ action: "list", name })).rows;
async function reapi(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/platre", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
let RE_OK = false, RE_SEL = null, BC_DATE = "";
const secOK = (k, s) => s.roles.includes(ME.role) && (k !== "re" || RE_OK);
async function sapi(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/platshare", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
async function bapi(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/platbooks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
async function kapi(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/platkyc", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
async function gapi(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); throw new Error("Please sign in"); }
  const r = await fetch(SB_URL + "/functions/v1/platagent", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { say(e.message, false); } };

function table(box, rows, opts = {}) {
  box = typeof box === "string" ? $(box) : box;
  if (!rows || !rows.length) { box.innerHTML = '<p class="note" style="padding:12px">Nothing here yet.</p>'; return; }
  const cols = Object.keys(rows[0]).filter((c) => !(opts.hide || []).includes(c));
  let h = "<table><thead><tr>" + cols.map((c) => `<th>${label(c)}</th>`).join("") + (opts.extra ? "<th></th>" : "") + "</tr></thead><tbody>";
  for (const r of rows) {
    h += "<tr>" + cols.map((c) => {
      const v = r[c];
      if (c === "status" && (v === "proposed" || v === "approved")) return `<td><span class="pill ${v === "approved" ? "a" : "p"}">${v === "approved" ? "Approved" : "Proposed — for sign-off"}</span></td>`;
      if (/_pct$/.test(c) && v !== null && v !== "") return `<td class="n">${(Number(v) * 100).toFixed(1)}%</td>`;
      if (isNum(c, v)) return `<td class="n">${money(v)}</td>`;
      if (typeof v === "boolean") return `<td>${v ? "Yes" : "No"}</td>`;
      if (v && typeof v === "object") return `<td class="wrap">${esc(JSON.stringify(v)).slice(0, 200)}</td>`;
      const s = v === null || v === undefined ? "" : String(v);
      return `<td${LONG.test(c) ? ' class="wrap"' : ""}>${esc(/date|_at$|due/.test(c) ? s.slice(0, 10) : s)}</td>`;
    }).join("") + (opts.extra ? `<td>${opts.extra(r)}</td>` : "") + "</tr>";
  }
  box.innerHTML = (opts.nosearch || rows.length < 2 ? "" : `<div class="tsearch"><input type="search" placeholder="🔍 Search this list…" data-ts></div>`) + h + "</tbody></table>";
  const inp = box.querySelector("[data-ts]");
  if (inp) {
    const key = box.id || ""; const go = () => { const q = inp.value.trim().toLowerCase(); TSQ[key] = inp.value; let n = 0;
      box.querySelectorAll("tbody tr").forEach((tr) => { const ok = !q || q.split(/\s+/).every((w) => tr.textContent.toLowerCase().includes(w)); tr.style.display = ok ? "" : "none"; if (ok) n++; });
      inp.title = n + " shown"; };
    inp.oninput = go; if (TSQ[key]) { inp.value = TSQ[key]; go(); }
  }
}
const TSQ = {};
const kpis = (arr) => `<div class="kpis">${arr.map(([l, v, red]) => `<div class="kpi${red ? " red" : ""}"><div class="l">${l}</div><div class="v">${v}</div></div>`).join("")}</div>`;
const STAGE = { submitted: "With Underwriting", referred: "Awaiting facultative", returned: "Returned to Sales", uw_approved: "With GM (final approval)", board: "With Board", approved: "Approved", declined: "Declined" };
const stage = (r) => r.lapsed_at ? "Lapsed — not paid in time" : r.uw_status === "approved" ? (r.status === "active" ? "Paid · in force" : (r.issued_to_client_at ? "Issued · " : "Approved · issue now · ") + (r.pay_by ? "pay by " + String(r.pay_by).slice(0, 10) : "waiting for payment")) : STAGE[r.uw_status] || r.uw_status;
function expoBox(ex) {
  if (!ex) return "";
  return `<div class="quote"><b>Africa Re and Platinum exposure</b><br>${esc(ex.section)}${ex.bound ? "" : " (offer terms, not yet bound)"}<br>
    Sum insured USD ${money(ex.sum_insured)} · treaty capacity ${ex.capacity ? "USD " + money(ex.capacity) : "none"}<br>
    Africa Re takes <b>USD ${money(ex.africa_re_takes)}</b> (${(Number(ex.ceded_pct || 0) * 100).toFixed(1)}%) · <b style="color:var(--gold)">Platinum keeps USD ${money(ex.platinum_keeps)}</b>
    ${Number(ex.above_capacity) > 0 ? `<br><b style="color:var(--red)">USD ${money(ex.above_capacity)} above capacity — facultative must be placed and confirmed in writing first</b>` : ""}
    ${ex.fac_needed && !(Number(ex.above_capacity) > 0) ? `<br><b style="color:var(--red)">Facultative reinsurance required before approval</b>` : ""}
    ${ex.xl ? `<br>${esc(ex.xl)}` : ""}</div>`;
}
const printBtn = (no) => `<a class="btn ghost sm" style="display:inline-flex;align-items:center;text-decoration:none" href="print.html?no=${encodeURIComponent(no)}" target="_blank">Print</a>`;
const csvBtn = (name) => `<button class="btn ghost sm" data-csv="${name}">Download</button>`;
function bindCsv() {
  document.querySelectorAll("[data-csv]").forEach((b) => (b.onclick = () => {
    if (!LAST.length) return; const cols = Object.keys(LAST[0]);
    const csv = [cols.join(",")].concat(LAST.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `platinum-${b.dataset.csv}-${today()}.csv`; a.click();
  }));
}

// ---------- sections by position ----------
const TAB_ROLES = { ag_alloc: ["underwriter", "gm", "admin"], ag_pol: ["underwriter", "gm", "admin", "accountant"], a_comm: ["accountant", "gm", "admin"] };
const SECTIONS = {
  sales: { name: "Sales", desc: "Enter policy requests for underwriting, issue approved policies to clients, follow up payment, renewals.", roles: ["sales", "underwriter", "gm", "admin"],
    tabs: { s_new: "New policy request", s_mine: "My policies", s_clients: "Client contact info", s_kyc: "KYC", s_guide: "Product guide" } },
  uw: { name: "Underwriting", desc: "Approve referred risks, check documents, product rules, claims and treaty.", roles: ["underwriter", "gm", "admin"],
    tabs: { u_queue: "Review queue", u_files: "Client files", u_certs: "Stickers & Brown Cards", s_kyc: "KYC checks", u_all: "All policies", u_endorse: "Client clauses", u_word: "Standard wordings", u_rules: "Product rules", u_lib: "Policy library", u_claims: "Claims", u_treaty: "Africa Re" } },
  acct: { name: "Accounting", desc: "Receipts, debtors, creditors, purchases, petty cash, payroll, month end, reports and compliance.", roles: ["accountant", "gm", "admin"],
    tabs: { a_receipts: "Receipts", a_claims: "Claim payments", a_check: "Books check", a_debtors: "Debtors", a_cred: "Creditors", a_purch: "Purchases", a_petty: "Petty cash", a_payroll: "Payroll", a_reports: "Reports", a_close: "Month end", a_comp: "Compliance" } },
  gm: { name: "General Manager", desc: "Company overview, alerts, final approval of every policy, CBL and Africa Re quarterly reports, compliance, board report.", roles: ["gm", "admin"],
    tabs: { g_over: "Overview", a_check: "Books check", g_alerts: "Alerts", g_appr: "Final approvals", g_claims: "Claim approvals", s_clients: "All client contacts", s_kyc: "KYC", u_files: "Client files", u_certs: "Stickers & Brown Cards", g_cbl: "CBL quarterly", g_are: "Africa Re quarterly", a_comp: "Compliance", b_report: "Board report", g_share: "Share approvals" } },
  ceo: { name: "CEO", desc: "Full access: overview, team and access, sign-off of product rules, audit trail.", roles: ["admin"],
    tabs: { g_over: "Overview", a_check: "Books check", s_clients: "All client contacts", s_kyc: "KYC", u_files: "Client files", u_certs: "Stickers & Brown Cards", g_cbl: "CBL quarterly", g_are: "Africa Re quarterly", c_team: "Team & access", c_rules: "Sign off rules", c_word: "Sign off wordings", c_audit: "Audit trail", g_alerts: "Alerts", g_share: "Share approvals" } },
  agents: { name: "Agents & Brokers", desc: "One place for agents and brokers: register, give policies to them, their accounts, and commission payments.", roles: ["underwriter", "gm", "admin", "accountant", "board"],
    tabs: { ag_list: "Agents & brokers", ag_alloc: "Give policies", ag_pol: "Agents' policies", a_comm: "Commission payments" } },
  re: { name: "Reinsurers", desc: "Africa Re and other reinsurers: what we owe them, what they owe us on claims, policies ceded, payments. Held by the GM and CEO.", roles: ["gm", "admin", "accountant"],
    tabs: { re_acc: "Reinsurer accounts" } },
  board: { name: "Board", desc: "Monthly board report and risks above management limits for approval.", roles: ["board", "admin"],
    tabs: { b_report: "Monthly report", b_approvals: "Above-limit approvals", b_kyc: "KYC summary", u_files: "Client files", c_audit: "Audit trail", a_comp: "Compliance" } },
};

function showLogin() { document.body.classList.add("out"); try { const e = localStorage.getItem("plat_email"); if (e && !$("em").value) $("em").value = e; } catch (_) {} $("login").classList.remove("hide"); $("chooser").classList.add("hide"); $("tabs").classList.add("hide"); V().innerHTML = ""; }
function showChooser() {
  V().innerHTML = ""; $("tabs").classList.add("hide"); $("where").textContent = "Insurers, Inc."; $("homeBtn").classList.add("hide");
  const mine = Object.entries(SECTIONS).filter(([k, s]) => secOK(k, s));
  if (mine.length === 1) return openSection(mine[0][0]);
  $("secs").innerHTML = mine.map(([k, s]) => `<button class="sec" data-sec="${k}"><b>${s.name}</b><span>${s.desc}</span></button>`).join("");
  document.querySelectorAll("[data-sec]").forEach((b) => (b.onclick = () => openSection(b.dataset.sec)));
  $("chooser").classList.remove("hide");
}
let CUR_SEC = "";
function openSection(k) {
  const s = SECTIONS[k]; CUR_SEC = k;
  $("chooser").classList.add("hide"); $("where").textContent = s.name;
  if (Object.entries(SECTIONS).filter(([k, x]) => secOK(k, x)).length > 1) $("homeBtn").classList.remove("hide");
  const tabs = Object.fromEntries(Object.entries(s.tabs).filter(([id]) => !TAB_ROLES[id] || TAB_ROLES[id].includes(ME.role)));
  $("tabs").innerHTML = Object.entries(tabs).map(([id, n], i) => `<button class="tab" data-t="${id}" aria-pressed="${i === 0}">${n}</button>`).join("");
  $("tabs").classList.remove("hide");
  document.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => openTab(b.dataset.t)));
  openTab(Object.keys(tabs)[0]);
}
let CUR_TAB = "", PRESEL_AG = "";
function openTab(id) {
  CUR_TAB = id;
  document.querySelectorAll("[data-t]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === id));
  V().innerHTML = '<p class="note">Loading…</p>';
  run(VIEWS[id])();
}
$("home").onclick = () => ME && showChooser();
$("homeBtn").onclick = () => ME && showChooser();

// ---------- sign in ----------
let SENDING = false, COOL = null;
const cooldown = (secs) => {
  clearInterval(COOL); const b = $("si_resend"); let n = secs; b.disabled = true;
  const tick = () => { if (n <= 0) { clearInterval(COOL); b.disabled = false; b.textContent = "Send a new code"; return; } b.textContent = `Send a new code (${n}s)`; n--; };
  tick(); COOL = setInterval(tick, 1000);
};
const sendCode = async () => {
  if (SENDING) return; // one request at a time — a second email would cancel the first code
  const email = $("em").value.trim().toLowerCase(); if (!email) return;
  SENDING = true; $("sendcode").disabled = true; $("sendcode").textContent = "Sending…";
  try {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) {
      const w = (error.message.match(/after (\d+) seconds/) || [])[1];
      if (w) { $("si_to").textContent = email; $("si1").classList.add("hide"); $("codebox").classList.remove("hide"); cooldown(+w); throw new Error(`A code was just sent — use the code in your newest email. You can ask for a new one in ${w} seconds.`); }
      throw new Error(/signup|not allowed|not found/i.test(error.message) ? "This email is not set up. Ask management for access." : error.message);
    }
    try { localStorage.setItem("plat_email", email); } catch (_) {}
    $("si_to").textContent = email; $("si1").classList.add("hide"); $("codebox").classList.remove("hide"); $("code").value = ""; $("code").focus();
    say("Code sent — check your email (and Spam)"); cooldown(60);
  } finally { SENDING = false; $("sendcode").disabled = false; $("sendcode").textContent = "Send sign-in code"; }
};
$("sendcode").onclick = run(sendCode);
$("si_resend").onclick = run(async () => { $("code").value = ""; await sendCode(); });
$("si_back").onclick = () => { $("codebox").classList.add("hide"); $("si1").classList.remove("hide"); $("em").focus(); };
$("em").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("sendcode").click(); } });
$("code").addEventListener("input", () => { const v = $("code").value.replace(/\D/g, ""); if (v !== $("code").value) $("code").value = v; });
$("code").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("verify").click(); } });
let VERIFYING = false;
$("verify").onclick = run(async () => {
  if (VERIFYING) return;
  const token = $("code").value.replace(/\D/g, "");
  if (token.length < 6) throw new Error("Enter the full code from the email");
  VERIFYING = true; $("verify").disabled = true;
  try {
    const { error } = await sb.auth.verifyOtp({ email: $("em").value.trim().toLowerCase(), token, type: "email" });
    if (error) throw new Error(/expired|invalid/i.test(error.message) ? "That code is old or mistyped. Use the code in your NEWEST email, or tap “Send a new code”." : error.message);
    clearInterval(COOL); start();
  } finally { VERIFYING = false; $("verify").disabled = false; }
});

function tariffSelect(attr = "") {
  return `<select ${attr}><option value="">Tariff category…</option>${TARIFF.map((t) => `<option value="${t.id}">${esc(t.category)} — ${esc(t.sub_category)} · ${t.months} months · ${money(t.premium)}</option>`).join("")}</select>`;
}

const VIEWS = {};
