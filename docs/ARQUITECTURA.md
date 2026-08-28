# Documentación técnica / de arquitectura — Seed

Este documento explica cómo está construida la app por dentro: stack, arquitectura, estructura de carpetas, base de datos, seguridad, i18n/moneda, PWA, despliegue, decisiones técnicas y testing. Está pensado para que un desarrollador (o cualquier persona que revise el código) entienda el proyecto sin tener que leerlo entero de cero.

Se construyó leyendo el código real (`package.json`, `vite.config.js`, `src/`, `sql/`, `supabase/functions/`) al 2026-08-27, no supuestos. No contiene secretos, llaves ni valores reales de variables de entorno — solo sus nombres.

---

## 1. Resumen del proyecto

**Seed** ("Tus finanzas sanas, crecen contigo") es una aplicación web de finanzas personales, instalable como PWA, pensada para un usuario individual que quiere:

- Registrar sus cuentas (bancos, efectivo, inversiones) y ver su saldo total.
- Registrar movimientos (ingresos, gastos, traslados entre cuentas propias).
- Controlar gastos fijos mensuales (arriendo, servicios, etc.) y gastos variables por categoría con presupuesto.
- Mantener un fondo de emergencia y metas de ahorro con fecha objetivo.
- Ver un resumen mensual/anual con gráfico y desglose por categoría.
- Planificar viajes con presupuesto por categoría y gastos multi-moneda.
- Usar la app en español o inglés, y en pesos colombianos (COP), dólares (USD) o euros (EUR).

Es una aplicación multiusuario con autenticación real (Supabase Auth), aislamiento de datos por usuario a nivel de base de datos (RLS), soporte de 2FA (TOTP), y cumplimiento de la Ley 1581 de 2012 de Colombia (consentimiento informado para tratamiento de datos personales).

---

## 2. Stack tecnológico

Versiones exactas tomadas de `package.json` (con "el rol de cada una" explicado, no solo el nombre):

### Dependencias de producción

| Paquete | Versión | Rol |
|---|---|---|
| `react` / `react-dom` | ^19.2.7 | Librería de UI. Toda la app es un árbol de componentes funcionales con hooks — no hay clases. |
| `@supabase/supabase-js` | ^2.110.7 | Cliente único hacia Supabase: autenticación (`supabase.auth`, incluida MFA), base de datos Postgres vía PostgREST (`supabase.from(...)`), y la Edge Function de eliminar cuenta (`supabase.functions.invoke`). |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.3 | Utilidades CSS. Tailwind v4 es "CSS-first": no hay `tailwind.config.js` — el tema (colores, fuente) se declara con `@theme` directamente en CSS, y el plugin de Vite lo integra sin PostCSS aparte. |
| `lucide-react` | ^1.31.0 | Librería de íconos SVG usada en toda la interfaz (`src/components/ui/Icono.jsx` la envuelve). |
| `@fontsource-variable/plus-jakarta-sans` | ^5.3.0 | Fuente tipográfica variable (Plus Jakarta Sans), empaquetada como parte del build en vez de cargarse desde un CDN externo — funciona sin conexión, alineado con el enfoque PWA. |

### Dependencias de desarrollo

| Paquete | Versión | Rol |
|---|---|---|
| `vite` | ^8.1.1 | Bundler y servidor de desarrollo. |
| `@vitejs/plugin-react` | ^6.0.3 | Integra React con Vite (Fast Refresh, JSX vía Oxc). |
| `vite-plugin-pwa` | ^1.3.0 | Genera el manifest, el service worker y el registro automático de actualización — ver sección 8. |
| `vitest` | ^4.1.10 | Motor de pruebas (compatible con la API de Jest, corre sobre el mismo Vite). |
| `oxlint` | ^1.71.0 | Linter (reemplazo rápido de ESLint basado en Oxc, escrito en Rust). |
| `sharp` | ^0.35.3 | Procesamiento de imágenes, usado por `scripts/generar-iconos-pwa.mjs` para generar los íconos PWA en distintos tamaños a partir de un source. |
| `@types/react`, `@types/react-dom` | ^19.x | Tipos para autocompletado en el editor (el proyecto es JS, no TypeScript, salvo la Edge Function). |

### No usado (y por qué es notable)

- **No hay `react-router` ni ningún router**: la navegación entre pantallas es un `useState` (`vista`) en `App.jsx` con render condicional — ver sección 3.
- **No hay Redux/Zustand/otro gestor de estado global**: el estado se reparte entre Context API (sesión, moneda, idioma, guía) y estado local de `App.jsx`/cada vista.
- **No hay ORM**: las consultas van directo contra PostgREST vía el cliente de `supabase-js`, envueltas por el helper `useDatosUsuario` (sección 3).

