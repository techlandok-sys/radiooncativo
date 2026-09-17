# Panel de banner - Techland

Este proyecto tiene:
- `admin.html` → panel para subir la imagen del banner y el link, protegido por contraseña.
- `api/banner.js` → guarda y devuelve el banner actual (imagen + link) usando Vercel Blob.

Más adelante se suma acá mismo `api/instagram.js` para el feed de Instagram.

## Cómo desplegar (una sola vez)

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los archivos desde la web de GitHub, "Add file → Upload files", sin necesidad de usar git por consola).
2. Entrá a vercel.com, iniciá sesión (podés usar tu cuenta de GitHub), y hacé "Add New Project" → importá ese repositorio.
3. Antes de desplegar, andá a la sección "Environment Variables" del proyecto y agregá:
   - `ADMIN_PASSWORD` = la contraseña del panel (la misma que uses en admin.html)
4. En el mismo proyecto de Vercel, andá a la pestaña "Storage" → "Create Database" → elegí "Blob" → conectala al proyecto (es gratis, plan Hobby).
5. Hacé click en "Deploy". Vercel te va a dar una URL tipo `https://techland-panel-xxxx.vercel.app`.

## Después de desplegar

1. Abrí `admin.html`, buscá la línea:
   ```js
   const API_BASE = "";
   ```
   y poné ahí tu URL de Vercel, por ejemplo:
   ```js
   const API_BASE = "https://techland-panel-xxxx.vercel.app";
   ```
2. En tu `index.html` principal (el del sitio de la radio), buscá:
   ```js
   const BANNER_API_BASE = "";
   ```
   y poné la misma URL ahí.
3. Volvé a subir ambos archivos (admin.html actualizado a Vercel/GitHub, e index.html actualizado a tu hosting actual).
4. Entrá a `https://tu-url.vercel.app/admin.html`, poné la contraseña, subí la imagen y el link, y guardá.
5. Refrescá tu sitio principal — el banner debería aparecer solo.

Cualquier vez que quieras cambiar el banner, entrás de nuevo a `/admin.html`, subís la nueva imagen y listo, no hace falta tocar código.
