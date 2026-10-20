const L = require('./_lib');

const HEADERS = ['HER NAME', 'THE LOOP', 'OWN HER', 'SHAREABLES'];

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const { name, email, birthdate, birthtime, cityTz } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!birthdate || !birthtime || !cityTz) return res.status(400).json({ error: 'Birth data required' });

  try {
    const p = await L.getChart(birthdate, birthtime, cityTz);
    if (!p) return res.status(500).json({ error: 'Could not calculate your chart. Check your birth details.' });

    const system = [L.VOICE, L.PERSONA, L.EDEN, L.SAFETY].join('\n\n') +
      "\n\nTHIS IS THE FREE READING. Find the ONE strongest pattern in her chart and name it as a loop she runs in relationships. Be direct, bold and a little provocative. Talk TO her in second person, like the friend who says the thing everyone else is too polite to say. Short punchy sentences. Name the exact behavior (the silent treatment, the scorekeeping, the leaving-first, the sharp little comment, the performance of being fine). She should feel caught and kind of delighted about it. Never shame her. The villain is the protector. Output format, exactly:\n\n" +
      "HER NAME\nYou MUST give her a name. Put a 2 to 4 word name for her villain in bold, the real label people put on her when she is in her shadow in a relationship, derived from the shadow of her Design Mercury combined with how her Personality Mercury overcompensates. A real human perception that makes her say oh god, like **The Quiet Executioner**, **The Ice Queen of Almost** or **The Martyr**. Not a concept or a gate name. Then one blunt sentence on what the people in her life say about her on a bad day.\n\n" +
      "THE LOOP\nExactly 2 short paragraphs. First: the loop step by step, in plain behavior. What the good girl does, what the other person actually sees, what you are really protecting. Second: what it costs you, and what the guilt and shame have been doing to your power. The final sentence is quiet and warm.\n\n" +
      "OWN HER\nA practical 3 step protocol, each step on its own line starting with a bold label, then 1 to 2 sentences. Be concrete and usable this week, not abstract.\n" +
      "**1. Catch her.** Her exact tell: the first physical sensation, thought or behavior that means she just walked in. Something the reader can notice in the moment.\n" +
      "**2. Let her speak.** What she is actually trying to say or protect. Then give a real sentence the reader can say out loud, in quotes, that says it honestly without the attack, the silence or the exit.\n" +
      "**3. Use her on purpose.** One specific place her power belongs: a boundary, a no, a standard, a decision, a hard truth. Say what to do this week and what it will feel like.\n" +
      "Then one final line that dares her to lean in. Persephone energy.\n\n" +
      "SHAREABLES:\n- three short lines she could post or text a friend about her villain, funny and true, no hashtags\n\n" +
      "Hard rules: no gate numbers, no em dashes, no jargon, no manipulation of a partner, under 380 words before SHAREABLES.";

    const user = "Name: " + (name || 'her') + "\nType: " + (p.type || 'unknown') + "\nProfile: " + (p.profile || 'unknown') +
      "\nPlacements:\nDesign Mercury gate: " + p.designMercury + "\nPersonality Mercury gate: " + p.personalityMercury +
      "\nPersonality Venus gate: " + p.personalityVenus + "\nDesign Venus gate: " + p.designVenus +
      "\nDesign Mars gate: " + p.designMars + "\nDesign Earth gate: " + p.designEarth +
      "\nDesign Sun gate: " + p.designSun + "\nDesign Moon gate: " + p.designMoon +
      "\n\nWrite her free reading in the exact output format.";

    const raw = L.noDashes(await L.callClaude(system, user, 1600));
    if (!raw) return res.status(500).json({ error: 'Could not generate your reading. Try again.' });

    const s = L.parseSections(raw, HEADERS);
    const nameBlock = s['HER NAME'] || '';
    const bm = nameBlock.match(/\*\*(.+?)\*\*/);
    let herName = '', herDesc = '';
    if (bm) { herName = bm[1].trim(); herDesc = nameBlock.replace(bm[0], '').trim(); }
    else {
      const lines = nameBlock.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      herName = (lines[0] || '').replace(/\*/g, ''); herDesc = lines.slice(1).join('\n');
    }
    // Send the lead to GHL (inbound webhook). Never block the reading if this fails.
    if (process.env.GHL_WEBHOOK_URL) {
      try {
        await fetch(process.env.GHL_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'the-twin-app',
            tag: 'the-twin-free',
            email: email,
            firstName: name || '',
            birthdate: birthdate,
            villainName: herName,
            type: p.type || '',
            profile: p.profile || ''
          })
        });
      } catch (err) { console.error('GHL webhook failed:', err.message); }
    }

    return res.status(200).json({
      herName: herName,
      herDesc: herDesc,
      loop: s['THE LOOP'] || '',
      ownHer: s['OWN HER'] || '',
      shareables: L.parseShareables(s['SHAREABLES']),
      placements: p
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
