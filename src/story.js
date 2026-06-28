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
    title: 'ACT I — THE INFECTION BEGINS',
    accentColor: '#ff4466',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/82/SEM_blood_cells.jpg',
    lines: [
      { speaker: 'DR. REYES', text: "NanoSub-7, you're go for injection. The patient — a child — is failing fast." },
      { speaker: 'DR. REYES', text: "Something has colonised her bloodstream. Bio-crystalline fragments are everywhere — collect them to power your systems." },
      { speaker: 'PILOT',    text: "I'm reading a massive hostile entity at the arterial end. Never seen a signature like this." },
      { speaker: 'DR. REYES', text: "We're designating it Pathogen Alpha. Destroy it — the patient's life depends on you." },
      { speaker: 'PILOT',    text: "Beginning injection sequence. See you on the other side." },
    ],
  },
  {
    title: 'ACT II — ADAPTATION',
    accentColor: '#ff6600',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Blood_clot_in_scanning_electron_microscopy.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Alpha is down. But the tunnel ahead is longer... and something is already moving in it." },
      { speaker: 'DR. REYES', text: "A second organism has emerged. Pathogen Beta. It's learned from Alpha's defeat." },
      { speaker: 'PILOT',    text: "It's adapting in real-time? That shouldn't be possible." },
      { speaker: 'DR. REYES', text: "Nothing about this infection should be possible. Take a moment — upgrade your systems. You'll need every edge." },
      { speaker: 'PILOT',    text: "How much time does she have?" },
      { speaker: 'DR. REYES', text: "Not enough. Go." },
    ],
  },
  {
    title: 'ACT III — THE HEART CHAMBER',
    accentColor: '#00ff66',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Cardiac_muscle_microscope.jpg/1280px-Cardiac_muscle_microscope.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Beta neutralised. Pushing deeper into the vascular system now." },
      { speaker: 'DR. REYES', text: "You're approaching the cardiac sector. Pathogen Gamma has fortified it." },
      { speaker: 'DR. REYES', text: "Warning — Gamma secretes a neurotoxin. It degrades the surrounding tissue as it moves." },
      { speaker: 'PILOT',    text: "How is it coordinating this? It's like these things are one organism." },
      { speaker: 'DR. REYES', text: "We think they might be. The heart won't hold much longer. Move." },
    ],
  },
  {
    title: 'ACT IV — NEURAL BREACH',
    accentColor: '#00aaff',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/A_spiny_stellate_neuron.png',
    lines: [
      { speaker: 'PILOT',    text: "Gamma's gone. But I'm picking up a signal — structured, repeating. Like a transmission." },
      { speaker: 'DR. REYES', text: "That's Pathogen Delta. It's breached the blood-brain barrier. This is now critical." },
      { speaker: 'PILOT',    text: "If it reaches the cortex—" },
      { speaker: 'DR. REYES', text: "We lose her entirely. Delta is fast and aggressive. It knows you're coming." },
      { speaker: 'PILOT',    text: "Then I won't give it time to prepare." },
    ],
  },
  {
    title: 'ACT V — THE ORIGIN',
    accentColor: '#ffff44',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Herpesvirus_%28negative_staining%29.jpg',
    lines: [
      { speaker: 'PILOT',    text: "Delta is destroyed. I've reached the primary infection site. It's... ancient. This has been here a long time." },
      { speaker: 'DR. REYES', text: "Pathogen Omega. The origin strain. Every creature you've faced was its offspring." },
      { speaker: 'PILOT',    text: "It's enormous. The readings are off the charts." },
      { speaker: 'DR. REYES', text: "Everything you've collected, every upgrade — it was all preparation for this moment." },
      { speaker: 'DR. REYES', text: "Destroy Omega and the infection collapses. All of it." },
      { speaker: 'PILOT',    text: "One shot. Let's end this." },
    ],
  },
  {
    title: 'ACT VI — PATIENT SAVED',
    accentColor: '#44ffcc',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Red_Blood_Cells_Under_Microscope.jpg/1280px-Red_Blood_Cells_Under_Microscope.jpg',
    lines: [
      { speaker: 'DR. REYES', text: "NanoSub-7... all readings nominal. The infection — it's gone. Every last trace." },
      { speaker: 'PILOT',    text: "She's going to make it?" },
      { speaker: 'DR. REYES', text: "She's going to make it. Vitals are stabilising. She's going to be okay." },
      { speaker: 'PILOT',    text: "Then it was worth it. Every run, every hit. Worth it." },
      { speaker: 'DR. REYES', text: "Patient saved. Mission complete. Get yourself home, Pilot." },
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
