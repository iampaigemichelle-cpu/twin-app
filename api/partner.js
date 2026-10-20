const crypto = require('crypto');
const L = require('./_lib');

const HEADERS = ['HER VILLAIN WITH THEM', 'THEIR VILLAIN', 'THE COLLISION', 'THE TRAP', 'STEP INTO HER'];

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
      "\n\nTHIS IS THE PAID PARTNER READING. You have two full Eden loops: HERS (the reader) and THEIRS (her person). Speak to the reader in second person. Be direct, bold and a little provocative, with short punchy sentences and exact behaviors. Never shame either person. Both villains are protectors. This is about her understanding the dance and stepping into her own villain on purpose, not fixing, diagnosing or managing him. Describe him only as a person with his own protector, and how that lands on her.\n\n" +
      "HOW THE TWO LOOPS INTERACT (this is the core, get it exactly right):\n" +
      "- Within one person the order is: Personality Venus (IQ, mental defense) fires first, then Design Venus (EQ) is the visible emotional reaction that follows.\n" +
      "- Between two people: HER IQ defends against HIS EQ. When his visible emotional reaction lands, her mind shoots up and builds a story to protect her.\n" +
      "- And HIS IQ defends against HER EQ. When her visible emotional reaction lands, his mind builds a story to protect him.\n" +
      "- So the cycle is: her EQ lands on him, his IQ defends, his EQ lands on her, her IQ defends, and round it goes. Each of them is protecting their own Design Mars wound underneath, and each loses their Design Earth grounding while it runs.\n" +
      "- Also look at where his Design Mercury, Mars, Sun and Moon echo or collide with hers.\n\n" +
      "OUTPUT FORMAT, exactly, with each header on its own line:\n\n" +
      "HER VILLAIN WITH THEM\nStart with her villain's name for this relationship in bold (2 to 4 words). Then 2 short paragraphs: how her loop plays out with this exact person.\n\n" +
      "THEIR VILLAIN\nStart with his villain's name in bold (2 to 4 words). Then 1 short paragraph: his Eden loop in plain behavior, how his mask, his defense and his wound show up, and how it lands on her.\n\n" +
      "THE COLLISION\nTwo short paragraphs. First: her IQ vs his EQ, what she tells herself when he gets emotional and what that does. Second: his IQ vs her EQ, what he tells himself when she gets emotional and what that does. Then one sentence on the exact moment the loop starts.\n\n" +
      "THE TRAP\n1 short paragraph. The repeating cycle between them and what it costs both of them.\n\n" +
      "STEP INTO HER\nThe goal: she wants to step into her villain with this person. 3 steps, each on its own line starting with a bold label, then 1 to 2 sentences. **1. Catch her.** The exact tell with THIS person that her villain just walked in. **2. Say the real thing.** A real sentence in quotes she can say out loud to them, honest, no attack, no silence, no exit. **3. Run her on purpose.** One specific thing to do with her power this week in this relationship, a boundary, a no, a standard or a hard truth. Nothing manipulative, nothing passive aggressive. End with one dare line.\n\n" +
      "Hard rules: no gate numbers, no em dashes, no jargon, under 520 words total.";

    function fmt(label, p) {
      return label + " (Type: " + (p.type || '?') + ", Profile: " + (p.profile || '?') + ")\nDesign Mercury gate: " + p.designMercury +
        "\nPersonality Mercury gate: " + p.personalityMercury + "\nPersonality Venus gate: " + p.personalityVenus +
        "\nDesign Venus gate: " + p.designVenus + "\nDesign Mars gate: " + p.designMars + "\nDesign Earth gate: " + p.designEarth +
        "\nDesign Sun gate: " + p.designSun + "\nDesign Moon gate: " + p.designMoon;
    }
    const user = fmt("HER: " + (you.name || 'her'), a) + "\n\n" + fmt("THEIR PERSON: " + (them.name || 'them'), b) +
      "\n\nWrite the partner reading in the exact output format.";

    const raw = L.noDashes(await L.callClaude(system, user, 2000));
    if (!raw) return res.status(500).json({ error: 'Could not generate the reading. Try again.' });

    const s = L.parseSections(raw, HEADERS);
    const sections = [
      ['Her villain with them', s['HER VILLAIN WITH THEM']],
      ['Their villain', s['THEIR VILLAIN']],
      ['The collision', s['THE COLLISION']],
      ['The trap', s['THE TRAP']],
      ['Step into her', s['STEP INTO HER']]
    ].filter(function (x) { return x[1]; }).map(function (x) { return { title: x[0], body: x[1] }; });
    if (!sections.length) return res.status(500).json({ error: 'Could not generate the reading. Try again.' });
    return res.status(200).json({ sections: sections });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
