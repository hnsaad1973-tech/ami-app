// Platinum Operations Platform — start: sign the person in and open their own workspace.
async function start() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return showLogin();
    ME = (await api({ action: "me" })).me;
    try { RE_OK = !!(await reapi({ action: "access" })).view; } catch (_) { RE_OK = false; }
    if (["gm", "admin", "accountant"].includes(ME.role)) (async () => { try {
      const { data: { session: s2 } } = await sb.auth.getSession();
      const r = await fetch(SB_URL + "/functions/v1/platcheck", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s2.access_token, apikey: SB_KEY }, body: JSON.stringify({ last_only: true }) });
      const j = await r.json(); if (r.ok && j.last && !j.last.all_ok) say("⚠ Last night's books check found a problem: " + j.last.failed.join(", ") + ". Open Books check.", false);
    } catch (_) {} })();
    $("login").classList.add("hide"); document.body.classList.remove("out");
    $("who").innerHTML = `${esc(ME.name || ME.email)}<br>${esc(ME.title || ME.role)} · <a id="out">Sign out</a>`;
    $("out").onclick = async () => { await sb.auth.signOut(); location.reload(); };
    // Each person lands in their own workspace, by the role Platinum assigned to their email.
    const HOME = { sales: "sales", underwriter: "uw", accountant: "acct", gm: "gm", admin: "ceo", board: "board" };
    if (HOME[ME.role] && SECTIONS[HOME[ME.role]]?.roles.includes(ME.role)) openSection(HOME[ME.role]); else showChooser();
  } catch (e) { say(e.message, false); if (/not on the Platinum list/i.test(e.message)) await sb.auth.signOut(); showLogin(); }
}
start();
