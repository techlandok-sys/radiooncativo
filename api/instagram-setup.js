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

    // Los tokens generados desde "Generar token" en el App Dashboard ya vienen
    // de larga duración (60 días), así que no hace falta canjearlos. Solo
    // verificamos que funcionen antes de guardarlos.
    const checkUrl = `https://graph.instagram.com/me?fields=user_id,username&access_token=${shortLivedToken}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (checkData.error) {
      res.status(400).json({ error: checkData.error.message || 'El token no es válido' });
      return;
    }

    const tokenData = {
      token: shortLivedToken,
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 días
    };

    await put('ig-token.json', JSON.stringify(tokenData), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });

    res.status(200).json({ ok: true, expiresAt: tokenData.expiresAt, username: checkData.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