---

## 3. Arquitectura general

### 3.1 SPA + Supabase como backend completo

Seed es una **Single Page Application** sin servidor propio: el "backend" es enteramente **Supabase**, que provee:

- **Postgres** como base de datos (tablas, RLS, triggers).
- **Supabase Auth** para registro/login/sesión/2FA.
- **Edge Functions** (Deno) para la única operación que necesita privilegios de administrador: eliminar una cuenta (sección 6).

El cliente de React se conecta directo a Supabase con la `anon key` (pública, protegida por RLS) desde `src/lib/supabase.js`. No existe una capa de API intermedia propia.

### 3.2 Patrón de servicios (`src/services/`)

Cada dominio de negocio (cuentas, categorías, movimientos, gastos fijos, viajes, categorías de viaje, gastos de viaje, consentimientos) tiene un archivo de servicio con **funciones puras async, sin estado de React**: reciben los datos que necesitan como parámetros (incluido el helper `datosUsuario`) y devuelven resultados o lanzan errores. `App.jsx` (o la vista dueña del estado, como `Viajes.jsx`) sigue siendo quien mantiene el `useState` y aplica el resultado.

Patrón repetido en varios servicios (`movimientos.js`, `gastosFijos.js`): operaciones que tocan **más de una tabla o más de un saldo** (traslados, marcar/desmarcar gasto fijo pagado) usan banderas (`origenActualizado`, `movimientoCreado`, etc.) para **revertir en orden inverso** cualquier paso ya aplicado si un paso posterior falla — una forma manual de "transacción" del lado del cliente, ya que PostgREST no expone transacciones multi-tabla al cliente.

### 3.3 Contextos (`src/context/`)

Cuatro contextos, todos con el mismo patrón ("leer una vez por sesión desde Supabase, exponer a toda la app"):

- **`AuthContext`**: dueño de la sesión (`sesion`, `usuario`), y de tres señales derivadas que controlan la cascada de `App.jsx` (3.5): `recuperacion` (flujo de restablecer contraseña), `requiereVerificacionMfa` (AAL1 con 2FA pendiente), `requiereConsentimiento` (Ley 1581). También expone `factoresMfa`/`tieneMfaActivo`/`refrescarMfa` y `refrescarConsentimiento`.
- **`MonedaContext`**: lee `perfiles.moneda`, expone `moneda`, `cambiarMoneda()` y el hook derivado `useFormatoMoneda()`.
- **`IdiomaContext`**: lee `perfiles.idioma`, expone `t()`/`tp()` (traducir singular/plural). **No expone función de cambio** — el idioma se elige una sola vez en el registro (ver sección 7).
- **`GuiaContext`**: lee `perfiles.guia_vista`, controla si se muestra el overlay de bienvenida.

Los tres últimos dependen de `AuthContext` (`useAuth()` por dentro) y de `useDatosUsuario()` para leer de `perfiles`.

### 3.4 Hooks y utils de cálculo

- **`useConsulta`** (`src/hooks/useConsulta.js`): centraliza el patrón "cargando / error / datos / recargar" que se repetía a mano en cada pantalla. Usa un `ref` para no reejecutar la consulta en cada render, y descarta resultados de consultas obsoletas si las dependencias cambian antes de que respondan (evita condiciones de carrera al cambiar de filtro rápido).
- **`src/utils/`** concentra la lógica de cálculo **pura** (sin llamadas a Supabase ni JSX), lo que la hace testeable sin mocks: `resumenCalculos.js`, `resumenViaje.js`, `proyeccionMeta.js`, `gastoMensualPromedio.js`, `mensajeFondo.js`, `formatoFecha.js`, `formatoPeriodo.js`, `formatoMoneda.js`, `fortalezaContrasena.js`, `factoresMfa.js`, `consentimientos.js`. Cada una de estas tiene su `*.test.js` hermano (sección 11).

### 3.5 Flujo de datos: usuario → servicios → Supabase → RLS

```
Componente (vista)
   │  llama a una función de App.jsx (ej. agregarMovimiento)
   ▼
App.jsx (dueño del estado React: cuentas, categorias, ...)
   │  delega la lógica de negocio
   ▼
src/services/*.js (función pura async)
   │  usa el helper para construir la consulta
   ▼
useDatosUsuario() → seleccionarPropio / insertarPropio / actualizarPropio / eliminarPropio
   │  siempre agrega/filtra por user_id automáticamente
   ▼
supabase-js (PostgREST) ──HTTP──▶ Postgres (Supabase)
                                     │
                                     ▼
                          RLS: auth.uid() = user_id
                          (verificación real, no solo la de la app)
```

