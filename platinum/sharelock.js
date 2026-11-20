// Platinum — a policy or statement of account cannot be printed, saved as PDF, copied or shared without GM or CEO approval.
let S;
async function call(body) {
  const r = await fetch(S.url + "/functions/v1/platshare", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.session.access_token, apikey: S.key }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
export async function lockPage({ url, key, session, kind, ref }) {
  S = { url, key, session };
  const bar = document.querySelector(".bar");
  let c; try { c = await call({ action: "check", kind, ref }); } catch (_) { c = { allowed: false }; }
  const note = document.createElement("span"); note.style.cssText = "color:#fff;align-self:center;font-size:13px;margin-left:6px";
  if (c.allowed) { if (!c.boss) { note.textContent = "Approved to share until " + new Date(c.until).toLocaleString("en-GB"); bar.appendChild(note); } return true; }
  const st = document.createElement("style");
  st.textContent = `body.locked{-webkit-user-select:none;user-select:none}
    body.locked::after{content:"NOT APPROVED FOR SHARING";position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font:700 48px Inter,Arial;color:rgba(179,38,30,.13);transform:rotate(-24deg);pointer-events:none;z-index:50}
    @media print{body.locked *{display:none!important}body.locked::before{content:"Not approved for sharing — ask the General Manager or CEO.";display:block!important;font:16px Arial;padding:40px}}`;
  document.head.appendChild(st); document.body.classList.add("locked");
  ["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault()));
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "a"].includes(e.key.toLowerCase())) { e.preventDefault(); alert("This document needs GM or CEO approval before it can be printed, saved or shared."); } });
  window.print = () => alert("This document needs GM or CEO approval before it can be printed, saved or shared.");
  bar.querySelectorAll("button").forEach((b) => { if (/print|pdf/i.test(b.textContent)) b.style.display = "none"; });
  const ask = document.createElement("button");
  const setAsk = (pending) => { ask.textContent = pending ? "Waiting for GM / CEO approval" : "Ask GM / CEO to approve sharing"; ask.disabled = !!pending; };
  setAsk(c.pending);
  ask.onclick = async () => {
    const reason = prompt("Why must it be shared?"); if (!reason) return;
    const to = prompt("Who will receive it? (name / email / phone)") || "";
    try { await call({ action: "request", kind, ref, reason, send_to: to }); setAsk(true); alert("Sent to the General Manager and CEO for approval."); } catch (e) { alert(e.message); }
  };
  bar.insertBefore(ask, bar.firstChild);
  return false;
}
