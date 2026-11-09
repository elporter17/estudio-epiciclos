-- Programación de Potter Play en Supabase (proyecto «potter-play»), 2026-11-09. Se corre una vez en el SQL Editor.
-- Es la fuente de la verdad de lo que sale y cuándo: el relojero, el panel y el bot leen «programacion»; si Supabase
-- no responde, usan el horario de respaldo de scripts/lib/horario.mjs. Todo con RLS y sin políticas: solo entra la
-- service role (Vercel) o /api/datos (GitHub Actions).

-- Un renglón por envío: a qué hora, qué pieza y a qué redes (true/false). Se edita en el bot («🗓️ Programación»)
-- o aquí en el Table Editor.
--   pieza   banderas, retos, video3d1, comosehace… (scripts/lib/horario.mjs: PIEZAS y EXTRAS)
--   dias    días de la semana (0 = domingo … 6 = sábado); vacío = todos
--   fecha   solo ese día · desde / hasta: a partir de / hasta ese día
--   inputs  entradas extra para el workflow (por ejemplo {"lanzamiento": "true"})
create table if not exists public.programacion (
  id bigint generated always as identity primary key,
  hora text not null check (hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  pieza text not null,
  fb boolean not null default false,
  ig boolean not null default false,
  tt boolean not null default false,
  yt boolean not null default false,
  dias int[],
  fecha date,
  desde date,
  hasta date,
  inputs jsonb,
  activo boolean not null default true,
  nota text,
  creada timestamptz not null default now(),
  cambiada timestamptz not null default now()
);

-- Cambios de un solo día que mandas al bot (quitar, mover, pausar, noticias fuera o fijas…). clave = la fecha
create table if not exists public.cambios (
  id bigint generated always as identity primary key,
  clave text not null,
  op jsonb not null,
  creado timestamptz not null default now()
);
create index if not exists cambios_clave on public.cambios (clave);

-- Todo lo que de verdad se publicó, por red. «huella» = sha256 del archivo (o de las imágenes): antes de publicar se
-- revisa que esa misma huella no haya salido ya en esa red (así no hay duplicados), salvo un reenvío que pides tú
create table if not exists public.envios (
  id bigint generated always as identity primary key,
  red text not null check (red in ('fb', 'ig', 'tt', 'yt')),
  huella text,
  tipo text,
  titulo text,
  post_id text,
  url text,
  workflow text,
  run_id text,
  reenvio boolean not null default false,
  vistas int,
  vistas_al timestamptz,
  creado timestamptz not null default now()
);
create index if not exists envios_red_huella on public.envios (red, huella);
create index if not exists envios_creado on public.envios (creado);

-- Cada video generado: de dónde se baja (el artefacto de su corrida de GitHub, 30 días) y sus vistas por red
create table if not exists public.videos (
  id bigint generated always as identity primary key,
  huella text not null unique,
  formato text,
  titulo text,
  descripcion text,
  run_id text,
  artefacto text,
  archivo text,
  meta jsonb,
  vistas jsonb not null default '{}',
  vistas_total int not null default 0,
  vistas_al timestamptz,
  creado timestamptz not null default now()
);
create index if not exists videos_creado on public.videos (creado);

alter table public.programacion enable row level security;
alter table public.cambios enable row level security;
alter table public.envios enable row level security;
alter table public.videos enable row level security;
