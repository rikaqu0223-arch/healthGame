const MEAL_API_URL = 'https://api.tu-zi.com/v1/chat/completions';
const MAX_DATA_URL_LENGTH = 14_000_000;

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
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