`useDatosUsuario()` (`src/lib/datosUsuario.js`) es la barrera **del lado de la app**: nunca deja que una consulta salga sin `.eq('user_id', ...)` o sin `user_id` en el payload de inserción. Esto **no reemplaza RLS** — es una segunda capa. La primera y definitiva es la política de Postgres (sección 5.2): aunque un bug de la app olvidara filtrar, RLS igual bloquearía el acceso a filas ajenas.

### 3.6 `App.jsx` como orquestador: la cascada de decisión de pantalla

No hay router: `App.jsx` decide **qué mostrar** con una cadena de `if` evaluados en orden estricto, cada uno devolviendo un componente distinto en vez de la app:

```
1. cargando (AuthContext todavía no resolvió la sesión)
       → pantalla "Cargando..."
2. recuperacion (llegó por un enlace de recuperación de contraseña,
   válido o vencido)
       → EstablecerNuevaContrasena
3. sesion && requiereVerificacionMfa (login válido pero AAL1,
   2FA pendiente de verificar)
       → VerificarMfa
4. !sesion
       → PantallaAuth (Login / Registro)
5. requiereConsentimiento (falta aceptar la versión vigente de algún
   documento legal)
       → PantallaConsentimiento
6. (todo lo anterior superado)
       → la app real: Home / GestionCuentas / GestionCategorias /
         GestionGastosFijos / Emergencia / Resumen / Viajes / Perfil,
         elegida por el estado local `vista` (useState, valores:
         'inicio' | 'cuentas' | 'categorias' | 'gastosFijos' |
         'emergencia' | 'resumen' | 'viajes' | 'mas')
```

El orden es intencional (documentado en comentarios de `App.jsx`): primero se confirma que el usuario es quien dice ser (pasos 2-3, identidad/2FA) y **solo después** se le pide aceptar los documentos legales a su nombre (paso 5). Dentro de la pantalla 6, la navegación entre pestañas (`NavegacionInferior.jsx`) es simplemente cambiar ese `useState` — no hay historial de navegador ni URLs por pantalla (salvo el `?tipo=...` que usa el enlace de recuperación de contraseña para señalizar el paso 2, leído en `AuthContext.jsx`).

Dentro del paso 6, `App.jsx` además:
- Carga `cuentas` y `categorias` una vez que la sesión pasa todos los gates (no antes — evita pedir datos que RLS bloquearía o que no hacen falta todavía).
- Resetea `vista` a `'inicio'` cuando cambia el `user_id` de la sesión (login de otro usuario), pero no cuando Supabase solo refresca el token en segundo plano.
- Mantiene `movimientosVersion` como un contador que se incrementa tras cualquier operación que afecte movimientos, usado como dependencia por las vistas que necesitan recargar (patrón "cache-busting" simple en vez de un sistema de invalidación más complejo).

---

## 4. Estructura de carpetas

