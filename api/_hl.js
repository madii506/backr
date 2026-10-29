// Shared Hyperliquid helpers (files starting with _ are not routes on Vercel).
const HL = 'https://api.hyperliquid.xyz/info';
async function info(body) {
  const r = await fetch(HL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('hl ' + r.status);
  return r.json();
}
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const lastOf = (a) => (Array.isArray(a) && a.length ? num(Array.isArray(a[a.length - 1]) ? a[a.length - 1][1] : a[a.length - 1]) : 0);
const series = (a, n) => {
  if (!Array.isArray(a) || !a.length) return [];
  const v = a.map((x) => num(Array.isArray(x) ? x[1] : x));
  if (v.length <= n) return v;
  const out = []; for (let i = 0; i < n; i++) out.push(v[Math.round(i * (v.length - 1) / (n - 1))]);
  return out;
};
const period = (pnls, key) => { const p = (pnls || []).find((x) => x && x[0] === key); return p ? p[1] : []; };
// every open vault with its month/all-time PnL; cached per instance for 60 s
let cache = null, at = 0;
async function vaults() {
  if (cache && Date.now() - at < 60000) return cache;
  let raw;
  try {
    const r = await fetch('https://stats-data.hyperliquid.xyz/Mainnet/vaults');
    if (!r.ok) throw new Error('stats ' + r.status);
    raw = await r.json();
  } catch (e) {
    raw = await info({ type: 'vaultSummaries' });
  }
  const list = [];
  for (const v of raw || []) {
    const s = v.summary || v;
    if (!s || !s.vaultAddress || s.isClosed) continue;
    const rel = s.relationship && s.relationship.type;
    if (rel === 'child') continue;
    const month = period(v.pnls, 'month'), all = period(v.pnls, 'allTime');
    list.push({
      a: s.vaultAddress, n: String(s.name || '').trim().slice(0, 60) || 'Unnamed vault', l: s.leader || '',
      tvl: num(s.tvl), apr: num(v.apr) * 100, d30: lastOf(month), all: lastOf(all),
      t0: num(s.createTimeMillis), sp: series(month, 32),
    });
  }
  list.sort((x, y) => y.tvl - x.tvl);
  cache = list; at = Date.now();
  return list;
}
module.exports = { info, num, series, vaults };
