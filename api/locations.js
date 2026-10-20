module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const query = (req.query && req.query.query) || '';
  if (query.length < 2) return res.status(200).json([]);
  try {
    const url = 'https://api.bodygraphchart.com/v210502/locations?api_key=' +
      process.env.BODYGRAPH_API_KEY + '&query=' + encodeURIComponent(query);
    const r = await fetch(url);
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error('Locations error:', e.message);
    return res.status(200).json([]);
  }
};
