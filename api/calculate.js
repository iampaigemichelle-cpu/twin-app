const L = require('./_lib');

const HEADERS = ['HER VILLAIN', 'THE OVERCOMPENSATION', 'THE LOOP', 'THE HIGHER VERSION', 'OWN HER', 'COME AS HER', 'SHAREABLES'];

module.exports = async function handler(req, res) {
  if (L.cors(req, res)) return;
  const { name, email, birthdate, birthtime, cityTz } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!birthdate || !birthtime || !cityTz) return res.status(400).json({ error: 'Birth data required' });

  try {
    const p = await L.getChart(birthdate, birthtime, cityTz);
    if (!p) return res.status(500).json({ error: 'Could not calculate your chart. Check your birth details.' });

    const system = [L.VOICE, L.PERSONA, L.EDEN, L.SAFETY].join('\n\n') +
      "\n\nTHIS IS THE FREE READING. THE ANGLE: she has spent her life terrified of being the villain she can feel inside her, so she overcompensated by becoming the opposite. For example (one example only, yours will differ): someone terrified of being cold becomes overly giving and accommodating, which made her miserable and kept her in situations that were not safe. Someone terrified of being controlling might become passive and never ask for anything; someone terrified of being needy might become hyper independent; someone terrified of being selfish might never say what she wants. Leaning into the villain is not becoming cruel. It is self-acceptance. She may still be perceived the same way, but it becomes the higher vibration of that trait: she is secure, direct about what she feels and what she wants, and no longer apologizing for taking up space. IMPORTANT: her trait is NOT always cold. It comes from her chart and could be controlling, needy, selfish, too much, manipulative-feeling, critical, flaky, intense, jealous, aloof, bossy, dramatic, or something else entirely. Never default to cold. Use her actual shadow. Be direct, bold and a little provocative. Talk TO her in second person, like the friend who says the thing everyone else is too polite to say. Short punchy sentences. Name exact behaviors. She should feel caught and kind of delighted. Never shame her. The villain is the protector. Output format, exactly, each header on its own line:\n\n" +
      "HER VILLAIN\nName the PERSONA she has been repressing, the one the culture only lets out on Halloween. Do NOT use Disney or movie characters. Make it a specific, a little dangerous archetype in the style of: The Woman Who Enjoys Being Watched. The Bitch With Excellent Boundaries. The One Who Gives Orders And Loves It. The Witch Who Trusts What She Knows. The Extravagant Flirt Who Refuses To Dress Down. The One Who Leaves First And Never Explains. These are only style examples, invent the one that fits HER. The match comes from the shadow of her Design Mercury (the theme she is desperately trying NOT to be seen as) combined with how her Personality Mercury overcompensates. Line one: the persona in bold, 3 to 8 words. Then 2 sentences: how people read this persona when she slips out, and what she is actually protecting. Make her say oh god.\n\n" +
      "THE OVERCOMPENSATION\n1 short paragraph. The mask she built so nobody would ever see this villain in her: the exact opposite she performs, what it looks like in her relationships, and what it has cost her. Specific, a little uncomfortable.\n\n" +
      "THE LOOP\n1 or 2 short paragraphs. The loop in plain behavior: what happens when the mask cracks, the story she tells herself, what the other person actually sees, and what she is really protecting underneath. The final sentence is quiet and warm.\n\n" +
      "THE HIGHER VERSION\n2 or 3 sentences. What this villain looks like when she is secure instead of ashamed. She may still be called the thing she feared being called, but she is direct about what she feels and wants, and clear instead of cruel. Never cruelty, never punishing, never manipulation.\n\n" +
      "OWN HER\nA practical 3 step protocol, each step on its own line starting with a bold label, then 1 to 2 sentences, concrete and usable this week.\n" +
      "**1. Catch her.** Her exact tell: the first physical sensation, thought or behavior that means she just walked in.\n" +
      "**2. Let her speak.** What she is actually trying to say or protect, plus a real sentence in quotes the reader can say out loud that says it honestly without the attack, the silence or the exit.\n" +
      "**3. Use her on purpose.** One specific place her power belongs this week: a boundary, a no, a standard, a decision, a hard truth, and what it will feel like.\n" +
      "Then one final line that dares her to lean in. Persephone energy.\n\n" +
      "COME AS HER\n2 or 3 short sentences. Halloween is the one night the world lets us be her. Give three small, doable ways to let this persona out this week: a physical thing (like a red lip or an outfit), a name or attitude to try on, and one behavior (a no, an order, a flirt, an unapologetic opinion). Specific to her persona. Playful, a little dangerous, never cruel.\n\n" +
      "SHAREABLES:\n- three short lines she could post or text a friend about her villain, funny and true, no hashtags\n\n" +
      "Hard rules: no gate numbers, no em dashes, no jargon, no manipulation of a partner, under 540 words before SHAREABLES.";

    const user = "Name: " + (name || 'her') + "\nType: " + (p.type || 'unknown') + "\nProfile: " + (p.profile || 'unknown') +
      "\nPlacements:\nDesign Mercury gate: " + p.designMercury + "\nPersonality Mercury gate: " + p.personalityMercury +
      "\nPersonality Venus gate: " + p.personalityVenus + "\nDesign Venus gate: " + p.designVenus +
      "\nDesign Mars gate: " + p.designMars + "\nDesign Earth gate: " + p.designEarth +
      "\nDesign Sun gate: " + p.designSun + "\nDesign Moon gate: " + p.designMoon +
      "\n\nWrite her free reading in the exact output format.";

    const raw = L.noDashes(await L.callClaude(system, user, 2600));
    if (!raw) return res.status(500).json({ error: 'Could not generate your reading. Try again.' });

    const s = L.parseSections(raw, HEADERS);
    console.log('RAW OUTPUT START\n' + raw.slice(0, 600));
    let nameBlock = s['HER VILLAIN'] || '';
    if (!nameBlock) { const fb = raw.match(/\*\*(.+?)\*\*/); if (fb) nameBlock = fb[0]; }
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
      sections: [
        ['What you have been overcompensating', s['THE OVERCOMPENSATION']],
        ['The loop', s['THE LOOP']],
        ['The higher version of her', s['THE HIGHER VERSION']],
        ['Own her', s['OWN HER']],
        ['Come as her', s['COME AS HER']]
      ].filter(function (x) { return x[1]; }).map(function (x) { return { title: x[0], body: x[1] }; }),
      shareables: L.parseShareables(s['SHAREABLES']),
      placements: p
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
