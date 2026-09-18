const { put, list, del } = require('@vercel/blob');

const LIST_PATHNAME = 'banners-list.json';

async function getBanners() {
  const { blobs } = await list({ prefix: LIST_PATHNAME, limit: 1 });
  if (!blobs.length) return [];
  const response = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function saveBanners(banners) {
  await put(LIST_PATHNAME, JSON.stringify(banners), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const banners = await getBanners();
      res.status(200).json({ banners });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const { imageBase64, imageType, link } = req.body || {};
      if (!imageBase64) {
        res.status(400).json({ error: 'Falta la imagen' });
        return;
      }

      const buffer = Buffer.from(imageBase64, 'base64');
      const ext = (imageType && imageType.split('/')[1]) || 'jpg';
      const id = `banner-${Date.now()}`;
      const uploaded = await put(`${id}.${ext}`, buffer, {
        access: 'public',
        contentType: imageType || 'image/jpeg',
        addRandomSuffix: false,
        cacheControlMaxAge: 3600,
      });

      const banners = await getBanners();
      banners.push({ id, image: uploaded.url, link: link || '', createdAt: Date.now() });
      await saveBanners(banners);

      res.status(200).json({ ok: true, banners });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.query && req.query.id;
      if (!id) {
        res.status(400).json({ error: 'Falta el id' });
        return;
      }
      const banners = await getBanners();
      const target = banners.find((b) => b.id === id);
      const remaining = banners.filter((b) => b.id !== id);
      await saveBanners(remaining);

      if (target && target.image) {
        try { await del(target.image); } catch (e) {}
      }

      res.status(200).json({ ok: true, banners: remaining });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
