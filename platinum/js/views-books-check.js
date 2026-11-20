// Platinum Operations Platform — books check screens. Loaded as a plain script after js/core.js; adds its screens to VIEWS.
Object.assign(VIEWS, {
  // ===== Books check (v5.6) =====
  async a_check() {
    const { data: { session } } = await sb.auth.getSession();
    const run1 = async (d) => {
      const r = await fetch(SB_URL + "/functions/v1/platcheck", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SB_KEY }, body: JSON.stringify({ date: d }) });
      const j = await r.json().catch(() => ({ error: "Server error" })); if (!r.ok || j.error) throw new Error(j.error || "Error"); return j; };
    const d = await run1(BC_DATE || today());
    const bad = d.checks.filter((c) => !c.ok).length;
    const L = d.last; const lastLine = L ? `<p class="note">Automatic check every night at 01:17 — last run ${new Date(L.ran_at).toLocaleString("en-GB")}: <b style="color:${L.all_ok ? "inherit" : "var(--red)"}">${L.all_ok ? "✓ all agree" : "⚠ " + L.failed.join(", ")}</b></p>` : "";
    V().innerHTML = kpis([["Checks passed", (d.checks.length - bad) + " of " + d.checks.length, bad > 0], ["As at", String(d.as_at)]]) +
      `<div class="card"><div class="row" style="justify-content:space-between"><div><h2>${bad ? "⚠ " + bad + " check" + (bad > 1 ? "s" : "") + " need attention" : "✓ The books agree"}</h2><p class="note">Run this before closing each month. Each line compares the account in the books with the detail behind it.</p>${lastLine}</div>
        <label>As at<input type="date" id="bc_d" value="${esc(String(d.as_at))}"></label></div>
        <div class="tablewrap"><table><thead><tr><th></th><th>Check</th><th>Result</th></tr></thead><tbody>${d.checks.map((c) => `<tr><td style="font-size:18px">${c.pending ? "⏳" : c.ok ? "✓" : "⚠"}</td><td><b>${esc(c.check)}</b></td><td class="wrap" style="color:${c.ok ? "inherit" : "var(--red)"}">${esc(c.note || "")}</td></tr>`).join("")}</tbody></table></div></div>`;
    $("bc_d").onchange = run(async () => { BC_DATE = $("bc_d").value; await VIEWS.a_check(); });
  },
});
