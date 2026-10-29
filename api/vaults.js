// The board: open Hyperliquid vaults (no sub-vaults), biggest first, with 30-day sparklines. Cached 60 s.
const { vaults } = require('./_hl');
module.exports = async (req, res) => {
  try {
    const list = await vaults();
    const top = list.filter((v) => v.tvl >= 1000).slice(0, 400);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json({ at: Date.now(), total: list.length, tvl: list.reduce((t, v) => t + v.tvl, 0), vaults: top });
  } catch (e) {
    res.status(502).json({ error: 'Hyperliquid is not answering right now.' });
  }
};
