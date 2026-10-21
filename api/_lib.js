// Shared helpers. Files starting with _ are not exposed as routes by Vercel.

function pick(obj, name) {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(function (k) { return k.toLowerCase() === name.toLowerCase(); });
  return key ? obj[key] : undefined;
}

function gateOf(side, planet) {
  const p = pick(side, planet);
  return p && p.Gate ? p.Gate : undefined;
}

async function getChart(birthdate, birthtime, tz) {
  const date = birthdate + ' ' + birthtime;
  const url = 'https://api.bodygraphchart.com/v221006/hd-data?api_key=' + process.env.BODYGRAPH_API_KEY +
    '&date=' + encodeURIComponent(date) + '&timezone=' + encodeURIComponent(tz);
  const hd = await (await fetch(url)).json();
  if (!hd.Personality || !hd.Design) return null;
  const P = hd.Personality, D = hd.Design;
  const placements = {
    personalityMercury: gateOf(P, 'Mercury'),
    designMercury: gateOf(D, 'Mercury'),
    personalityVenus: gateOf(P, 'Venus'),
    designVenus: gateOf(D, 'Venus'),
    designMars: gateOf(D, 'Mars'),
    designEarth: gateOf(D, 'Earth'),
    designSun: gateOf(D, 'Sun'),
    designMoon: gateOf(D, 'Moon'),
    type: hd.Properties && hd.Properties.Type && hd.Properties.Type.id,
    profile: hd.Properties && hd.Properties.Profile && hd.Properties.Profile.id
  };
  if (!placements.designSun || !placements.designMoon) {
    console.error('Design Sun/Moon missing. Design keys:', Object.keys(D));
  }
  return placements;
}

const VOICE = "You are writing in the voice of Paige Christiansen, founder of SELF(ish), a Human Design education brand. Paige's voice: direct, modern, intelligent, witty, conversational. Specific and relatable, no fluff, no generic spiritual speak. Blunt but warm. Never use em dashes. Never use wellness cliches (no journey, authentic self, step into your power, hold space, divine feminine). Never say gate numbers, line numbers, or Human Design jargon like 'Design Mercury'. Translate every placement into how it behaves in real life.";

const PERSONA = "THE PREMISE: Everyone has a twin on their Design side. She was here first, before the good girl. She is the villain in the relationship: the one who goes quiet, keeps score, tests, leaves first, sharpens her tongue, or turns cold. The good girl was built on top of her out of guilt and shame. She does not disappear when she is pushed down. She runs the show from underneath, through the unseen forces. The work is to see her, own her, lean into her, and use her power on purpose. Tone: Persephone energy, queen of the underworld who chose it. Villain, black cat, unbothered, a little dangerous, deeply loyal. Humor is welcome. Shame is not. Never shame her. The villain is the protector, not the problem.";

const EDEN = "THE EDEN LOOP (use these placements to find the pattern, never name them). The order matters: 1) Design Mercury is the suppressed shadow, the theme she is desperately trying NOT to be seen as. It wants to be expressed, but she suppresses it out of fear, and that suppression is the trigger. 2) Personality Mercury is what she overcompensates WITH, the mask, the performed good girl version. 3) Personality Venus (IQ) is the mental defense. When triggered she shoots up into her mind and intellectualizes, the story she tells herself about why she is unsafe or why the other person is wrong. 4) Design Venus (EQ) is the emotional reaction that follows the mental defense, the VISIBLE reaction the other person actually sees: the withdrawal, the overexplaining, the passive aggression, the disappearing act. 5) Design Mars is the core wound underneath everything, the primal fear of rejection, separation or shame that starts the loop whenever a relationship pokes it. 6) Design Earth is the grounding she loses while the loop runs, which feeds the wound and restarts the cycle. Two extra placements for the Design-side twin: Design Sun is the core of who the twin is, and Design Moon is what drives her underneath, what she needs and will not ask for.";

const SAFETY = "SAFETY: This is a self-awareness tool about owning HER power, not managing or fixing anyone else. If anything provided suggests an unsafe, abusive, or controlling relationship, or crisis, do not interpret or strategize. Instead write a short warm note that this deserves a real human, not a chart, and point to the SELF(ish) community or to Paige at thepaigechristiansen.com. Never give advice meant to manipulate, control, punish, or trap a partner. Never diagnose. Never tell anyone to stay in or leave a relationship.";

async function callClaude(system, user, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 1400,
      system: system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await r.json();
  return data.content && data.content[0] && data.content[0].text;
}

function parseSections(text, headers) {
  const out = {};
  const found = [];
  headers.forEach(function (h) {
    const esc = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp('^[ \\t#*]*' + esc + '[ \\t*:]*$', 'm').exec(text);
    if (m) found.push({ h: h, start: m.index, bodyStart: m.index + m[0].length });
  });
  found.sort(function (x, y) { return x.start - y.start; });
  found.forEach(function (x, n) {
    const end = n + 1 < found.length ? found[n + 1].start : text.length;
    out[x.h] = text.slice(x.bodyStart, end).trim();
  });
  return out;
}

function parseShareables(block) {
  return (block || '').split('\n')
    .map(function (l) { return l.replace(/^[-*\d.\s]+/, '').trim(); })
    .filter(function (l) { return l.length > 10; });
}

function noDashes(s) {
  return (s || '').replace(/\s*[—–]\s*/g, ', ');
}

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return true; }
  return false;
}

module.exports = { getChart, VOICE, PERSONA, EDEN, SAFETY, callClaude, parseSections, parseShareables, noDashes, cors };