```
saldo-app/
├── docs/                        Documentación (este archivo, FLUJOS.md)
├── sql/                         Historial versionado de scripts SQL (ver sección 5)
│   └── README.md                Orden de ejecución reconstruido de los scripts
├── supabase/
│   └── functions/
│       └── eliminar-cuenta/     Edge Function (Deno/TypeScript) — sección 6
├── scripts/
│   └── generar-iconos-pwa.mjs   Genera los íconos PWA con sharp a partir de un source
├── public/                      Íconos PWA ya generados, favicon
├── vite.config.js               Build, plugin PWA, plugin Tailwind
├── package.json
└── src/
    ├── main.jsx                 Punto de entrada: monta <App/> envuelta en los providers
    ├── App.jsx                  Orquestador: cascada de pantallas + estado de cuentas/categorías
    ├── views/                   Una pantalla completa por archivo (30 archivos)
    │   ├── Login.jsx, Registro.jsx, PantallaAuth.jsx       Autenticación
    │   ├── RecuperarContrasena.jsx, EstablecerNuevaContrasena.jsx
    │   ├── VerificarMfa.jsx, SeguridadPerfil.jsx           2FA
    │   ├── PantallaConsentimiento.jsx                      Gate Ley 1581
    │   ├── PoliticaDatos.jsx, TerminosCondiciones.jsx      Documentos legales
    │   ├── EliminarCuenta.jsx                              Borrado de cuenta
    │   ├── Home.jsx, GestionCuentas.jsx, GestionCategorias.jsx,
    │   │   GestionGastosFijos.jsx, Emergencia.jsx, Resumen.jsx
    │   ├── Perfil.jsx                                      Ajustes de cuenta
    │   ├── Viajes.jsx, DetalleViaje.jsx, ResumenViaje.jsx  Módulo de viajes
    │   ├── CalculadoraAhorro.jsx, CalculadoraCdt.jsx,
    │   │   CalculadoraCuotaCredito.jsx                     Las 3 calculadoras
    │   ├── GuiaUso.jsx                                     Guía de referencia
    │   └── Proximamente.jsx                                Placeholder genérico
    ├── components/               Piezas reutilizables entre vistas (~35 archivos)
    │   ├── ui/                   Primitivas de UI genéricas (Boton*, CampoTexto,
    │   │                         MedidorFortaleza, Icono, MensajeError, Tarjeta)
    │   ├── Hoja*.jsx              Formularios modales tipo "bottom sheet"
    │   │                         (HojaNuevoMovimiento, HojaCuenta, HojaCategoria, ...)
    │   ├── Tarjeta*.jsx           Tarjetas de resumen (TarjetaSaldo, TarjetaMeta, ...)
    │   └── ...                   NavegacionInferior, BotonAgregar, GuiaBienvenida,
    │                             AyudaContextual, DocumentoLegal, PasoCodigoMfa, etc.
    ├── context/                   AuthContext, MonedaContext, IdiomaContext, GuiaContext
    ├── services/                  Lógica de negocio pura por dominio (sección 3.2)
    │                             + un *.test.js por cada servicio
    ├── hooks/
    │   └── useConsulta.js         Hook genérico de carga de datos (sección 3.4)
    ├── lib/
    │   ├── supabase.js            Cliente único de supabase-js (lee las env vars)
    │   └── datosUsuario.js        Helper de filtrado/escritura por user_id
    ├── utils/                     Cálculo puro + formateo + validación (sección 3.4),
    │                             cada uno con su *.test.js
    ├── i18n/                      es.js, en.js (diccionarios) + index.js (traducir/traducirPlural)
    ├── data/                      ⚠️ Código muerto — ver sección 10
    └── constants/
        └── versionesLegales.js    Versión vigente de cada documento legal
```

---

## 5. Base de datos (Supabase / PostgreSQL)

No hay carpeta `migrations/` con timestamps ni CLI de Supabase en el flujo de trabajo: los cambios de esquema viven como scripts SQL sueltos en `sql/`, pensados para pegarse a mano en el editor SQL de Supabase, y `sql/README.md` documenta el orden reconstruido en que se aplicaron. Varios archivos indican "BORRADOR — NO EJECUTAR TODAVÍA" en su encabezado aunque la funcionalidad ya esté viva en producción (el propio README lo advierte); el caso más reciente y confirmado de esta discrepancia es el trigger `handle_new_user`, ver sección 10.

### 5.1 Tablas principales

| Tabla | Propósito | Columnas clave |
|---|---|---|
| `perfiles` | 1 fila por usuario (PK = `user_id`): preferencias. | `moneda` (COP/USD/EUR, check), `idioma` (es/en, check), `guia_vista` (boolean) |
| `cuentas` | Cuentas bancarias/efectivo/inversión del usuario. | `nombre`, `tipo`, `color`, `inicial`, `saldo numeric(14,2)`, `es_ahorro boolean` |
| `categorias` | Categorías de gasto (incluye la categoría protegida de sistema). | `nombre`, `emoji`, `color`, `presupuesto`, `descripcion`, `es_sistema boolean` (marca "Gastos fijos"/"Fixed expenses" sin depender del nombre) |
| `movimientos` | Ingresos, gastos y traslados. | `tipo` (check: ingreso/gasto/traslado), `monto`, `cuenta_id`, `cuenta_destino_id` (solo traslados), `categoria_id`, `gasto_fijo_id` (si viene de un gasto fijo pagado), `fecha` |
| `gastos_fijos` | Definición de un gasto recurrente mensual. | `nombre`, `monto`, `dia_pago` (1-31), `pagado` (flag global, ver nota de servicios) |
| `fondo_emergencia` | 1 fila por usuario (unique `user_id`). | `monto_actual`, `meses_meta` (check 1-12) |
| `metas_ahorro` | Metas de ahorro con fecha objetivo. | `nombre`, `monto_objetivo`, `fecha_objetivo` (reemplazó a `plazo_meses`, columna que sigue existiendo pero ya no se usa) |
| `viajes` | Un viaje planificado. | `nombre`, `adultos`, `ninos`, `fecha_desde/hasta`, `origen`, `destino` |
| `categorias_viaje` | Categorías de presupuesto dentro de un viaje. | `viaje_id`, `nombre`, `presupuesto`, `moneda` (propia, no hereda la del perfil) |
| `gastos_viaje` | Gastos puntuales de un viaje. | `viaje_id`, `categoria_viaje_id`, `monto`, `moneda` (propia de cada gasto) |
| `consentimientos` | Historial append-only de aceptación legal (Ley 1581). | `tipo` (check: politica_datos/terminos_uso/mayor_edad), `version`, `fecha` — sin política de UPDATE/DELETE, una fila nunca se edita |

