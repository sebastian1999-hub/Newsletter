# Newsletter del piso (Supabase)

Web estilo periodico para compartir noticias del piso:
- Visitantes: pueden leer publicaciones.
- Usuarios con sesion: pueden comentar usando su perfil (nombre y foto).
- Cualquier usuario puede iniciar sesion desde la pagina de login y editar su perfil.
- Admin unico: ve la pestana `Publicar` y puede subir noticias.
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

## 2.1) Crear tabla de comentarios

Si todavia no la tienes en Supabase, ejecuta este SQL:

```sql
create table if not exists public.comments (
   id bigint generated always as identity primary key,
   post_id bigint not null references public.posts(id) on delete cascade,
   author_user_id uuid,
   author_name text not null,
   author_avatar_url text,
   content text not null,
   created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy if not exists "Anyone can read comments"
on public.comments for select
to anon, authenticated
using (true);

create policy if not exists "Anyone can insert comments"
on public.comments for insert
to anon, authenticated
with check (
   length(trim(author_name)) > 0
   and length(trim(content)) > 0
);
```

## 3) Ejecutar en local

Como es web estatica, puedes abrir `index.html` directamente o servirla localmente con un servidor simple.

Ejemplo con Node:

```bash
npx serve .
```

## 4) Uso

1. En `Iniciar sesion` entra con tu usuario.
2. Desde `Perfil` puedes cambiar tu nombre visible y tu foto redonda.
3. En `Inicio` puedes comentar y el sistema usara automaticamente tu nombre y foto de perfil.
4. Si eres admin (`ADMIN_EMAIL`), aparecera la pestana `Publicar`.
5. Completa titular, entradilla y contenido.
6. (Opcional) Selecciona una foto y pulsa `Publicar noticia`.

## 5) Storage necesario

- Bucket `post-images` para fotos de noticias.
- Bucket `profile-images` para fotos de perfil.

Los visitantes veran los posts sin necesidad de login.
