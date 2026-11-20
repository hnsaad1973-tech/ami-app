// Platinum — edit the CBL quarterly / Africa Re reports (GM and CEO only). Saved per quarter; "Back to books figures" removes the edits.
let S;
async function call(body) {
  const r = await fetch(S.url + "/functions/v1/platbooks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.session.access_token, apikey: S.key }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "Server error" }));
  if (!r.ok || j.error) throw new Error(j.error || "Error " + r.status);
  return j;
}
export async function gate(url, key, session, out) {
  S = { url, key, session };
  try { await call({ action: "qr_get", kind: "cbl", quarter: "access-check" }); return true; }
  catch (_) { out.textContent = "Only the General Manager and the CEO can open this report."; return false; }
}
export async function init(kind, quarter, out) {
  const bar = document.querySelector(".bar"); const books = out.innerHTML;
  const btn = (t, fn, light) => { const x = document.createElement("button"); x.textContent = t; x.onclick = fn; if (light) x.style.background = "#fff"; bar.appendChild(x); return x; };
  const info = document.createElement("span"); info.style.cssText = "color:#fff;align-self:center;font-size:13px;margin-left:6px";
  let editing = false;
  const stop = () => { editing = false; out.contentEditable = "false"; out.style.outline = ""; ed.textContent = "Edit"; sv.style.display = "none"; };
  const show = (e) => {
    if (e) { out.innerHTML = e.html; info.textContent = "Edited by " + e.edited_by + " · " + new Date(e.edited_at).toLocaleString("en-GB"); reset.style.display = ""; }
    else { out.innerHTML = books; info.textContent = "Figures from the books"; reset.style.display = "none"; }
  };
  const ed = btn("Edit", () => { if (editing) { if (confirm("Stop editing without saving?")) { stop(); call({ action: "qr_get", kind, quarter }).then((x) => show(x.edit)); } return; }
    editing = true; out.contentEditable = "true"; out.style.outline = "3px dashed #D4A84B"; ed.textContent = "Cancel"; sv.style.display = ""; out.focus(); });
  const sv = btn("Save changes", async () => {
    try { stop(); await call({ action: "qr_save", kind, quarter, html: out.innerHTML }); const x = await call({ action: "qr_get", kind, quarter }); show(x.edit); alert("Saved"); }
    catch (err) { alert(err.message); }
  });
  sv.style.display = "none";
  const reset = btn("Back to books figures", async () => {
    if (!confirm("Remove the edits for " + quarter + " and show the figures from the books again?")) return;
    try { await call({ action: "qr_reset", kind, quarter }); show(null); } catch (err) { alert(err.message); }
  }, true);
  bar.appendChild(info);
  const x = await call({ action: "qr_get", kind, quarter }); show(x.edit);
}