### 5.2 Modelo de seguridad: RLS en todas las tablas

Las 11 tablas anteriores tienen **Row Level Security habilitado**, con el mismo patrón de 4 políticas por tabla para el rol `authenticated`:

```sql
seleccionar_propio_<tabla>  for select  using (auth.uid() = user_id)
insertar_propio_<tabla>     for insert  with check (auth.uid() = user_id)
actualizar_propio_<tabla>   for update  using (auth.uid() = user_id) with check (auth.uid() = user_id)
eliminar_propio_<tabla>     for delete  using (auth.uid() = user_id)
```

El `with check` de UPDATE es importante: no solo exige que la fila ya sea del usuario, sino que **siga siéndolo después** del cambio (nadie puede "regalar" una fila cambiándole el `user_id`).

Excepciones al patrón estándar:
- **`perfiles`**: sin política de INSERT ni DELETE para `authenticated` — el INSERT lo hace exclusivamente el trigger (`security definer`, se salta RLS), y no hay caso de uso para que un usuario borre su propio perfil.
- **`consentimientos`**: sin política de UPDATE ni DELETE — es un historial legal inmutable por diseño.
- **`categorias`**: además del patrón estándar, tiene un refuerzo adicional (`sql/supabase_reforzar_integridad.sql`) que agrega `es_sistema = false` al `using`/`with check` de UPDATE y DELETE, para que ni siquiera una llamada directa a la API (saltándose la UI) pueda editar o borrar la categoría de sistema.

El rol `anon` (sin sesión) tiene el acceso **revocado explícitamente** sobre las tablas de datos desde `supabase_etapa3_rls.sql` — confirmado en el código que ninguna pantalla necesita leer estas tablas sin sesión activa.

Cada tabla nueva requirió además un `GRANT` explícito a `authenticated` (`grant select, insert, update, delete on table ... to authenticated`) — sin él, Postgres bloquea el acceso *antes* de evaluar RLS. Este fue un error real encontrado y corregido durante el desarrollo (`sql/supabase_fix_perfiles_grant.sql`), y desde entonces cada script de tabla nueva lo incluye preventivamente.

### 5.3 El trigger `handle_new_user`

Función `security definer` que corre automáticamente (trigger `on_auth_user_created` sobre `auth.users`, `after insert`) en el instante en que Supabase Auth registra un usuario nuevo. `security definer` es necesario porque en ese momento el usuario todavía no tiene sesión `authenticated` — sin ese permiso especial, RLS bloquearía sus propios inserts iniciales.

En su versión más reciente corregida (`sql/supabase_fix_trigger_categorias.sql`, ver sección 10), crea para el usuario nuevo:
1. **6 categorías por defecto** en el idioma elegido (`raw_user_meta_data ->> 'idioma'`, con `'es'` de respaldo), una de ellas ("Gastos fijos"/"Fixed expenses") marcada `es_sistema = true`.
2. **1 fila en `fondo_emergencia`** (`monto_actual = 0`, `meses_meta = 6`).
3. **1 fila en `perfiles`** con la moneda (`raw_user_meta_data ->> 'moneda'`, respaldo `'COP'`) y el idioma elegidos.
4. **Hasta 3 filas en `consentimientos`**, solo si el metadato correspondiente vino explícitamente en `'true'` con una versión no vacía (nunca se inventa un consentimiento).

Todo el registro pasa datos del formulario al trigger vía `options.data` del `signUp()` de Supabase (guardado automáticamente en `auth.users.raw_user_meta_data`, tipo `jsonb`) — es el mecanismo estándar recomendado por Supabase para este caso, evita una segunda llamada posterior al `signUp` que podría fallar o dejar una ventana de inconsistencia.

### 5.4 Relaciones y `on delete cascade`

Todas las tablas de datos de usuario referencian `auth.users(id) on delete cascade`: si un usuario se borra de Supabase Auth (vía la Edge Function de la sección 6, o manualmente desde el panel), las 11 tablas listadas en 5.1 se vacían de sus filas automáticamente, sin que ninguna función tenga que borrarlas una por una.

