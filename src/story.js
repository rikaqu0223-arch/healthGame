// ── Speaker portraits (anime-style via DiceBear Adventurer) ──────────────────
const SPEAKER_PORTRAITS = {
  // Anime-style doctor (CC BY-SA 4.0, Wikimedia Commons)
  'DR. REYES': 'https://upload.wikimedia.org/wikipedia/commons/4/40/Vaksin_Bu_Ratna.png',
  // Anime VN male character (free commercial use, sutemo / itch.io CDN)
  'PILOT':     'https://img.itch.zone/aW1hZ2UvNjU2OTI0LzM1MzEwNzkucG5n/347x500/wGKAHm.png',
};

// ── Story acts ────────────────────────────────────────────────────────────────
// Index 0 = intro (before run 1). Index N = shown after defeating run N boss.

const ACTS = [
  {
    title: 'ACT I — ARTERY IN DANGER',
    accentColor: '#ff4466',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/82/SEM_blood_cells.jpg',
    lines: [
      { speaker: 'DR. REYES', text: "NanoSub-7, you're cleared for injection. Cardiovascular disease has narrowed the patient's blood vessels and circulation is falling fast." },
      { speaker: 'DR. REYES', text: "Fatty plaque is blocking the arteries. Your mission is to clear every major blockage and restore blood flow." },
      { speaker: 'PILOT',    text: "I'm reading the first plaque mass ahead. Crystals in the bloodstream can power our cutting systems." },
      { speaker: 'DR. REYES', text: "Clear Plaque Alpha, keep the vessel open, and move toward the heart." },
      { speaker: 'PILOT',    text: "Beginning arterial entry. I'll get the blood moving again." },
    ],
  },
  {
    title: 'ACT II — PLAQUE BUILDUP',
    accentColor: '#ff6600',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Blood_clot_in_scanning_electron_microscopy.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Plaque Alpha is cleared. Flow is improving, but the artery ahead is still badly narrowed." },
      { speaker: 'DR. REYES', text: "The disease has built up layers of cholesterol and fatty material along the vessel wall. Plaque Beta is denser." },
      { speaker: 'PILOT',    text: "So every section we reopen reduces the obstruction and lets more blood through." },
      { speaker: 'DR. REYES', text: "Exactly. Upgrade your systems, break apart the deposit, and protect the vessel as you advance." },
      { speaker: 'PILOT',    text: "How much circulation has she lost?" },
      { speaker: 'DR. REYES', text: "Too much. Keep moving." },
    ],
  },
  {
    title: 'ACT III — CORONARY ARTERY',
    accentColor: '#00ff66',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Cardiac_muscle_microscope.jpg/1280px-Cardiac_muscle_microscope.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Plaque Beta is gone. I'm entering the coronary vessels now." },
      { speaker: 'DR. REYES', text: "Those arteries supply oxygen-rich blood to the heart muscle. Plaque Gamma is restricting that supply." },
      { speaker: 'DR. REYES', text: "The deposit has started to calcify, making the blockage harder and more resistant." },
      { speaker: 'PILOT',    text: "Then I'll concentrate fire and reopen the channel without damaging the vessel wall." },
      { speaker: 'DR. REYES', text: "Good. The heart needs steady flow. Clear the obstruction." },
    ],
  },
  {
    title: 'ACT IV — CRITICAL NARROWING',
    accentColor: '#00aaff',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Blood_clot_in_scanning_electron_microscopy.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Gamma is cleared, but pressure is unstable farther downstream." },
      { speaker: 'DR. REYES', text: "Plaque Delta is creating a critical narrowing. Only a small channel remains for blood to pass through." },
      { speaker: 'PILOT',    text: "If that channel closes, circulation beyond this point stops." },
      { speaker: 'DR. REYES', text: "Correct. Remove the blockage before the vessel becomes fully occluded." },
      { speaker: 'PILOT',    text: "Understood. Opening the artery now." },
    ],
  },
  {
    title: 'ACT V — COMPLETE OCCLUSION',
    accentColor: '#ffff44',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Blood_clot_in_scanning_electron_microscopy.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Delta is cleared. I've reached the largest obstruction near the main coronary route." },
      { speaker: 'DR. REYES', text: "Plaque Omega. A dense mass of cholesterol, fat, calcium, and cellular debris. It is almost completely blocking the vessel." },
      { speaker: 'PILOT',    text: "It's enormous. Barely any blood is getting past it." },
      { speaker: 'DR. REYES', text: "Everything you've collected and every upgrade has prepared you to clear this final occlusion." },
      { speaker: 'DR. REYES', text: "Break it apart and restore circulation through the entire route." },
      { speaker: 'PILOT',    text: "Final blockage in sight. Let's restore the flow." },
    ],
  },
  {
    title: 'ACT VI — CIRCULATION RESTORED',
    accentColor: '#44ffcc',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Red_Blood_Cells_Under_Microscope.jpg/1280px-Red_Blood_Cells_Under_Microscope.jpg',
    lines: [
      { speaker: 'DR. REYES', text: "NanoSub-7, the major blockages are clear. Blood is moving freely through the reopened vessels." },
      { speaker: 'PILOT',    text: "How is the heart responding?" },
      { speaker: 'DR. REYES', text: "Circulation is stabilising and oxygen delivery is improving. The patient is going to make it." },
      { speaker: 'PILOT',    text: "Then every cleared artery was worth it." },
      { speaker: 'DR. REYES', text: "Cardiovascular flow restored. Mission complete. Come home, Pilot." },
    ],
  },
];

