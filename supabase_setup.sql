-- ============================================================
-- 0. Extensión necesaria para generar IDs únicos (UUID)
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- 1. Tabla: cuentas
-- ============================================================
create table if not exists cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text,
  color text,
  inicial text,
  saldo numeric(14, 2) not null default 0,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 2. Tabla: categorias
-- ============================================================
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  emoji text,
  color text,
  presupuesto numeric(14, 2) not null default 0,
  gastado numeric(14, 2) not null default 0
);

-- ============================================================
-- 3. Tabla: movimientos
--    (referencia a cuentas y a categorias)
-- ============================================================
create table if not exists movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  descripcion text not null,
  monto numeric(14, 2) not null,
  emoji text,
  cuenta_id uuid references cuentas(id) on delete set null,
  categoria_id uuid references categorias(id) on delete set null,
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 4. Tabla: gastos_fijos
-- ============================================================
create table if not exists gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto numeric(14, 2) not null,
  dia_pago integer not null check (dia_pago between 1 and 31),
  pagado boolean not null default false
);

-- ============================================================
-- 5. Tabla: fondo_emergencia
-- ============================================================
create table if not exists fondo_emergencia (
  id uuid primary key default gen_random_uuid(),
  monto_actual numeric(14, 2) not null default 0,
  meses_meta integer not null default 0
);

-- ============================================================
-- 6. Datos de ejemplo (los mismos que ya usa la app)
-- ============================================================

-- Cuentas
insert into cuentas (nombre, tipo, color, inicial, saldo) values
('Nu',            'Cuenta + Cajitas', '#9b8cf0', 'N', 15932682),
('Bancolombia',   'Cuenta ahorros',   '#e9b949', 'B', 10014924),
('Trii',          'Fondo Acc. Din.',  '#5aa9e6', 'T', 2572269),
('CDT Occidente', 'Vence dic 2025',   '#4fd1a5', 'C', 5000000),
('Efectivo',      'Billetera',        '#f2795b', 'E', 250000);

-- Categorías
insert into categorias (nombre, emoji, color, presupuesto, gastado) values
('Mercado',  '🛒', '#4fd1a5', 400000, 120000),
('Gasolina', '⛽', '#9b8cf0', 160000, 136000),
('Salud',    '💊', '#5aa9e6', 120000, 0),
('Ocio',     '🎬', '#e9b949', 150000, 180000),
('Varios',   '✨', '#e07ba0', 200000, 95000);

-- Movimientos (usamos subconsultas para enlazar cada uno con su cuenta y categoría)
insert into movimientos (tipo, descripcion, monto, emoji, cuenta_id, categoria_id, fecha) values
('ingreso', 'Sueldo — Quincena II', 3195000, '💰',
  (select id from cuentas where nombre = 'Bancolombia'), null, '2026-03-01'),
('gasto', 'Mercado', 120000, '🛒',
  (select id from cuentas where nombre = 'Nu'),
  (select id from categorias where nombre = 'Mercado'), '2026-03-05'),
('gasto', 'Gasolina', 136000, '⛽',
  (select id from cuentas where nombre = 'Efectivo'),
  (select id from categorias where nombre = 'Gasolina'), '2026-03-06'),
('gasto', 'Cine con amigos', 45000, '🎬',
  (select id from cuentas where nombre = 'Nu'),
  (select id from categorias where nombre = 'Ocio'), '2026-03-08'),
('gasto', 'Farmacia', 32000, '💊',
  (select id from cuentas where nombre = 'Bancolombia'),
  (select id from categorias where nombre = 'Salud'), '2026-03-09');

-- Gastos fijos
insert into gastos_fijos (nombre, monto, dia_pago, pagado) values
('Arriendo',      875000, 2,  true),
('Servicios',     263607, 8,  true),
('Cuota TC',      400000, 15, false),
('Internet',      78000,  10, false),
('Plan celular',  53000,  12, false);

-- Fondo de emergencia
insert into fondo_emergencia (monto_actual, meses_meta) values
(2100000, 6);