Relaciones internas notables:
- `movimientos.cuenta_id` / `cuenta_destino_id` → `cuentas(id) on delete set null` (un movimiento histórico sobrevive al borrado de la cuenta, solo pierde la referencia).
- `movimientos.categoria_id` → `categorias(id) on delete set null`.
- `movimientos.gasto_fijo_id` → `gastos_fijos(id) on delete set null`, con un **índice único parcial** `(gasto_fijo_id, date_trunc('month', fecha))` que impide, a nivel de base de datos, más de un movimiento por gasto fijo en el mismo mes (protección contra doble clic, ver sección 10).
- `categorias_viaje.viaje_id` / `gastos_viaje.viaje_id` → `viajes(id) on delete cascade` (borrar un viaje borra sus categorías y gastos).
- `gastos_viaje.categoria_viaje_id` → `categorias_viaje(id) on delete set null` (un gasto nunca desaparece si su categoría se borra, aunque la regla de negocio en el servicio ya debería impedir borrar una categoría con gastos).

---

## 6. Seguridad

- **RLS en todas las tablas de datos** (sección 5.2) — la garantía real de aislamiento entre usuarios vive en la base de datos, no solo en el filtrado del cliente (`useDatosUsuario`).
- **Autenticación**: Supabase Auth maneja el ciclo completo (registro, login, recuperación de contraseña, sesión JWT). El cifrado y almacenamiento de contraseñas lo gestiona Supabase (no hay contraseñas en texto plano ni hashing propio en este código).
- **2FA (MFA TOTP)**: vía `supabase.auth.mfa.*`. Un usuario puede inscribir un factor "principal" y factores "de respaldo" adicionales (`src/utils/factoresMfa.js` gestiona el nombrado). Al iniciar sesión, si el usuario tiene un factor verificado, `getAuthenticatorAssuranceLevel()` deja la sesión en `aal1` con `nextLevel: 'aal2'`, y `AuthContext` traduce eso en `requiereVerificacionMfa` para que `App.jsx` muestre `VerificarMfa` antes de dejar entrar (sección 3.6). El mismo gate aplica en el flujo de recuperación de contraseña (Ley del mínimo privilegio: cambiar la contraseña de una cuenta con 2FA exige primero el código).
- **Edge Function `eliminar-cuenta`** (`supabase/functions/eliminar-cuenta/index.ts`, Deno/TypeScript): la única operación de la app que requiere la `service_role key` (que nunca puede viajar al navegador, porque se salta RLS por completo). Corre en dos pasos:
  1. Verifica la identidad real del que llama con un cliente construido con la **anon key** + el header `Authorization` recibido (`auth.getUser()` valida la firma del JWT contra el servidor — no es una simple decodificación sin verificar).
  2. Solo entonces usa un cliente con la **service role key** para `auth.admin.deleteUser(user.id)` — y el `id` que se borra es *siempre* el que devolvió la verificación del paso 1, nunca uno que venga del body de la petición (así un usuario no puede intentar borrar la cuenta de otro manipulando la llamada). El borrado en cascada (5.4) se encarga del resto de las tablas.
- **Validaciones del lado del cliente respaldadas en la base de datos**: contraseña mínima de 10 caracteres (validado en cada formulario), montos positivos/no negativos (`sql/supabase_reforzar_integridad.sql` agrega `CHECK` a nivel de columna para que ni una llamada directa a la API pueda saltárselo), nombres de categoría reservados (`'gastos fijos'`/`'fixed expenses'` bloqueados en `services/categorias.js` para que un usuario no pueda confundir su propia categoría con la de sistema).
- **Cumplimiento legal (Ley 1581 de 2012, Colombia)**: tabla `consentimientos` append-only (sin UPDATE/DELETE posible desde la app, sección 5.1) como constancia de qué versión de cada documento aceptó el usuario y cuándo. `src/constants/versionesLegales.js` es la fuente única de verdad de la versión vigente de cada documento; `src/utils/consentimientos.js` calcula si el consentimiento sigue vigente (exige que la versión aceptada coincida exactamente con la vigente, no solo que exista alguna aceptación). El gate de `AuthContext`/`App.jsx` (sección 3.6) cubre tanto a usuarios nuevos (checkboxes en el registro) como a cuentas viejas o una futura subida de versión de cualquier documento (`PantallaConsentimiento`).

---

## 7. Internacionalización y moneda

### 7.1 i18n (es/en)

Sistema propio, sin librería externa (`src/i18n/`):
- `es.js` y `en.js` son diccionarios anidados por namespace (ej. `perfil.titulo`).
- `traducir(idioma, clave, valores)` busca la clave con notación de puntos, cae a español si no existe en el idioma activo, y a la clave literal si tampoco existe en español (nunca revienta la pantalla por una clave faltante). Soporta interpolación de placeholders `{{nombre}}`.
- `traducirPlural(idioma, claveBase, cantidad, valores)` resuelve formas singular/plural (`claveBase.uno` / `claveBase.otro`), necesario porque un plural simple no funciona igual en español e inglés.
- `IdiomaContext` expone `t()`/`tp()` a toda la app, leyendo el idioma una sola vez de `perfiles.idioma` por sesión.
- **El idioma se elige una sola vez, en el registro**, y viaja en los metadatos del `signUp()` (sección 5.3). No hay forma de cambiarlo después desde la UI actual: `IdiomaContext` solo lee, nunca escribe (a diferencia de `MonedaContext`, que sí expone `cambiarMoneda`).

