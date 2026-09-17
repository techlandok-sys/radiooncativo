const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return;
  }

  try {
    const { shortLivedToken } = req.body || {};
    if (!shortLivedToken) {
      res.status(400).json({ error: 'Falta el token' });
      return;
    }
    if (!process.env.IG_APP_SECRET) {
      res.status(500).json({ error: 'Falta configurar IG_APP_SECRET en Vercel' });
      return;
    }

    const exchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_APP_SECRET}&access_token=${shortLivedToken}`;
    const r = await fetch(exchangeUrl);
    const data = await r.json();

    if (!data.access_token) {
      res.status(400).json({ error: (data.error && data.error.message) || 'No se pudo canjear el token. Probablemente ya venció (duran ~1 hora) — generá uno nuevo en Meta Developers.' });
      return;
    }

    const tokenData = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    await put('ig-token.json', JSON.stringify(tokenData), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });

    res.status(200).json({ ok: true, expiresAt: tokenData.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
