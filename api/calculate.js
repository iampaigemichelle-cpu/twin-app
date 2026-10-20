const L = require('./_lib');

const HEADERS = ['HER NAME', 'THE LOOP', 'OWN HER', 'SHAREABLES:'];

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const { name, birthdate, birthtime, cityTz } = req.body || {};
  if (!birthdate || !birthtime || !cityTz) return res.status(400).json({ error: 'Birth data required' });

  try {
    const p = await L.getChart(birthdate, birthtime, cityTz);
    if (!p) return res.status(500).json({ error: 'Could not calculate your chart. Check your birth details.' });

    const system = [L.VOICE, L.PERSONA, L.EDEN, L.SAFETY].join('\n\n') +
      "\n\nTHIS IS THE FREE READING. Find the ONE strongest pattern in her chart and name it as a loop she runs in relationships. Make it specific enough that she feels caught. Output format, exactly:\n\n" +
      "HER NAME\nA 2 to 4 word name for her villain, in bold, like **The Quiet Executioner** or **The Ice Queen of Almost**. Then one short sentence on how the people in her life would describe her on a bad day.\n\n" +
      "THE LOOP\nExactly 2 short paragraphs. First: how the loop runs in a relationship, from the good girl mask, to what the other person sees, to what she is really protecting. Second: what it costs her, and what the guilt and shame have been doing to her power. The final sentence is quiet and warm.\n\n" +
      "OWN HER\n2 or 3 sentences. What changes when she stops apologizing for her and starts using her on purpose. Persephone energy. End with a line that dares her to lean in.\n\n" +
      "SHAREABLES:\n- three short lines she could post or text a friend about her villain, funny and true, no hashtags\n\n" +
      "Hard rules: no gate numbers, no em dashes, no jargon, under 260 words before SHAREABLES.";

    const user = "Name: " + (name || 'her') + "\nType: " + (p.type || 'unknown') + "\nProfile: " + (p.profile || 'unknown') +
      "\nPlacements:\nDesign Mercury gate: " + p.designMercury + "\nPersonality Mercury gate: " + p.personalityMercury +
      "\nPersonality Venus gate: " + p.personalityVenus + "\nDesign Venus gate: " + p.designVenus +
      "\nDesign Mars gate: " + p.designMars + "\nDesign Earth gate: " + p.designEarth +
      "\nDesign Sun gate: " + p.designSun + "\nDesign Moon gate: " + p.designMoon +
      "\n\nWrite her free reading in the exact output format.";

    const raw = L.noDashes(await L.callClaude(system, user, 1200));
    if (!raw) return res.status(500).json({ error: 'Could not generate your reading. Try again.' });

    const s = L.parseSections(raw, HEADERS);
    return res.status(200).json({
      herName: s['HER NAME'] || '',
      loop: s['THE LOOP'] || '',
      ownHer: s['OWN HER'] || '',
      shareables: L.parseShareables(s['SHAREABLES:']),
      placements: p
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
