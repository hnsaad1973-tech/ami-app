// Platinum Operations Platform — share screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== Share approvals (v5.2) =====
  async g_share() {
    const { rows } = await sapi({ action: "list" }); LAST = rows;
    const pend = rows.filter((r) => r.status === "pending");
    V().innerHTML = kpis([["Waiting for approval", pend.length, pend.length > 0], ["Approved (48 h)", rows.filter((r) => r.status === "approved" && new Date(r.expires_at) > new Date()).length]]) +
      `<div class="card"><h2>Requests to share policies and statements</h2><p class="note">Staff cannot print, save, copy, email or share a policy or a statement of account without your approval. An approval lasts 48 hours, for that person and that document only.</p><div class="tablewrap" id="t"></div></div>`;
    table("t", rows, { hide: ["id"], extra: (r) => r.status === "pending" ? `<button class="btn sm" data-sh="${r.id}" data-d="approve">Approve</button> <button class="btn ghost sm" data-sh="${r.id}" data-d="decline">Decline</button>` : "" });
    document.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = run(async () => {
      const note = b.dataset.d === "decline" ? prompt("Reason for declining (optional)") ?? null : ""; if (note === null) return;
      await sapi({ action: "decide", id: +b.dataset.sh, decision: b.dataset.d, note }); say(b.dataset.d === "approve" ? "Approved for 48 hours" : "Declined"); VIEWS.g_share(); })));
  },
});