### 7.2 Multi-moneda (COP/USD/EUR)

`src/utils/monedas.js` define la configuración de cada moneda (locale de `Intl`, símbolo, posición del símbolo, cantidad de decimales, separadores) — **no hay conversión entre monedas**: el número guardado en la base de datos nunca cambia, la moneda solo controla cómo se muestra (`formatearMonto`, vía `Intl.NumberFormat`) y cómo se interpreta lo que el usuario teclea (`src/utils/inputMoneda.js`). `MonedaContext` centraliza la moneda del perfil y expone `cambiarMoneda()` (si el usuario la cambia después, los montos ya guardados no se recalculan — es una preferencia de visualización, no de conversión).

Los viajes tienen su **propia moneda por categoría y por gasto** (`categorias_viaje.moneda`, `gastos_viaje.moneda`), independiente de la moneda del perfil — pensado para registrar gastos en la moneda local del destino sin mezclar con la moneda "de casa".

---

## 8. PWA

Configurada con `vite-plugin-pwa` (`vite.config.js`):
- `registerType: 'autoUpdate'`: el service worker se actualiza solo en segundo plano cuando hay una versión nueva, sin pedirle nada al usuario.
- El `manifest.webmanifest` se genera en el build a partir del objeto `manifest` de la config (nombre "Seed", `display: 'standalone'`, orientación portrait, colores de tema `#0f1512`) — no hay un manifest escrito a mano en `public/`.
- Workbox hace **precache básico del app shell**: JS, CSS, HTML, SVG, PNG y fuentes (`.woff2`) generados por el build (`globPatterns`). No hay estrategia de runtime caching para datos de Supabase — es explícitamente "instalable", no "offline avanzado" (comentario del propio `vite.config.js`).
- Los íconos (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `favicon.svg`, `apple-touch-icon.png`) viven ya generados en `public/`; `scripts/generar-iconos-pwa.mjs` (usa `sharp`) los regenera a partir de un source cuando hace falta (`npm run generate:icons`).
- `theme-color` y el link a `apple-touch-icon` se agregan a mano en `index.html` porque el plugin no los gestiona automáticamente.

---

## 9. Despliegue

- **Hosting**: Vercel. No hay `vercel.json` en el repo — la configuración de build/output se deja al autodetectado de Vercel para un proyecto Vite (`npm run build` → carpeta `dist/`), no hay overrides personalizados versionados.
- **CI/CD**: integración Git de Vercel con el repositorio de GitHub — cada push a la rama principal dispara un build y despliegue automático (auto-deploy), sin un pipeline propio (no hay carpeta `.github/workflows/`).
- **Variables de entorno necesarias** (solo por nombre, sin valores — se configuran en el dashboard de Vercel para el entorno de producción, y en un `.env` local ignorado por git para desarrollo):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

  `src/lib/supabase.js` lanza un error explícito en el arranque si cualquiera de las dos falta, en vez de fallar de forma confusa más adelante.

- **Edge Function** (`eliminar-cuenta`): se despliega por separado, directo al proyecto de Supabase (no pasa por el build/deploy de Vercel). Sus variables de entorno (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) las inyecta Supabase automáticamente a toda Edge Function del proyecto — no se configuran a mano ni viven en ningún `.env` de este repo (comentario explícito en el código de la función).
- **Base de datos**: los cambios de esquema (`sql/*.sql`) se aplican a mano en el editor SQL del panel de Supabase — no hay migraciones automatizadas ni CLI de Supabase integrada al flujo de despliegue (ver introducción de la sección 5).

---

## 10. Decisiones técnicas clave

