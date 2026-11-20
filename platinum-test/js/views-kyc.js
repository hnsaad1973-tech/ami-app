// Platinum Operations Platform — kyc screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== KYC (v3.5) =====
  async s_kyc() {
    const rows = (await kapi({ action: "kyc_list" })).rows; LAST = rows;
    const mgr = ["underwriter", "gm", "admin"].includes(ME.role);
    const n = (st) => rows.filter((r) => r.kyc_status === st).length;
    V().innerHTML = kpis([["Waiting for check", n("submitted"), n("submitted") > 0 && mgr], ["Verified", n("verified")], ["Draft", n("draft")], ["Rejected", n("rejected"), n("rejected") > 0], ["No KYC yet", n("none"), n("none") > 0]]) +
      `<div class="card"><h2>${mgr ? "Client KYC — all clients" : "KYC for my clients"}</h2><p class="note">${mgr ? "Open a client to check documents. You cannot verify a file you submitted yourself. Tick the sanctions check before verifying." : "Open a client, fill in the identity details, upload the ID and other documents, then send to Underwriting. After that the file is read-only unless Underwriting sends it back."}</p>
      <div class="row"><input id="kq" placeholder="Search client…" style="max-width:260px"></div><div class="tablewrap" id="t"></div></div><div id="kf"></div>`;
    const draw = () => { const q = $("kq").value.toLowerCase(); table("t", rows.filter((r) => !q || String(r.client).toLowerCase().includes(q)), { hide: ["party_id", "added_by"], extra: (r) => `<button class="btn sm ${r.kyc_status === "submitted" && mgr ? "" : "ghost"}" data-kp="${r.party_id}">${r.kyc_status === "none" ? "Start KYC" : r.missing ? "Add missing (" + r.missing + ")" : "Open / edit"}</button>` });
      document.querySelectorAll("[data-kp]").forEach((b) => (b.onclick = run(() => kycForm(+b.dataset.kp)))); };
    $("kq").oninput = draw; draw();
  },
  async b_kyc() {
    LAST = (await kapi({ action: "kyc_summary" })).rows;
    V().innerHTML = `<div class="card"><h2>KYC summary</h2><p class="note">Clients by KYC status and risk. Names and documents stay with Underwriting.</p><div class="tablewrap" id="t"></div></div>`; table("t", LAST);
  },
  async s_guide() {
    const r = await list("rules");
    V().innerHTML = `<div class="card"><h2>Product guide</h2><p class="note">What each product covers: limits, deductibles, documents and when it must be referred.</p><div class="tablewrap" id="t"></div></div>`;
    table("t", r.map((x) => ({ product: x.name, status: x.status, rating: x.rating_basis, min_premium: x.min_premium, limits: x.limits, deductible: x.deductible, documents: x.documents, referral_triggers: x.referral_triggers })));
  },

});
