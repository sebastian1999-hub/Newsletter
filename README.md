# Newsletter del piso (Supabase)

Web estilo periodico para compartir noticias del piso:
- Visitantes: solo pueden leer publicaciones.
- Admin unico: puede iniciar sesion y publicar desde el panel `Admin`.
- Cada noticia puede incluir una foto opcional subida a Supabase Storage.

## 1) Configurar Supabase

1. Entra en SQL Editor de Supabase.
2. Ejecuta el contenido de `supabase.sql`.
3. Crea el usuario admin en Authentication -> Users (email/password), por ejemplo `admin@rsp.com`.
4. Si cambias el email admin, cambia tambien:
   - `app.js` en `ADMIN_EMAIL`.
   - `supabase.sql` en la policy `Only admin can insert`.

## 2) Configurar credenciales en front

Edita `app.js`:

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xNazlHkI4DFI175UfCRt5Q_-EXtNKkL";
const ADMIN_EMAIL = "admin@rsp.com";
```

Importante: falta poner tu `SUPABASE_URL` real del proyecto.

## 3) Ejecutar en local

Como es web estatica, puedes abrir `index.html` directamente o servirla localmente con un servidor simple.

Ejemplo con Node:

```bash
npx serve .
```

## 4) Uso

1. Pulsa `Admin`.
2. Inicia sesion con el usuario admin.
3. Completa titular, entradilla y contenido.
4. (Opcional) Selecciona una foto.
5. Pulsa `Publicar noticia`.

Los visitantes veran los posts sin necesidad de login.
