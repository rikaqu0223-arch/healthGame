import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const isConfigured = Boolean(supabaseUrl && supabaseKey);
const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

const PLAYER_NAME_KEY = 'biocurrent-player-name';

function normalizePlayerName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
}

export function getStoredPlayerName() {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function storePlayerName(value) {
  const playerName = normalizePlayerName(value);
  if (playerName) localStorage.setItem(PLAYER_NAME_KEY, playerName);
  return playerName;
}

function getResultKey(result) {
  return `${result.attemptId}:${result.score}:${result.runsCompleted}:${result.outcome}`;
}

async function fetchTopScores() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('id, player_name, score, runs_completed, outcome, veggie_count, junk_food_count, meal_photo_url, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data;
}

async function uploadMealPhoto(file) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!file?.type?.startsWith('image/')) throw new Error('Meal photo must be an image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Meal photo must be smaller than 10 MB.');

  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  const extension = extensions[file.type];
  if (!extension) throw new Error('Meal photo must be JPG, PNG, WebP, GIF, or HEIC.');

  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('meal-photos').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from('meal-photos').getPublicUrl(path).data.publicUrl;
}

async function importMealPhoto(sourceUrl) {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch (_error) {
    throw new Error('Meal photo URL is invalid.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Meal photo URL must use HTTP or HTTPS.');
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return uploadMealPhoto(await response.blob());
  } catch (_error) {
    throw new Error('Could not copy that meal URL into Storage. Upload the image file directly instead.');
  }
}

async function submitScore(result, playerName) {
  if (!supabase) throw new Error('Supabase is not configured.');

  if (result.mealPhotoFile && !result.mealPhotoUrl) {
    result.mealPhotoUrl = await uploadMealPhoto(result.mealPhotoFile);
  } else if (result.mealPhotoSourceUrl && !result.mealPhotoUrl) {
    result.mealPhotoUrl = await importMealPhoto(result.mealPhotoSourceUrl);
  }

  const entry = {
    player_name: normalizePlayerName(playerName),
    score: Math.max(0, Math.round(result.score)),
    runs_completed: Math.max(0, Math.min(5, Math.round(result.runsCompleted))),
    outcome: result.outcome,
    veggie_count: Math.max(0, Math.min(1000, Math.round(result.veggieCount || 0))),
    junk_food_count: Math.max(0, Math.min(1000, Math.round(result.junkFoodCount || 0))),
    meal_photo_url: result.mealPhotoUrl || null,
  };
  const { error } = await supabase.from('leaderboard_scores').insert(entry);
  if (error) throw error;
}

function formatDatabaseError(error) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return 'Leaderboard table not found. Run the Supabase migration first.';
  }
  return error?.message || 'Leaderboard unavailable. Try again shortly.';
}

export function initializeLeaderboard() {
  const overlay = document.getElementById('leaderboard-overlay');
  const closeButton = document.getElementById('leaderboard-close');
  const form = document.getElementById('leaderboard-form');
  const input = document.getElementById('leaderboard-name');
  const submitButton = document.getElementById('leaderboard-submit');
  const resultSummary = document.getElementById('leaderboard-result-summary');
  const status = document.getElementById('leaderboard-status');
  const list = document.getElementById('leaderboard-list');

  let pendingResult = null;
  let previousFocus = null;
  let submittedResultKey = '';

  function renderRows(rows) {
    list.replaceChildren();

    if (!rows.length) {
      const empty = document.createElement('li');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'No mission records yet. Set the first score.';
      list.appendChild(empty);
      return;
    }

    rows.forEach((row, index) => {
      const item = document.createElement('li');
      item.className = `leaderboard-row rank-${index + 1}`;
      item.style.setProperty('--row-index', index);

      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const pilot = document.createElement('span');
      pilot.className = 'leaderboard-pilot';
      if (row.meal_photo_url) {
        const photo = document.createElement('img');
        photo.className = 'leaderboard-meal-photo';
        photo.src = row.meal_photo_url;
        photo.alt = '';
        photo.loading = 'lazy';
        photo.referrerPolicy = 'no-referrer';
        pilot.appendChild(photo);
      }

      const identity = document.createElement('span');
      identity.className = 'leaderboard-identity';
      const name = document.createElement('strong');
      name.textContent = row.player_name;
      const detail = document.createElement('small');
      const outcome = row.outcome === 'mission_complete'
        ? 'MISSION COMPLETE'
        : `${row.runs_completed}/5 BLOCKAGES`;
      detail.textContent = `${row.veggie_count || 0} VEG / ${row.junk_food_count || 0} JUNK / ${outcome}`;
      identity.append(name, detail);
      pilot.appendChild(identity);

      const score = document.createElement('strong');
      score.className = 'leaderboard-score';
      score.textContent = Number(row.score).toLocaleString();

      item.append(rank, pilot, score);
      list.appendChild(item);
    });
  }

  async function refreshScores() {
    status.textContent = 'Loading mission records...';
    list.setAttribute('aria-busy', 'true');

    try {
      const rows = await fetchTopScores();
      renderRows(rows);
      status.textContent = '';
    } catch (error) {
      renderRows([]);
      status.textContent = formatDatabaseError(error);
    } finally {
      list.removeAttribute('aria-busy');
    }
  }

  function open(result = null) {
    previousFocus = document.activeElement;
    pendingResult = result;
    status.textContent = '';
    overlay.classList.remove('hidden');
    document.body.classList.add('leaderboard-open');

    if (result) {
      form.classList.remove('hidden');
      resultSummary.textContent = `${result.score.toLocaleString()} CRYSTALS / ${result.veggieCount} VEG / ${result.junkFoodCount} JUNK`;
      input.value = getStoredPlayerName();
      const resultKey = getResultKey(result);
      const alreadySubmitted = resultKey === submittedResultKey;
      submitButton.disabled = alreadySubmitted;
      submitButton.textContent = alreadySubmitted ? 'SCORE SAVED' : 'SAVE SCORE';
      window.setTimeout(() => input.focus(), 0);
    } else {
      form.classList.add('hidden');
      closeButton.focus();
    }

    refreshScores();
  }

  function close() {
    overlay.classList.add('hidden');
    document.body.classList.remove('leaderboard-open');
    pendingResult = null;
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingResult || submitButton.disabled) return;

    const playerName = normalizePlayerName(input.value);
    if (!playerName) {
      status.textContent = 'Enter a callsign before saving.';
      input.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'SAVING...';
    status.textContent = '';

    try {
      await submitScore(pendingResult, playerName);
      storePlayerName(playerName);
      submittedResultKey = getResultKey(pendingResult);
      submitButton.textContent = 'SCORE SAVED';
      status.textContent = 'Mission record secured.';
      await refreshScores();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'SAVE SCORE';
      status.textContent = formatDatabaseError(error);
    }
  });

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && !overlay.classList.contains('hidden')) close();
  });

  return { open, close, refresh: refreshScores };
}