- **Por qué Supabase**: da Postgres real + Auth + RLS + Edge Functions como una sola plataforma administrada, evitando construir un backend propio para una app de un desarrollador. El precio es que la lógica de negocio con múltiples pasos (traslados, marcar gasto fijo pagado) tiene que simularse con reversión manual en el cliente (sección 3.2), porque PostgREST no expone transacciones multi-tabla al cliente directamente.
- **RLS como garantía real, `useDatosUsuario` como conveniencia**: el propio código lo documenta explícitamente (`datosUsuario.js`: "No reemplaza RLS ... es la barrera del lado de la app") — una decisión consciente de tener dos capas en vez de confiar solo en una.
- **`es_sistema` en vez de comparar por nombre**: la categoría protegida de "Gastos fijos" se identificaba originalmente por su nombre exacto en español, lo que se rompía para usuarios en inglés ("Fixed expenses"). Se migró a una columna booleana explícita — más robusto y explícito que depender de una cadena de texto que además cambia según el idioma.
- **Cálculos puros en `utils/`, testeados sin mocks**: separar la aritmética de negocio (resumen, proyección de metas, fortaleza de contraseña, vigencia de consentimiento) de los componentes de React permite testear la lógica real sin necesitar React Testing Library ni mockear Supabase — decisión visible en los comentarios de varios archivos de `utils/` que señalan explícitamente este motivo.
- **`security definer` + `set search_path = public`** en el trigger: patrón estándar recomendado por la documentación oficial de Supabase para triggers de `auth.users`, necesario porque el usuario nuevo no tiene sesión `authenticated` todavía en el instante del registro.
- **Falla abierta, no cerrada, en los gates no críticos**: si la consulta de MFA o de consentimiento falla por un problema de red, `AuthContext` trata eso como "no hace falta el gate" en vez de atrapar al usuario indefinidamente detrás de una pantalla que tampoco podría completar (documentado explícitamente en el código).
- **⚠️ Deuda técnica encontrada — `src/data/` es código muerto**: los cuatro archivos `src/data/categoriasGasto.js`, `cuentas.js`, `fondoEmergencia.js` y `gastosFijos.js` (datos mock que coinciden con los datos de ejemplo de `sql/supabase_setup.sql`, de antes de la migración a Supabase) **no están importados por ningún componente ni servicio** — se confirmó con una búsqueda completa en `src/`. Quedaron del prototipo inicial mono-usuario y son candidatos directos a borrar.
- **⚠️ Discrepancia confirmada entre SQL "aplicado" y SQL real en producción**: `sql/README.md` daba por ejecutados varios scripts marcados como "borrador" (incluido `supabase_categorias_default.sql`, que definía el `INSERT` correcto de categorías con `es_sistema`). Al confirmar directamente contra el trigger real en producción, se encontró que la versión efectivamente activa era una anterior y desactualizada (la de `supabase_consentimientos.sql`, con el `INSERT` de 4 columnas sin `es_sistema` y la lista vieja de categorías) — es decir, el historial documentado en `sql/README.md` no coincidía con el estado real de la base de datos. Corregido en `sql/supabase_fix_trigger_categorias.sql` (trigger + backfill). Vale la pena, como práctica hacia adelante, verificar contra la base real antes de dar por aplicado un script marcado como borrador.
- **Índice único parcial por mes para gastos fijos**: en vez de validar "ya está pagado este mes" solo en el código, `movimientos_gasto_fijo_id_mes_unico` lo garantiza a nivel de base de datos (protección real contra doble clic o dos pestañas simultáneas, con manejo explícito del código de error `23505` en `services/gastosFijos.js`).

---

## 11. Testing

- **Framework**: Vitest (`environment: 'node'` en `vite.config.js` — no hay entorno de DOM simulado ni React Testing Library; las pruebas son de lógica pura, no de componentes montados).
- **Alcance real, confirmado corriendo la suite** (`npm test`): **18 archivos de prueba, 261 pruebas, todas en verde**.
- **Qué cubren**: exclusivamente funciones puras, sin mocks de Supabase ni de React:
  - Todos los servicios de `src/services/*.test.js` (categorias, categoriasViaje, cuentas, gastosFijos, gastosViaje, movimientos, viajes) — prueban la lógica de negocio (validaciones, reglas de reasignación, cálculo de saldos) pasándoles objetos `datosUsuario`/`cuentas` de prueba en vez de un cliente Supabase real.
  - Todos los utils de cálculo (`resumenCalculos`, `resumenViaje`, `proyeccionMeta`, `gastoMensualPromedio`, `mensajeFondo`, `formatoFecha`, `formatoPeriodo`, `formatoMoneda`, `fortalezaContrasena`, `factoresMfa`) y `utils/consentimientos.test.js`.
- **Qué NO cubren**: no hay pruebas de componentes React (render, interacción de UI), ni pruebas end-to-end, ni pruebas de integración contra una base de datos Supabase real (ni local ni de staging). La validación de flujos de UI es manual — ver `docs/FLUJOS.md`.
- **Cómo correrlas**: `npm test` (una pasada) o `npm run test:watch` (modo watch).

---

*Documento generado a partir de una revisión directa del código fuente. Si el código cambia, este documento puede quedar desactualizado — no es una fuente generada automáticamente en cada build.*
