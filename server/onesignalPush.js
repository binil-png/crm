const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

const isFilled = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !text.startsWith('your-');
};

const emailsFrom = (payload) =>
  [...new Set((payload.emails || [payload.email]).map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];

const authHeader = (apiKey) => {
  const key = String(apiKey || '').trim();
  if (key.toLowerCase().startsWith('key ')) return key;
  if (key.startsWith('os_v2_')) return `Key ${key}`;
  return `Basic ${key}`;
};

const formatSendAfter = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now() + 5000) return undefined;
  return date.toISOString();
};

export const getPushConfig = (env = process.env) => ({
  appId: String(env.ONESIGNAL_APP_ID || env.VITE_ONESIGNAL_APP_ID || '').trim(),
  apiKey: String(env.ONESIGNAL_REST_API_KEY || '').trim(),
});

export const processPushAction = async (env, payload = {}) => {
  const { appId, apiKey } = getPushConfig(env);
  if (!isFilled(appId) || !isFilled(apiKey)) {
    return {
      status: 503,
      body: {
        error:
          'OneSignal is not configured. Add VITE_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY to .env. The REST key must stay server-side (no VITE_ prefix).',
      },
    };
  }

  const action = payload.action || 'send';

  if (action === 'cancel') {
    const ids = (payload.notificationIds || []).filter(Boolean);
    const results = [];
    for (const id of ids) {
      const response = await fetch(`${ONESIGNAL_URL}/${encodeURIComponent(id)}?app_id=${encodeURIComponent(appId)}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader(apiKey) },
      });
      results.push({ id, ok: response.ok, status: response.status });
    }
    return { status: 200, body: { cancelled: results } };
  }

  const emails = emailsFrom(payload);
  if (!emails.length) {
    return { status: 400, body: { error: 'A recipient email is required.' } };
  }
  if (!payload.title || !payload.body) {
    return { status: 400, body: { error: 'Notification title and body are required.' } };
  }

  const body = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: emails },
    headings: { en: payload.title },
    contents: { en: payload.body },
    url: payload.url || '/',
    data: { source: 'sheets-crm', id: payload.id || '' },
  };
  const sendAfter = formatSendAfter(payload.sendAt);
  if (sendAfter) body.send_after = sendAfter;

  const response = await fetch(ONESIGNAL_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: response.status,
      body: { error: result.errors?.[0] || result.error || 'OneSignal rejected the notification.' },
    };
  }
  return { status: 200, body: { id: result.id, recipients: result.recipients ?? null } };
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export const handlePushHttp = async (req, env = process.env) => {
  const method = req.method || 'GET';
  if (method === 'OPTIONS') return { status: 204, body: {} };
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST.' } };
  try {
    const payload = await readJsonBody(req);
    return await processPushAction(env, payload);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON body.' } };
  }
};

export const attachPushApi = (middlewares, env) => {
  middlewares.use(async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/push') {
      next();
      return;
    }
    const result = await handlePushHttp(req, env);
    res.statusCode = result.status;
    if (result.status !== 204) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body));
      return;
    }
    res.end();
  });
};
