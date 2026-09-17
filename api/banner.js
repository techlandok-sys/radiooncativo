const { put, list } = require('@vercel/blob');

const CONFIG_PATHNAME = 'banner-config.json';

async function getConfig() {
  const { blobs } = await list({ prefix: CONFIG_PATHNAME, limit: 1 });
  if (!blobs.length) return null;
  const response = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

module.exports = async (req, res) => {
  // Permitir que index.html (en otro dominio) llame a esta API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const config = await getConfig();
      res.status(200).json(config || { image: null, link: null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    const password = req.headers['x-admin-password'];
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }

    try {
      const { imageBase64, imageType, link } = req.body || {};
      let imageUrl;

      if (imageBase64) {
        const buffer = Buffer.from(imageBase64, 'base64');
        const ext = (imageType && imageType.split('/')[1]) || 'jpg';
        const uploaded = await put(`banner-image.${ext}`, buffer, {
          access: 'public',
          contentType: imageType || 'image/jpeg',
          allowOverwrite: true,
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
        });
        // cache-busting para que se vea la imagen nueva al instante
        imageUrl = `${uploaded.url}?v=${Date.now()}`;
      } else {
        const existing = await getConfig();
        imageUrl = existing ? existing.image : null;
      }

      const config = {
        image: imageUrl,
        link: link || '',
        updatedAt: new Date().toISOString(),
      };

      await put(CONFIG_PATHNAME, JSON.stringify(config), {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
      });

      res.status(200).json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
