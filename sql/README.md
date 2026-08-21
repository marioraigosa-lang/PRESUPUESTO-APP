# Scripts SQL de Seed App

Scripts para ejecutar A MANO en el editor SQL de Supabase (no hay CLI de
Supabase ni carpeta `migrations/` con timestamps en este proyecto). Ya están
ejecutados en el proyecto de Supabase real; se guardan aquí solo como
historial versionado de cómo llegó a su forma actual el esquema de la base
de datos.

No los renombramos (para no perder el nombre descriptivo de cada uno, que
además varios scripts se referencian entre sí POR ESE NOMBRE en sus propios
comentarios). Este README documenta el orden en el que se aplicaron.

## Cómo se reconstruyó el orden

Ninguno tiene fecha en el nombre. El orden de abajo se reconstruyó leyendo
las referencias cruzadas que cada script hace a los demás en sus propios
comentarios (ej. "la columna user_id, agregada en supabase_etapa2_usuarios.sql")
y qué tablas/columnas asume que ya existen. Tres scripts traen en su propio
encabezado la advertencia **"BORRADOR — NO EJECUTAR TODAVÍA"**, pero la
funcionalidad que agregan ya está viva en la app (multi-idioma, categorías
`es_sistema`, traslados entre cuentas) — lo más probable es que sí se hayan
ejecutado más adelante sin que alguien actualizara ese comentario. Se marcan
igual abajo para que quede claro de dónde salió la duda.

## Orden de ejecución

**Base de la app (mono-usuario, antes del login)**
1. `supabase_setup.sql` — crea las tablas base (cuentas, movimientos, gastos_fijos, categorias, fondo_emergencia) y la extensión `pgcrypto`.
2. `supabase_permisos_dev.sql` — ⚠️ solo dev: permisos amplios al rol `anon` sobre esas 5 tablas.
3. `supabase_gastofijo_movimiento.sql` — agrega `gasto_fijo_id` a movimientos + índice único + categoría "Gastos fijos", para que pagar un gasto fijo cree un movimiento real.
4. `supabase_cambios_metas.sql` — agrega `es_ahorro` a cuentas y crea la tabla `metas_ahorro`.

**Multiusuario (Etapas 1→3: login + aislamiento de datos)**
5. `supabase_etapa2_usuarios.sql` — Etapa 2: agrega `user_id` a las 6 tablas + trigger `handle_new_user` (categorías y fondo de emergencia por defecto al registrarse).
6. `supabase_permisos_auth_dev.sql` — ⚠️ solo dev: le da al rol `authenticated` (ya con login) los mismos permisos amplios que tenía `anon`.
7. `supabase_etapa3_rls.sql` — Etapa 3: políticas RLS reales (`auth.uid() = user_id`) que reemplazan los permisos amplios de desarrollo.

**Perfil de usuario (moneda / idioma)**
8. `supabase_moneda_perfiles.sql` — crea la tabla `perfiles` con la moneda (COP/USD/EUR) elegida por cada usuario.
9. `supabase_fix_perfiles_grant.sql` — corrige un GRANT faltante en `perfiles` que bloqueaba actualizar la moneda desde Perfil.
10. `supabase_idioma_perfiles.sql` *(⚠️ encabezado dice "borrador, no ejecutar todavía")* — agrega la columna `idioma` a `perfiles` (soporte es/en).
11. `supabase_categorias_default.sql` *(⚠️ mismo aviso de borrador)* — nueva lista de categorías por defecto según el idioma + columna `es_sistema` para identificar la categoría protegida sin depender de su nombre.

**Evolución de gastos fijos y metas**
12. `supabase_indice_mensual.sql` — reemplaza el índice único de `gasto_fijo_id` para permitir pagar un gasto fijo una vez POR MES (antes era una sola vez en toda su vida).
13. `supabase_meta_plazo.sql` — agrega el plazo en meses a las metas de ahorro.
14. `supabase_meta_fecha.sql` — reemplaza ese plazo por una fecha objetivo real (mes y año).

**Traslados entre cuentas**
15. `supabase_traslados.sql` *(⚠️ mismo aviso de borrador)* — agrega `'traslado'` como tipo válido de movimiento + `cuenta_destino_id`.

**Planifica tus viajes (Fases 1-3)**
16. `supabase_viajes.sql` — Fase 1: tabla `viajes`.
17. `supabase_categorias_viaje.sql` — Fase 2: tabla `categorias_viaje`.
18. `supabase_gastos_viaje.sql` — Fase 3: tabla `gastos_viaje`.

**Guía de uso (Fase 3: bienvenida)**
19. `supabase_guia_vista.sql` *(pendiente de ejecutar — en revisión)* — agrega `guia_vista` a `perfiles` para mostrar la guía de bienvenida solo la primera vez, con backfill a `true` para los usuarios existentes.

**Constancia de consentimiento (Ley 1581 de Colombia)**
20. `supabase_consentimientos.sql` *(⚠️ borrador, no ejecutar todavía — pendiente de revisión)* — crea la tabla `consentimientos` (historial append-only, sin UPDATE/DELETE desde la app) para guardar constancia de que el usuario aceptó la Política de Datos, los Términos de Uso y declaró ser mayor de edad, con fecha y versión de cada documento. Extiende `handle_new_user` para registrar el consentimiento dado en el registro; NO hace backfill retroactivo para usuarios existentes (queda para un gate de re-consentimiento en el código, aparte).

## Si agregas un script nuevo

Nómbralo `supabase_<algo_descriptivo>.sql` (mismo estilo que los de arriba) y
agrégalo al final de esta lista con una línea de qué hace.
