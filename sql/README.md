# Scripts SQL de Seed App

Scripts para ejecutar A MANO en el editor SQL de Supabase (no hay CLI de
Supabase ni carpeta `migrations/` con timestamps en este proyecto). Se
guardan aquí como historial versionado de cómo llegó a su forma actual el
esquema de la base de datos.

No los renombramos (para no perder el nombre descriptivo de cada uno, que
además varios scripts se referencian entre sí POR ESE NOMBRE en sus propios
comentarios). Este README documenta el orden en el que se aplicaron y, sobre
todo, **el estado real de cada uno**.

## ⚠️ NOTA DE BUENA PRÁCTICA — leer antes de dar por aplicado un script

**Antes de dar por aplicado un script, verificá contra la base de datos
REAL** (por ejemplo: consultá la definición del trigger con
`pg_get_functiondef`, o las columnas reales con `information_schema.columns`
— ver `supabase_verificar_trigger.sql`). **No confíes solo en este README.**

Lección aprendida (2026-08-27): este README daba por "ejecutados" varios
scripts que en realidad **nunca se aplicaron en producción** (o se aplicó
una versión vieja). En concreto, la versión de `handle_new_user()` que
estaba viva en Supabase era la vieja de `supabase_consentimientos.sql`
(INSERT de categorías con 4 columnas, sin `es_sistema`, lista de categorías
antigua), no la de `supabase_categorias_default.sql` que el README daba por
corriendo. Resultado: toda cuenta nueva nacía con "Gastos fijos" en
`es_sistema = false`, lo que rompía marcar gastos fijos como pagados. El bug
se descubrió recién al consultar el trigger real. Este README ya está
corregido, pero la regla queda: **la fuente de verdad es la base de datos,
no este archivo.**

## Leyenda de estado

| Marca | Significado |
|-------|-------------|
| ✅ **APLICADO** | Confirmado en la base de datos real, o la funcionalidad que agrega está viva y no puede funcionar sin él. |
| ⚠️ **VERIFICAR** | Muy probablemente aplicado (la funcionalidad existe en la app), pero no se confirmó columna por columna contra la BD. Verificá antes de asumir. |
| ❌ **NO APLICADO / REEMPLAZADO** | No se corrió en producción, o quedó obsoleto porque otro script posterior hace su trabajo. |
| 🔍 **DIAGNÓSTICO** | Solo lectura, no cambia el esquema. No forma parte del historial numerado. |

> Varios scripts traen en su propio encabezado la advertencia
> **"BORRADOR — NO EJECUTAR TODAVÍA"** o **"REVISAR ANTES DE EJECUTAR"**. Ese
> texto está **desactualizado** en la mayoría de los casos: la marca de
> estado de este README es la que vale. (Los encabezados de los `.sql` no se
> tocaron en esta corrección para no mezclar cambios de documentación con
> cambios de scripts; si te confunde, mirá este README.)

## Cómo se reconstruyó el orden

Ninguno tiene fecha en el nombre. El orden de abajo se reconstruyó leyendo
las referencias cruzadas que cada script hace a los demás en sus propios
comentarios (ej. "la columna user_id, agregada en supabase_etapa2_usuarios.sql")
y qué tablas/columnas asume que ya existen.

## Orden de ejecución

**Base de la app (mono-usuario, antes del login)**
1. ✅ `supabase_setup.sql` — crea las tablas base (cuentas, movimientos, gastos_fijos, categorias, fondo_emergencia) y la extensión `pgcrypto`.
2. ✅ `supabase_permisos_dev.sql` — ⚠️ solo dev: permisos amplios al rol `anon` sobre esas 5 tablas. (Reemplazado luego por RLS real en el paso 7, pero se corrió en su momento.)
3. ✅ `supabase_gastofijo_movimiento.sql` — agrega `gasto_fijo_id` a movimientos + índice único + categoría "Gastos fijos", para que pagar un gasto fijo cree un movimiento real.
4. ✅ `supabase_cambios_metas.sql` — agrega `es_ahorro` a cuentas y crea la tabla `metas_ahorro`.

**Multiusuario (Etapas 1→3: login + aislamiento de datos)**
5. ✅ `supabase_etapa2_usuarios.sql` — Etapa 2: agrega `user_id` a las 6 tablas + primera versión del trigger `handle_new_user` (categorías y fondo de emergencia por defecto al registrarse). **Esta versión del trigger ya NO es la vigente** — ver paso 20.
6. ✅ `supabase_permisos_auth_dev.sql` — ⚠️ solo dev: le da al rol `authenticated` (ya con login) los mismos permisos amplios que tenía `anon`.
7. ✅ `supabase_etapa3_rls.sql` — Etapa 3: políticas RLS reales (`auth.uid() = user_id`) que reemplazan los permisos amplios de desarrollo.

**Perfil de usuario (moneda / idioma)**
8. ✅ `supabase_moneda_perfiles.sql` — crea la tabla `perfiles` con la moneda (COP/USD/EUR) elegida por cada usuario. (La app no podría guardar la moneda sin esto.)
9. ✅ `supabase_fix_perfiles_grant.sql` — corrige un GRANT faltante en `perfiles` que bloqueaba actualizar la moneda desde Perfil.
10. ✅ `supabase_idioma_perfiles.sql` — agrega la columna `idioma` a `perfiles` (soporte es/en). El multi-idioma está vivo en la app, así que la columna existe. *(Su encabezado todavía dice "borrador, no ejecutar" — ignorar.)*
11. ❌ `supabase_categorias_default.sql` — **NUNCA se aplicó en producción tal cual.** Definía la lista nueva de categorías por defecto + columnas `es_sistema` / `descripcion` + una versión del trigger con 6 columnas. Las **columnas** `es_sistema` y `descripcion` sí terminaron existiendo (las re-crea el paso 20 con `add column if not exists`), pero la **versión del trigger de este script nunca quedó activa**: el trigger real siguió siendo el viejo hasta el paso 20. Su contenido de categorías fue absorbido por `supabase_fix_trigger_categorias.sql` (paso 20).

