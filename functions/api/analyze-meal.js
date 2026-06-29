const MEAL_API_URL = 'https://api.tu-zi.com/v1/chat/completions';
const MAX_DATA_URL_LENGTH = 14_000_000;
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 3600;

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

async function checkRateLimit(kv, ip) {
  const key = `rl:${ip}`;
  const now = Date.now();
  const windowMs = RATE_WINDOW_SECONDS * 1000;

  const stored = await kv.get(key, 'json');

  if (!stored || now > stored.resetAt) {
    await kv.put(key, JSON.stringify({ count: 1, resetAt: now + windowMs }), {
      expirationTtl: RATE_WINDOW_SECONDS,
    });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + windowMs };
  }

  if (stored.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: stored.resetAt };
  }

  const ttl = Math.ceil((stored.resetAt - now) / 1000);
  await kv.put(key, JSON.stringify({ count: stored.count + 1, resetAt: stored.resetAt }), {
    expirationTtl: ttl,
  });
  return { allowed: true, remaining: RATE_LIMIT - stored.count - 1, resetAt: stored.resetAt };
}

function isValidImageSource(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_DATA_URL_LENGTH) return false;
  if (value.startsWith('data:image/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.MEAL_API_KEY) {
    return jsonResponse({ error: { message: 'Meal scanner is not configured.' } }, 503);
  }

  if (env.KV) {
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const { allowed, remaining, resetAt } = await checkRateLimit(env.KV, ip);
    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return jsonResponse(
        { error: { message: `Rate limit reached. You can analyze ${RATE_LIMIT} meals per hour.` } },
        429,
        {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      );
    }
  }

  let imageSource;
  try {
    ({ imageSource } = await request.json());
  } catch (_error) {
    return jsonResponse({ error: { message: 'Invalid JSON request.' } }, 400);
  }

  if (!isValidImageSource(imageSource)) {
    return jsonResponse({ error: { message: 'Provide a valid meal image or URL.' } }, 400);
  }

  const payload = {
    model: 'gemini-3-flash-preview',
    messages: [
      {
        role: 'system',
        content: 'You grade meal photos for a game. Return only valid JSON. This is not medical advice.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Look at the image and return ONLY minified JSON, no markdown: {"mealName":"...","healthScore":0-100,"startingEnergy":0-100,"grade":"A/B/C/D/F","reason":"short"}. startingEnergy must equal healthScore. Grade mapping: A=85-100, B=70-84, C=55-69, D=40-54, F=0-39.',
          },
          {
            type: 'image_url',
            image_url: { url: imageSource },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    stream: false,
    temperature: 0.1,
    max_tokens: 2048,
  };

  try {
    const response = await fetch(MEAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MEAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (_error) {
    return jsonResponse({ error: { message: 'Meal scanner service is unavailable.' } }, 502);
  }
}

export function onRequest() {
  return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);
}
