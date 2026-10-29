// One vault, live from Hyperliquid: stats, leader's own stake, follower count, equity and PnL history.
const { info, num, series } = require('./_hl');
module.exports = async (req, res) => {
  const a = String(req.query.a || '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(a)) return res.status(400).json({ error: 'Not a vault address.' });
  try {
    const v = await info({ type: 'vaultDetails', vaultAddress: a });
    if (!v || !v.vaultAddress) return res.status(404).json({ error: 'No vault at that address.' });
    const port = {};
    for (const [k, p] of v.portfolio || []) {
      if (!['week', 'month', 'allTime'].includes(k) || !p) continue;
      const av = p.accountValueHistory || [], pn = p.pnlHistory || [];
      const pick = (arr) => { const n = 120; if (arr.length <= n) return arr; const o = []; for (let i = 0; i < n; i++) o.push(arr[Math.round(i * (arr.length - 1) / (n - 1))]); return o; };
      port[k] = { av: pick(av).map((x) => [num(x[0]), num(x[1])]), pnl: pick(pn).map((x) => [num(x[0]), num(x[1])]) };
    }
    const followers = Array.isArray(v.followers) ? v.followers.length : 0;
    const eq = (v.followers || []).reduce((t, f) => t + num(f.vaultEquity), 0);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.json({
      a: v.vaultAddress, n: v.name, l: v.leader, desc: String(v.description || '').slice(0, 600),
      apr: num(v.apr) * 100, leaderFraction: num(v.leaderFraction) * 100, followers, eq,
      closed: !!v.isClosed, deposits: v.allowDeposits !== false, rel: v.relationship && v.relationship.type, port,
    });
  } catch (e) {
    res.status(502).json({ error: 'Hyperliquid is not answering right now.' });
  }
};