**Evolución de gastos fijos y metas**
12. ✅ `supabase_indice_mensual.sql` — reemplaza el índice único de `gasto_fijo_id` para permitir pagar un gasto fijo una vez POR MES (antes era una sola vez en toda su vida).
13. ✅ `supabase_meta_plazo.sql` — agrega el plazo en meses a las metas de ahorro.
14. ✅ `supabase_meta_fecha.sql` — reemplaza ese plazo por una fecha objetivo real (mes y año).

**Traslados entre cuentas**
15. ✅ `supabase_traslados.sql` — agrega `'traslado'` como tipo válido de movimiento + `cuenta_destino_id`. Los traslados funcionan en la app, así que se aplicó. *(Encabezado dice "borrador" — ignorar.)*

**Planifica tus viajes (Fases 1-3)**
16. ✅ `supabase_viajes.sql` — Fase 1: tabla `viajes`.
17. ✅ `supabase_categorias_viaje.sql` — Fase 2: tabla `categorias_viaje`.
18. ✅ `supabase_gastos_viaje.sql` — Fase 3: tabla `gastos_viaje`.

**Guía de uso (Fase 3: bienvenida)**
19. ⚠️ `supabase_guia_vista.sql` — agrega `guia_vista` a `perfiles` para mostrar la guía de bienvenida solo la primera vez, con backfill a `true` para los usuarios existentes. La guía de bienvenida existe en la app; **verificá que la columna `guia_vista` esté en `perfiles`** antes de asumir que corrió (ver `supabase_verificar_trigger.sql`).

**Constancia de consentimiento (Ley 1581 de Colombia)**
20. ⚠️/✅ `supabase_consentimientos.sql` — crea la tabla `consentimientos` (historial append-only, sin UPDATE/DELETE desde la app) para guardar constancia de que el usuario aceptó la Política de Datos, los Términos de Uso y declaró ser mayor de edad, con fecha y versión de cada documento. **El bloque de tabla + RLS + grants + la extensión de `handle_new_user` para registrar consentimientos SÍ está activo hoy.** El problema fue que esta versión del trigger traía el INSERT de categorías VIEJO (4 columnas, sin `es_sistema`, lista antigua) y **esa fue la versión que quedó viva en Supabase** hasta el paso 21 — de ahí salió el bug de `es_sistema`. NO hace backfill retroactivo de consentimientos para usuarios existentes (queda para un gate de re-consentimiento en el código, aparte).

**Corrección del trigger (bug de `es_sistema`)**
21. ✅ **`supabase_fix_trigger_categorias.sql` — ESTE es el que dejó `handle_new_user()` en su versión CORRECTA y VIGENTE hoy (2026-08-27).** Reemplaza la versión rota que había quedado del paso 20. En 2 partes:
    - **Parte 1** — `create or replace` de `handle_new_user()` combinando: el INSERT de categorías correcto (6 columnas, `es_sistema`, lista nueva, es/en) que `supabase_categorias_default.sql` nunca llegó a activar + el bloque de consentimientos del paso 20 (intacto) + fondo de emergencia y perfiles (sin cambios). También re-declara `categorias.es_sistema` y `categorias.descripcion` con `add column if not exists` como red de seguridad.
    - **Parte 2** — backfill: `update ... set es_sistema = true` en las categorías existentes que se llaman `'Gastos fijos'` / `'Fixed expenses'`. Solo toca esa bandera boolean; no cambia la lista de categorías vieja de las cuentas ya creadas.
    - *(Su encabezado todavía dice "NO EJECUTAR TODAVÍA" — está desactualizado, este script YA se aplicó y es el vigente.)*

## Scripts fuera del historial numerado

- ❌ `supabase_reparar_usuarios.sql` — **NO aplicado / reemplazado.** Era otro intento de dejar `handle_new_user()` completo + backfill de usuarios incompletos. Quedó obsoleto: `supabase_fix_trigger_categorias.sql` (paso 21) hace este trabajo con un diagnóstico más preciso (se confirmó el trigger real antes de escribirlo). No correr; usar el paso 21.
- ⚠️ `supabase_reforzar_integridad.sql` — auditoría de seguridad (Grupo A): agrega CHECK constraints a columnas de dinero + refuerza RLS de UPDATE/DELETE en `categorias` para blindar la categoría de sistema desde la API directa. Committeado 2026-08-17. **Verificá contra la BD si los CHECK y las políticas nuevas están puestos** antes de asumir que corrió.
- 🔍 `supabase_verificar_trigger.sql` — **solo lectura.** Consulta de diagnóstico: columnas de `perfiles` y `categorias`, y definición actual de `handle_new_user()`. Corré esto en Supabase → SQL Editor para confirmar el estado real (es exactamente la verificación que pide la nota de buena práctica de arriba).

## Si agregas un script nuevo

1. Nómbralo `supabase_<algo_descriptivo>.sql` (mismo estilo que los de arriba).
2. Agrégalo a la lista de arriba con una línea de qué hace.
3. **Cuando confirmes que lo corriste en Supabase, marcalo ✅ y anotá cómo lo
   verificaste** (qué consulta corriste contra la BD). Si todavía no lo
   aplicaste, marcalo ⚠️ o ❌ — no lo des por hecho.