// ── Cutscene renderer ─────────────────────────────────────────────────────────
let _typingTimer = null;

export function showCutscene(index, onComplete) {
  const act = ACTS[Math.min(index, ACTS.length - 1)];
  if (!act) { onComplete(); return; }

  const overlay  = document.getElementById('cutscene-overlay');
  const titleEl  = document.getElementById('cs-title');
  const speakerEl = document.getElementById('cs-speaker');
  const textEl   = document.getElementById('cs-text');
  const nextBtn  = document.getElementById('cs-next');
  const skipBtn  = document.getElementById('cs-skip');
  const imgEl      = document.getElementById('cs-image');
  const portraitEl = document.getElementById('cs-portrait');

  imgEl.src = act.image ?? '';
  imgEl.style.display = act.image ? 'block' : 'none';

  titleEl.textContent = act.title;
  titleEl.style.color = act.accentColor;
  titleEl.style.textShadow = `0 0 20px ${act.accentColor}`;
  document.getElementById('cs-accent').style.borderColor = act.accentColor;

  overlay.classList.remove('hidden');

  let lineIndex = 0;

  function typeLine(i) {
    if (i >= act.lines.length) {
      overlay.classList.add('hidden');
      onComplete();
      return;
    }
    const { speaker, text } = act.lines[i];
    speakerEl.textContent = speaker + ':';
    speakerEl.style.color = act.accentColor;
    portraitEl.src = SPEAKER_PORTRAITS[speaker] ?? '';
    portraitEl.style.borderColor = act.accentColor;
    textEl.textContent = '';

    let ci = 0;
    if (_typingTimer) clearInterval(_typingTimer);
    _typingTimer = setInterval(() => {
      textEl.textContent += text[ci++];
      if (ci >= text.length) clearInterval(_typingTimer);
    }, 22);
  }

  // Replace click handler each time to avoid stacking listeners
  const nextHandler = () => {
    if (_typingTimer) clearInterval(_typingTimer);
    const line = act.lines[lineIndex];
    if (textEl.textContent.length < line.text.length) {
      textEl.textContent = line.text; // complete current line
    } else {
      typeLine(++lineIndex);
    }
  };

  const skipHandler = () => {
    if (_typingTimer) clearInterval(_typingTimer);
    overlay.classList.add('hidden');
    onComplete();
  };

  // Clone buttons to strip old listeners
  const freshNext = nextBtn.cloneNode(true);
  const freshSkip = skipBtn.cloneNode(true);
  nextBtn.replaceWith(freshNext);
  skipBtn.replaceWith(freshSkip);
  freshNext.addEventListener('click', nextHandler);
  freshSkip.addEventListener('click', skipHandler);

  typeLine(0);
}
