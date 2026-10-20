const crypto = require('crypto');
const L = require('./_lib');

const HEADERS = ['HOW SHE SHOWS UP WITH THEM', 'THE SPARK', 'THE TRAP', 'YOUR MOVE'];

function codeOk(input) {
  const real = process.env.ACCESS_CODE;
  if (!real || !input) return false;
  const a = crypto.createHash('sha256').update(String(input).trim().toLowerCase()).digest();
  const b = crypto.createHash('sha256').update(String(real).trim().toLowerCase()).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const { code, verify, you, them } = req.body || {};

  if (!codeOk(code)) return res.status(401).json({ error: 'That code did not work. Check your confirmation email.' });
  if (verify) return res.status(200).json({ ok: true });

  if (!you || !you.birthdate || !you.birthtime || !you.cityTz) return res.status(400).json({ error: 'Your birth data is required' });
  if (!them || !them.birthdate || !them.birthtime || !them.cityTz) return res.status(400).json({ error: 'Their birth data is required' });

  try {
    const [a, b] = await Promise.all([
      L.getChart(you.birthdate, you.birthtime, you.cityTz),
      L.getChart(them.birthdate, them.birthtime, them.cityTz)
    ]);
    if (!a || !b) return res.status(500).json({ error: 'Could not calculate one of the charts. Check the birth details.' });

    const system = [L.VOICE, L.PERSONA, L.EDEN, L.SAFETY].join('\n\n') +
      "\n\nTHIS IS THE PAID PARTNER READING. You have her chart and her person's chart. Show how HER villain specifically behaves with THIS person, and what THEIR design pokes, soothes, or sets off in her. Compare where their placements echo hers (instant recognition, or a mirror she hates) and where they collide. Stay on her. This is about her owning her twin, not diagnosing or fixing him. Describe him only through how he lands on her. Output format, exactly:\n\n" +
      "HOW SHE SHOWS UP WITH THEM\n2 short paragraphs. The villain in motion with this exact person.\n\n" +
      "THE SPARK\n1 short paragraph. What about them wakes her up or makes her feel safe enough to be her.\n\n" +
      "THE TRAP\n1 short paragraph. The specific loop that runs between them, and the moment it usually starts.\n\n" +
      "YOUR MOVE\n3 short lines she could actually do or say this week, using her power on purpose and with honesty. Nothing manipulative, nothing passive aggressive.\n\n" +
      "Hard rules: no gate numbers, no em dashes, no jargon, under 380 words total.";

    function fmt(label, p) {
      return label + " (Type: " + (p.type || '?') + ", Profile: " + (p.profile || '?') + ")\nDesign Mercury gate: " + p.designMercury +
        "\nPersonality Mercury gate: " + p.personalityMercury + "\nPersonality Venus gate: " + p.personalityVenus +
        "\nDesign Venus gate: " + p.designVenus + "\nDesign Mars gate: " + p.designMars + "\nDesign Earth gate: " + p.designEarth +
        "\nDesign Sun gate: " + p.designSun + "\nDesign Moon gate: " + p.designMoon;
    }
    const user = fmt("HER: " + (you.name || 'her'), a) + "\n\n" + fmt("THEIR PERSON: " + (them.name || 'them'), b) +
      "\n\nWrite the partner reading in the exact output format.";

    const raw = L.noDashes(await L.callClaude(system, user, 1500));
    if (!raw) return res.status(500).json({ error: 'Could not generate the reading. Try again.' });

    const s = L.parseSections(raw, HEADERS);
    return res.status(200).json({
      shows: s['HOW SHE SHOWS UP WITH THEM'] || '',
      spark: s['THE SPARK'] || '',
      trap: s['THE TRAP'] || '',
      move: s['YOUR MOVE'] || ''
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
