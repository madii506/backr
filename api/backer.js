// Any Hyperliquid address as a backer: every vault it holds a stake in, with names and equity.
const { info, num, vaults } = require('./_hl');
module.exports = async (req, res) => {
  const addr = String(req.query.addr || '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(addr)) return res.status(400).json({ error: 'That is not a Hyperliquid address (0x + 40 characters).' });
  try {
    const [eqs, list] = await Promise.all([info({ type: 'userVaultEquities', user: addr }), vaults().catch(() => [])]);
    const byA = new Map(list.map((v) => [v.a.toLowerCase(), v]));
    const rows = (eqs || []).map((e) => {
      const v = byA.get(String(e.vaultAddress).toLowerCase());
      return { a: e.vaultAddress, eq: num(e.equity), lock: num(e.lockedUntilTimestamp), n: v ? v.n : '', tvl: v ? v.tvl : 0, apr: v ? v.apr : 0, d30: v ? v.d30 : 0 };
    }).filter((r) => r.eq > 0).sort((x, y) => y.eq - x.eq);
    const miss = rows.filter((r) => !r.n).slice(0, 5);
    await Promise.all(miss.map((r) => info({ type: 'vaultDetails', vaultAddress: r.a }).then((d) => { r.n = d && d.name ? d.name : 'Vault'; }).catch(() => { r.n = 'Vault'; })));
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    res.json({ addr, total: rows.reduce((t, r) => t + r.eq, 0), rows });
  } catch (e) {
    res.status(502).json({ error: 'Hyperliquid is not answering right now.' });
  }
};
