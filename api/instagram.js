const { list, put } = require('@vercel/blob');

const TOKEN_PATHNAME = 'ig-token.json';
const GRAPH = 'https://graph.instagram.com';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function getTokenData() {
  const { blobs } = await list({ prefix: TOKEN_PATHNAME, limit: 1 });
  if (!blobs.length) return null;
  const r = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}

async function saveTokenData(data) {
  await put(TOKEN_PATHNAME, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
}

// Renueva el token automáticamente si está por vencer (no necesita el secreto de la app)
async function refreshIfNeeded(tokenData) {
  if (Date.now() < tokenData.expiresAt - THREE_DAYS_MS) return tokenData;

  try {
    const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${tokenData.token}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.access_token) return tokenData; // si falla, seguimos con el que teniamos
    const updated = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    await saveTokenData(updated);
    return updated;
  } catch (e) {
    return tokenData;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    let tokenData = await getTokenData();
    if (!tokenData) {
      res.status(200).json({ posts: [], error: 'not_configured' });
      return;
    }

    tokenData = await refreshIfNeeded(tokenData);

    const igUserId = process.env.IG_USER_ID;
    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
    const mediaUrl = `${GRAPH}/${igUserId}/media?fields=${fields}&access_token=${tokenData.token}&limit=6`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      res.status(200).json({ posts: [], error: mediaData.error.message });
      return;
    }

    res.status(200).json({ posts: mediaData.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
