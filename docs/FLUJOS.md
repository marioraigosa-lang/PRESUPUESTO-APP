# Documentación de flujos — Seed (checklist de QA manual)

Este documento lista todos los flujos y pantallas de la aplicación Seed, con pasos concretos para probar cada uno y el resultado esperado. Está pensado para validar manualmente que todo funciona después de un cambio, un despliegue, o una reparación de datos.

Se construyó leyendo el código real de la app (`src/App.jsx`, `src/views/`, `src/components/`, `src/services/`, `src/context/`, `src/hooks/`, `src/utils/`) al 2026-08-31, no supuestos. Cuando un paso depende de una regla de negocio no obvia (por ejemplo, que el idioma no se puede cambiar después de registrarse), se indica explícitamente.

## Cómo usar este documento

- Cada flujo tiene: **Precondiciones**, **Pasos**, **Resultado esperado** y **Casos borde / variantes**.
- "Zona horaria/fecha" no se prueba aparte: varios flujos dependen de la fecha del sistema (mes actual, día de pago, etc.), tenlo en cuenta al leer los resultados esperados.
- Los flujos marcados **⚠️ BUG CONOCIDO** tienen una causa raíz ya diagnosticada (ver `sql/supabase_fix_trigger_categorias.sql`) — pruébalos con particular atención después de aplicar esa reparación en Supabase.

## Índice

**A. Autenticación y cuenta**
[A1](#a1-registro) Registro · [A2](#a2-login-sin-2fa) Login sin 2FA · [A3](#a3-login-con-2fa) Login con 2FA · [A4](#a4-recuperar-contraseña-sin-2fa) Recuperar contraseña sin 2FA · [A5](#a5-recuperar-contraseña-con-2fa) Recuperar contraseña con 2FA · [A6](#a6-activar-2fa-primer-factor) Activar 2FA · [A7](#a7-agregar-factor-de-respaldo-2fa) Agregar factor de respaldo · [A8](#a8-eliminar-un-factor-2fa) Eliminar un factor 2FA · [A9](#a9-gate-de-consentimiento-ley-1581) Gate de consentimiento · [A10](#a10-eliminar-cuenta) Eliminar cuenta · [A11](#a11-cambiar-moneda-desde-perfil) Cambiar moneda · [A12](#a12-cerrar-sesión) Cerrar sesión

**B. Movimientos y finanzas**
[B1](#b1-crear-cuenta-bancaria) Crear cuenta · [B2](#b2-editar-cuenta) Editar cuenta · [B3](#b3-eliminar-cuenta-bancaria) Eliminar cuenta · [B4](#b4-marcar-una-cuenta-como-fondo-de-ahorro) Marcar cuenta como ahorro · [B5](#b5-fondo-de-emergencia) Fondo de emergencia · [B6](#b6-ajustar-la-meta-en-meses-del-fondo) Ajustar meta del fondo · [B7](#b7-metas-de-ahorro-crear) Meta de ahorro: crear · [B8](#b8-metas-de-ahorro-editar) Meta de ahorro: editar · [B9](#b9-metas-de-ahorro-eliminar) Meta de ahorro: eliminar · [B10](#b10-categorías-crear) Categorías: crear · [B11](#b11-categorías-editar) Categorías: editar · [B12](#b12-categorías-eliminar-sin-movimientos) Categorías: eliminar sin movimientos · [B13](#b13-categorías-eliminar-con-reasignación) Categorías: eliminar con reasignación · [B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido) Categoría de sistema ⚠️ · [B15](#b15-crear-movimiento-gasto) Crear movimiento (gasto) · [B16](#b16-crear-movimiento-ingreso) Crear movimiento (ingreso) · [B17](#b17-crear-movimiento-traslado) Crear movimiento (traslado) · [B18](#b18-editar-movimiento) Editar movimiento · [B19](#b19-eliminar-movimiento) Eliminar movimiento · [B20](#b20-gastos-fijos-crear) Gastos fijos: crear · [B21](#b21-gastos-fijos-editar) Gastos fijos: editar · [B22](#b22-gastos-fijos-marcar-como-pagado--️-bug-conocido) Gastos fijos: marcar pagado ⚠️ · [B23](#b23-gastos-fijos-desmarcar-como-pagado) Gastos fijos: desmarcar pagado · [B24](#b24-gastos-fijos-eliminar) Gastos fijos: eliminar · [B25](#b25-gastos-variables-con-presupuesto) Gastos variables · [B26](#b26-filtrado-por-mes-y-quincena) Filtrado por mes y quincena · [B27](#b27-resumen-filtro-añomes) Resumen: filtro año/mes · [B28](#b28-resumen-gráfico-mensual) Resumen: gráfico mensual · [B29](#b29-resumen-desglose-por-categoría) Resumen: desglose por categoría · [B30](#b30-calculadora-de-cuota-de-crédito) Calculadora cuota de crédito · [B31](#b31-calculadora-cdt-vs-cuenta-de-alto-rendimiento) Calculadora CDT · [B32](#b32-calculadora-de-ahorro-con-interés-compuesto) Calculadora de ahorro · [B33](#b33-detalle-de-cuenta-detallecuentajsx) Detalle de cuenta · [B34](#b34-detalle-de-categoría-de-gasto-variable-detallecategoriajsx) Detalle de categoría

**C. Viajes**
[C1](#c1-crear-viaje) Crear viaje · [C2](#c2-editar-viaje) Editar viaje · [C3](#c3-eliminar-viaje) Eliminar viaje · [C4](#c4-categorías-de-viaje-con-presupuesto) Categorías de viaje · [C5](#c5-gastos-de-viaje-multi-moneda) Gastos de viaje · [C6](#c6-dashboard-de-viaje-detalleviajejsx) Dashboard de viaje · [C7](#c7-resumen-de-viaje) Resumen de viaje

**D. Otros**
[D1](#d1-guía-de-uso-referencia) Guía de uso · [D2](#d2-guía-de-bienvenida-primera-vez) Guía de bienvenida · [D3](#d3-documentos-legales-política-de-datos-y-términos) Documentos legales · [D4](#d4-pwa-instalación) PWA · [D5](#d5-multi-idioma-esen) Multi-idioma · [D6](#d6-multi-moneda-copusdeur) Multi-moneda

**E. Flujos adicionales encontrados en el código (no listados por el usuario)**
[E1](#e1-ayuda-contextual-tooltips-guia) Ayuda contextual · [E2](#e2-promoción-de-2fa-en-home) Promoción de 2FA en Home · [E3](#e3-editar-un-traslado-ya-existente-restricción) Editar traslado (restricción) · [E4](#e4-error-de-doble-clic-en-marcar-gasto-fijo-pagado) Doble clic al marcar gasto fijo · [E5](#e5-fila-de-fondo_emergencia-o-perfiles-faltante-auto-reparación-en-cliente) Auto-reparación de filas faltantes

---

# A. Autenticación y cuenta

## A1. Registro

**Precondiciones:** No tener sesión iniciada. Correo no usado antes en la app.

**Pasos:**
1. Abrir la app sin sesión → se muestra `Login`. Tocar "Regístrate".
2. Escribir un correo con formato válido.
3. Escribir una contraseña de al menos 10 caracteres. Observar el medidor de fortaleza (`MedidorFortaleza`) reaccionando en vivo (débil/media/fuerte/muy fuerte).
4. Repetir la contraseña en "Confirmar contraseña".
5. Elegir moneda (COP/USD/EUR) e idioma (es/en) — los textos de la pantalla se traducen en vivo al cambiar el idioma elegido.
6. Marcar los 3 checkboxes: Política de Tratamiento de Datos, Términos de Uso, y "Soy mayor de edad". Verificar que los enlaces "Política de Tratamiento de Datos" y "Términos de Uso" abren el documento correspondiente (`PoliticaDatos`/`TerminosCondiciones`) y que "Volver" regresa al formulario sin perder lo ya escrito.
7. Confirmar que el botón "Crear cuenta" está deshabilitado hasta que los 3 checkboxes estén marcados.
8. Tocar "Crear cuenta".

**Resultado esperado:**
- Si Supabase tiene confirmación de correo activada: mensaje "cuenta creada, revisa tu correo" (no hay sesión todavía).
- Si no la tiene: la app entra directo (el `AuthProvider` detecta la sesión nueva sola).
- Al primer login, el usuario debe tener: perfil con la moneda/idioma elegidos, fondo de emergencia en 0, 6 categorías por defecto en el idioma elegido (una de ellas "Gastos fijos"/"Fixed expenses" marcada como categoría de sistema — ver [B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido)), y 3 filas en la tabla `consentimientos` con la versión vigente de cada documento (`src/constants/versionesLegales.js`).

**Casos borde / variantes:**
- Correo con formato inválido → error "correo inválido", no llega a Supabase.
- Contraseña de menos de 10 caracteres → error, no envía.
- Contraseñas que no coinciden → error.
- Intentar enviar con algún checkbox sin marcar → el botón sigue deshabilitado (y hay una validación de respaldo dentro de `manejarEnviar` por si se fuerza el envío).
- Registrar con un correo YA registrado: Supabase, con la confirmación de correo activada, responde 200 sin sesión y con `data.user.identities` vacío (para no permitir enumerar cuentas) — la app debe detectar esto y mostrar "correo ya registrado", no "cuenta creada".
- Probar el registro en inglés (elegir idioma "English"): confirmar que las categorías creadas nacen en inglés (Groceries, Leisure, Small daily expenses, Transport, Fuel, Fixed expenses).

## A2. Login sin 2FA

**Precondiciones:** Cuenta existente sin 2FA activo.

**Pasos:**
1. Escribir correo y contraseña correctos. Tocar "Entrar".

**Resultado esperado:** Entra directo a la app (pantalla "Inicio").

**Casos borde / variantes:**
- Correo con formato inválido → error local, no llega a Supabase.
- Contraseña de menos de 6 caracteres → error local.
- Credenciales incorrectas → mensaje de error traducido (`auth.errorCredenciales`).
- Correo no confirmado (si aplica) → mensaje específico (`auth.errorEmailNoConfirmado`).
- Muchos intentos seguidos → mensaje de límite de intentos (`auth.errorLimiteIntentos`).

## A3. Login con 2FA

**Precondiciones:** Cuenta con al menos un factor TOTP verificado (ver [A6](#a6-activar-2fa-primer-factor)). Tener la app autenticadora (Google Authenticator, Authy, etc.) con el factor ya inscrito.

**Pasos:**
1. Login normal con correo y contraseña correctos.
2. La app debe mostrar `VerificarMfa` en vez de la app (sesión queda en AAL1, con `nextLevel: 'aal2'`).
3. Si hay más de un factor (principal + respaldos), elegir con cuál verificar.
4. Escribir el código de 6 dígitos de la app autenticadora. Tocar "Verificar y entrar".

**Resultado esperado:** Sesión sube a AAL2 y la app muestra "Inicio" normalmente.

**Casos borde / variantes:**
- Código incorrecto → error "código inválido", se puede reintentar.
- Código vencido (esperar >30s sin refrescar) → error.
- Tocar "Usar otra cuenta" desde `VerificarMfa` → cierra la sesión y vuelve a `Login`.
- Cerrar y reabrir la app a mitad del challenge → debe volver a pedir el código (no debe dejar entrar sin AAL2).

## A4. Recuperar contraseña sin 2FA

**Precondiciones:** Cuenta existente sin 2FA activo. Acceso al correo de esa cuenta.

**Pasos:**
1. Desde `Login`, tocar "¿Olvidaste tu contraseña?".
2. Escribir el correo, tocar "Enviar".
3. Mensaje neutro de "enlace enviado" (Supabase no distingue si el correo existe o no, para no permitir enumerar cuentas).
4. Abrir el enlace del correo recibido.
5. La app debe abrir directo en `EstablecerNuevaContrasena` (detecta `?tipo=restablecer-contrasena` en la URL).
6. Escribir nueva contraseña (≥10 caracteres) y confirmarla. Guardar.

**Resultado esperado:** Contraseña actualizada, mensaje de éxito, botón para ir al login. El siguiente login debe usar la contraseña nueva.

**Casos borde / variantes:**
- Enlace vencido/inválido → la app detecta el error en el hash de la URL (`#error=...&error_code=otp_expired`) y muestra "enlace expirado" con botón para volver al login (no un formulario roto).
- Contraseñas que no coinciden, o menor a 10 caracteres → error local.
- Probar el medidor de fortaleza también aparece aquí (mismo componente que Registro).

## A5. Recuperar contraseña con 2FA

**Precondiciones:** Cuenta con 2FA activo. **Este es el caso especial que hay que recordar probar**: el enlace de recuperación deja la sesión en AAL1 igual que un login normal, así que Supabase exige el código de 2FA ANTES de dejar cambiar la contraseña.

**Pasos:**
1. Igual que [A4](#a4-recuperar-contraseña-sin-2fa) hasta abrir el enlace del correo.
2. La app debe mostrar el paso de código MFA (`PasoCodigoMfa`) DENTRO de `EstablecerNuevaContrasena`, no el formulario de contraseña directo, con el subtítulo específico de "verificar y continuar".
3. Escribir el código de 6 dígitos, verificar.
4. Después de verificar, debe aparecer automáticamente el formulario de nueva contraseña (sin recargar la página).
5. Escribir y confirmar la nueva contraseña, guardar.

**Resultado esperado:** Contraseña cambiada solo después de haber pasado el 2FA. Un usuario NO debe poder cambiar la contraseña de una cuenta con 2FA sin el código.

**Casos borde / variantes:**
- Código incorrecto en este paso → error, no avanza al formulario de contraseña.
- Tocar el enlace "Volver al login" mientras está en el paso de MFA → cierra la sesión temporal de recuperación y regresa a `Login`.

## A6. Activar 2FA (primer factor)

**Precondiciones:** Sesión iniciada, sin 2FA activo. App autenticadora instalada en el teléfono.

**Pasos:**
1. Ir a "Cuenta" (nav inferior) → "Seguridad".
2. Estado debe mostrar "Inactivo". Tocar "Activar 2FA".
3. Se genera un QR + secreto en texto (por si no se puede escanear). Escanear con la app autenticadora.
4. Escribir el código de 6 dígitos generado. Tocar "Verificar y activar".

**Resultado esperado:** Estado pasa a "Activo", aparece el factor "Principal" en la lista con su fecha de creación. Un futuro login pedirá el código (ver [A3](#a3-login-con-2fa)).

**Casos borde / variantes:**
- Código incorrecto → error, se queda en el paso del QR.
- Tocar "Cancelar" a mitad del QR → se hace `unenroll` del factor sin verificar (no debe quedar un factor fantasma).
- Iniciar el flujo, cerrar la pestaña sin cancelar, volver a intentar activar 2FA → la app limpia automáticamente cualquier factor no verificado antes de generar uno nuevo (no debe bloquear con "nombre duplicado").
- Código expirado (esperar el ciclo de 30s) → error, reintentar con el código nuevo.

## A7. Agregar factor de respaldo 2FA

**Precondiciones:** Sesión iniciada, con 2FA ya activo (al menos un factor verificado).

**Pasos:**
1. En "Seguridad", con exactamente 1 factor activo, debe aparecer una tarjeta sugiriendo agregar un respaldo. Tocar "Agregar respaldo" (o el botón "Agregar otro" si ya hay 2+).
2. Repetir el flujo de QR + código, igual que [A6](#a6-activar-2fa-primer-factor).

**Resultado esperado:** Aparece un segundo factor en la lista, nombrado "Respaldo" (el tercero sería "Respaldo 2", etc.). En `VerificarMfa`, ahora se puede elegir con cuál de los factores verificar.

**Casos borde / variantes:**
- Descartar la tarjeta de sugerencia (botón ×) → no debe volver a aparecer en esa sesión de la pantalla.
- Con 2+ factores, la tarjeta de sugerencia ya no debe aparecer (solo aparece con exactamente 1).

## A8. Eliminar un factor 2FA

**Precondiciones:** Sesión iniciada con al menos un factor 2FA activo.

**Pasos:**
1. En "Seguridad", tocar el ícono de basurero junto a un factor.
2. Confirmar el diálogo (el texto cambia si es el ÚLTIMO factor: advierte que se desactiva el 2FA completo).
3. Si la sesión actual NO está en AAL2 (por ejemplo, si de algún modo se llegó aquí sin pasar el challenge), debe pedir reautenticación con un código antes de borrar.

**Resultado esperado:** El factor desaparece de la lista. Si era el único, el estado vuelve a "Inactivo" y el próximo login ya no pide 2FA.

**Casos borde / variantes:**
- Eliminar el factor "Principal" quedando solo el de respaldo → debe seguir funcionando el login con 2FA usando el de respaldo.
- Cancelar el diálogo de confirmación → no borra nada.
- Código de reautenticación incorrecto → error, no borra.

## A9. Gate de consentimiento (Ley 1581)

**Precondiciones:** Un usuario autenticado (con o sin 2FA) que NO tiene, para alguno de los 3 tipos (política de datos, términos, mayoría de edad), una fila vigente en la tabla `consentimientos` — esto cubre tanto cuentas viejas que nunca aceptaron nada (antes de que existieran los checkboxes) como cuentas que aceptaron una versión de un documento que ya subió de versión.

**Pasos:**
1. Iniciar sesión con una cuenta en ese estado (o borrar/desactualizar a mano sus filas de `consentimientos` para la prueba).
2. Después de pasar el login (y el 2FA si aplica), la app debe mostrar `PantallaConsentimiento` en vez de la app normal.
3. Marcar los 3 checkboxes (mismos textos y enlaces que en Registro). Tocar "Aceptar y continuar".

**Resultado esperado:** Se insertan las filas correspondientes en `consentimientos` con la versión vigente, y la app pasa a mostrarse normalmente (sin recargar la página).

**Casos borde / variantes:**
- Intentar entrar sin marcar los 3 checkboxes → botón deshabilitado.
- Este gate se evalúa DESPUÉS del gate de 2FA (si la cuenta tiene 2FA, primero pide el código, luego el consentimiento).
- Tocar "Cerrar sesión" desde esta pantalla → debe funcionar y volver al login.
- Verificar que subir una versión en `src/constants/versionesLegales.js` (simulando una actualización de términos) hace que una cuenta que ya había aceptado la versión anterior vuelva a ver este gate.

## A10. Eliminar cuenta

**Precondiciones:** Sesión iniciada. Conocer la contraseña actual.

**Pasos:**
1. "Cuenta" → sección "Zona de peligro" → "Eliminar cuenta".
2. Leer la advertencia (lista de qué se borra). Escribir la contraseña actual.
3. Tocar "Eliminar cuenta".

**Resultado esperado:**
- Paso 1 interno: reautentica con `signInWithPassword`. Si falla, muestra error y NO invoca la función de borrado (nada se borra).
- Paso 2 interno: invoca la Edge Function `eliminar-cuenta` (`supabase/functions/eliminar-cuenta`), que corre del lado del servidor.
- Se muestra una pantalla de despedida. Solo al tocar "Volver al inicio" ahí se cierra la sesión de verdad (para que el usuario alcance a leer el mensaje antes de que la sesión desaparezca y `App.jsx` desmonte la pantalla).
- Después: el correo debe quedar disponible para un registro nuevo, y los datos del usuario (cuentas, movimientos, categorías, viajes, etc.) no deben ser accesibles.

**Casos borde / variantes:**
- Contraseña incorrecta → error, no invoca la Edge Function, cuenta intacta.
- Cancelar antes de confirmar → vuelve a Perfil sin cambios.
- Verificar que, si la cuenta tiene 2FA activo, el borrado igual funciona (la Edge Function usa el token de sesión, no depende de AAL).

## A11. Cambiar moneda desde Perfil

**Precondiciones:** Sesión iniciada.

**Pasos:**
1. "Cuenta" → sección de moneda → tocar una moneda distinta a la actual (COP/USD/EUR).
2. Confirmar el diálogo de advertencia ("no se convierten los montos, solo cambia el formato").

**Resultado esperado:** La moneda persiste en `perfiles.moneda`. Todos los montos de la app (saldos, movimientos, calculadoras) se muestran con el símbolo/formato de la nueva moneda, PERO el número guardado no cambia (ej. 1.000.000 COP no se convierte a dólares).

**Casos borde / variantes:**
- Cancelar el diálogo → no cambia nada.
- Tocar la misma moneda ya activa → no hace nada (no dispara la llamada).
- Falla de red durante el guardado → mensaje de error, la pastilla debe volver a mostrar la moneda anterior (no quedarse en un estado inconsistente).

## A12. Cerrar sesión

**Precondiciones:** Sesión iniciada.

**Pasos:**
1. "Cuenta" → "Cerrar sesión".

**Resultado esperado:** Vuelve a la pantalla de login. Los datos en memoria de la sesión anterior no deben quedar visibles brevemente para el siguiente usuario que inicie sesión en el mismo dispositivo (revisar que `vista` vuelve a "inicio" al cambiar de usuario).

**Casos borde / variantes:**
- Cerrar sesión también está disponible desde `VerificarMfa` ("Usar otra cuenta") y desde `PantallaConsentimiento`.

---

# B. Movimientos y finanzas

## B1. Crear cuenta bancaria

**Precondiciones:** Sesión iniciada.

**Pasos:**
1. "Inicio" → "Gestionar cuentas" → "Agregar cuenta".
2. Nombre, tipo (texto libre, ej. "Ahorros"), color, saldo inicial. Guardar.

**Resultado esperado:** Aparece en la lista de cuentas de Inicio, ordenada por saldo descendente, y disponible como origen/destino en el formulario de movimientos.

**Casos borde / variantes:**
- Nombre vacío → error.
- Saldo vacío o negativo → error (`saldo === '' || Number(saldo) < 0`). Saldo 0 sí es válido.

## B2. Editar cuenta

**Pasos:** "Gestionar cuentas" → ícono de lápiz sobre una cuenta → cambiar nombre/tipo/color/saldo → Guardar.

**Resultado esperado:** Cambios reflejados en Inicio y en el listado de cuentas de todos los formularios que las usan (movimientos, gasto fijo, etc.).

**Casos borde / variantes:** Igual que [B1](#b1-crear-cuenta-bancaria) para las validaciones. Cambiar el saldo a mano aquí NO crea un movimiento (es edición directa del campo).

## B3. Eliminar cuenta bancaria

**Pasos:** "Gestionar cuentas" → ícono de basurero → confirmar diálogo.

**Resultado esperado:** La cuenta desaparece de la lista. Los movimientos que apuntaban a esa cuenta quedan con la referencia rota (verificar cómo se comporta el detalle de la OTRA cuenta involucrada en un traslado, `DetalleCuenta.jsx` vía `<Movimiento>`: debe mostrar "cuenta eliminada" en el texto direccional en vez de romperse — ver [B33](#b33-detalle-de-cuenta-detallecuentajsx)).

**Casos borde / variantes:**
- Eliminar una cuenta marcada como "fondo de ahorro" → el fondo de emergencia debe recalcularse sin ella.
- Eliminar la única cuenta que existe → el selector de cuenta en "Nuevo movimiento" debe manejarlo sin quedar en blanco/roto.
- Eliminar una cuenta usada como origen o destino de un traslado ya registrado → revisar que `HojaNuevoMovimiento` no rompe al mostrar ese traslado para editar.

## B4. Marcar una cuenta como fondo de ahorro

**Pasos:** "Gestionar cuentas" → interruptor "Fondo de ahorro" en una cuenta.

**Resultado esperado:** Actualización optimista inmediata (el interruptor cambia antes de la respuesta del servidor). El saldo de esa cuenta empieza a sumar al "Fondo actual" en la pestaña "Emergencia".

**Casos borde / variantes:**
- Simular una falla de red durante el toggle → el interruptor debe revertir a su estado anterior (no quedar "prendido" sin persistir).
- Marcar varias cuentas como ahorro → el fondo actual debe ser la suma de todas.

## B5. Fondo de emergencia

**Precondiciones:** Sesión iniciada. Idealmente con algo de historial de ingresos/gastos para ver el cálculo real.

**Pasos:**
1. Ir a la pestaña "Emergencia" (nav inferior).
2. Revisar: anillo de meses cubiertos, fondo actual (suma de cuentas marcadas como ahorro), gasto mensual promedio, meta (gasto mensual × meses meta).

**Resultado esperado:** Los números deben cuadrar con: fondo actual = suma de saldos de cuentas `es_ahorro = true`; gasto mensual = promedio de gastos por mes con actividad (no incluye traslados); mensaje de tono (alerta/neutral/positivo) según cuántos meses cubre.

**Casos borde / variantes:**
- Usuario sin ninguna cuenta marcada como ahorro → "fondo actual" en 0, mensaje indicando que no hay cuentas de ahorro.
- Usuario sin ningún gasto registrado → mensaje especial "sin gastos" (no se interpreta como "cubre menos de un mes").
- Cuenta nueva sin fila en `fondo_emergencia` (por ejemplo, si el trigger falló) → la pantalla debe crear la fila sola con valores por defecto (0, 6 meses) sin romperse — ver [E5](#e5-fila-de-fondo_emergencia-o-perfiles-faltante-auto-reparación-en-cliente).

## B6. Ajustar la meta (en meses) del fondo

**Pasos:** "Emergencia" → "Ajustar meta" → escribir un número entre 1 y 12 en el prompt.

**Resultado esperado:** El anillo y el cálculo de "meta" (gasto mensual × meses) se actualizan.

**Casos borde / variantes:**
- Escribir 0, un número negativo, texto no numérico, o >12 → no debe guardar (el prompt se ignora silenciosamente).
- Cancelar el prompt → no cambia nada.
- Falla de red al guardar → revierte visualmente al valor anterior y muestra error.

## B7. Metas de ahorro: crear

**Pasos:** "Emergencia" → sección "Metas" → "Nueva meta" → nombre, monto objetivo, mes/año objetivo → Guardar.

**Resultado esperado:** Aparece en la lista ordenada por fecha objetivo ascendente, con su barra de progreso basada en el fondo actual.

**Casos borde / variantes:** Nombre vacío, monto ≤0, o sin fecha → error. Fecha objetivo se guarda como el ÚLTIMO día de ese mes.

## B8. Metas de ahorro: editar

**Pasos:** Tocar "Editar" en una tarjeta de meta → cambiar datos → Guardar.

**Resultado esperado:** Cambios reflejados, la lista se reordena si cambió la fecha.

## B9. Metas de ahorro: eliminar

**Pasos:** Tocar "Eliminar" en una tarjeta de meta → confirmar diálogo.

**Resultado esperado:** Desaparece de la lista.

**Casos borde / variantes:** Falla de red → mensaje de error, la meta no debe desaparecer visualmente si el borrado falló en el servidor (verificar que solo se quita del estado tras confirmar éxito).

## B10. Categorías: crear

**Pasos:** "Inicio" → "Gestionar categorías" → "Agregar categoría" → nombre, emoji, color, presupuesto opcional, descripción opcional → Guardar.

**Resultado esperado:** Aparece en la lista de categorías gestionables y disponible en el selector de categoría al crear un gasto.

**Casos borde / variantes:** Nombre vacío o emoji vacío → error. Presupuesto negativo → error (0 y vacío sí son válidos, "sin tope").

## B11. Categorías: editar

**Pasos:** Ícono de lápiz sobre una categoría → cambiar datos → Guardar.

**Resultado esperado:** Cambios reflejados; si cambia el nombre/emoji, los movimientos históricos de esa categoría muestran el nuevo nombre/emoji (no se duplica el dato en cada movimiento).

## B12. Categorías: eliminar sin movimientos

**Precondiciones:** Una categoría sin ningún movimiento asociado.

**Pasos:** Ícono de basurero → confirmar diálogo simple.

**Resultado esperado:** Se elimina directo, sin pedir reasignación.

## B13. Categorías: eliminar con reasignación

**Precondiciones:** Una categoría CON al menos un movimiento asociado.

**Pasos:**
1. Ícono de basurero sobre esa categoría.
2. En vez del diálogo simple, debe abrirse `HojaReasignarCategoria` mostrando cuántos movimientos tiene.
3. Elegir una categoría destino (las demás categorías gestionables, sin incluir la que se va a borrar ni la de sistema). Confirmar.

**Resultado esperado:** Todos los movimientos de la categoría eliminada quedan reasignados a la categoría destino, y la categoría original desaparece.

**Casos borde / variantes:**
- Con solo 2 categorías gestionables (la que se borra + 1 más) → debe funcionar igual, mostrando esa única opción.
- Con 1 sola categoría gestionable (imposible reasignar) → la hoja debe mostrar "sin opciones" y no dejar confirmar.
- Cancelar la hoja de reasignación → la categoría no se borra.

## B14. Categoría de sistema ("Gastos fijos") — ⚠️ BUG CONOCIDO

**Contexto:** Se confirmó que el trigger `handle_new_user` en producción tenía una versión desactualizada del `INSERT` de categorías (4 columnas, sin `es_sistema`, con la lista vieja de categorías). Esto hace que cuentas creadas mientras el trigger estuvo roto tengan la categoría "Gastos fijos"/"Fixed expenses" con `es_sistema = false`, lo que rompe [B22](#b22-gastos-fijos-marcar-como-pagado--️-bug-conocido) (`gastosFijos.js` busca la categoría de sistema con `categorias.find(c => c.es_sistema)` — si no la encuentra, lanza `"Falta la categoría de gastos fijos..."`). Ver `sql/supabase_fix_trigger_categorias.sql` para la corrección (trigger + backfill).

**Pasos para verificar en una cuenta ya existente:**
1. "Inicio" → "Gestionar categorías".
2. Al fondo de la lista debe aparecer una tarjeta gris distinta (fondo `panel-2`), con la etiqueta "Sistema", para la categoría "Gastos fijos" (o "Fixed expenses" en inglés).
3. Si esa tarjeta NO aparece, es la señal directa del bug: la cuenta no tiene ninguna categoría con `es_sistema = true`.

**Resultado esperado (después de aplicar la reparación SQL):**
- Toda cuenta, nueva o vieja, debe tener exactamente UNA categoría con `es_sistema = true`, mostrada como "Sistema" en `GestionCategorias`, EXCLUIDA de: el selector de categorías al crear un gasto manual (`App.jsx` filtra `categorias.filter(c => !c.es_sistema)`), y de la lista de "Gastos variables" en Inicio (`GastosVariables.jsx` filtra por `es_sistema = false` en la consulta).
- La categoría de sistema NO debe poder editarse ni eliminarse desde la UI (no tiene íconos de lápiz/basurero en `GestionCategorias`).

**Casos borde / variantes:**
- Probar con una cuenta creada ANTES de aplicar la reparación (si tienes una de prueba) → confirmar que el backfill la corrigió sin tocar sus otras categorías (nombres, emojis, presupuestos existentes intactos).
- Probar con una cuenta creada DESPUÉS de aplicar la reparación (registro nuevo) → debe nacer directamente con la categoría de sistema correcta y la lista actualizada de categorías (Gastos hormiga, Gasolina, en vez de Salud, Varios).
- Confirmar que [B22](#b22-gastos-fijos-marcar-como-pagado--️-bug-conocido) funciona sin el error "Falta la categoría de gastos fijos" después de la reparación.

## B15. Crear movimiento (gasto)

**Pasos:** Botón flotante "+" en Inicio → tipo "Gasto" → monto, cuenta, categoría (grid de categorías, excluye la de sistema), descripción opcional → Guardar.

**Resultado esperado:** El saldo de la cuenta baja en el monto exacto. Cuenta para el total de "Gastos variables" de su categoría (si no tiene descripción, usa el nombre de la categoría) y aparece en la lista de gastos del detalle de esa categoría (`DetalleCategoria.jsx`, ver [B34](#b34-detalle-de-categoría-de-gasto-variable-detallecategoriajsx)) — NO aparece en el detalle de la cuenta usada, que solo lista ingresos y traslados (ver [B33](#b33-detalle-de-cuenta-detallecuentajsx)).

**Casos borde / variantes:** Monto vacío o ≤0 → error. Sin categorías disponibles (todas borradas) → revisar que no rompe el formulario.

## B16. Crear movimiento (ingreso)

**Pasos:** Botón "+" → tipo "Ingreso" → monto, cuenta, descripción → Guardar.

**Resultado esperado:** El saldo de la cuenta sube. Cuenta para "Ingresos" del período en la tarjeta de saldo de Inicio y en Resumen. No pide categoría (los ingresos no se categorizan). Aparece en la lista "Ingresos y traslados" del detalle de esa cuenta (ver [B33](#b33-detalle-de-cuenta-detallecuentajsx)).

## B17. Crear movimiento (traslado)

**Pasos:** Botón "+" → tipo "Traslado" → cuenta origen, cuenta destino (deben ser distintas), monto, descripción opcional (por defecto "Origen → Destino") → Guardar.

**Resultado esperado:** El saldo de origen baja y el de destino sube, ambos en el mismo monto. NO debe contar como ingreso ni gasto en ningún cálculo (fondo de emergencia, resumen, gastos variables) — es movimiento de dinero propio. Debe aparecer en el detalle de AMBAS cuentas (ver [B33](#b33-detalle-de-cuenta-detallecuentajsx)): como "Traslado a X" (coral, egreso) en la cuenta origen, y como "Traslado desde Y" (mint, ingreso) en la cuenta destino.

**Casos borde / variantes:**
- Con menos de 2 cuentas → debe avisar que hace falta una segunda cuenta y no dejar guardar.
- Elegir la misma cuenta como origen y destino → error bloqueante.
- Cambiar la cuenta origen después de elegir destino → el destino se reajusta solo si quedó igual al origen (no pisa una elección válida distinta).

## B18. Editar movimiento

**Precondiciones:** Un movimiento que NO sea de gasto fijo (`gasto_fijo_id` nulo) — esos no son editables desde aquí (ver [E3](#e3-editar-un-traslado-ya-existente-restricción)). **Nota:** ya no existe una lista de "Movimientos recientes" en Inicio — editar/eliminar se hace siempre desde la pantalla de detalle correspondiente: [B33](#b33-detalle-de-cuenta-detallecuentajsx) para ingresos/traslados, [B34](#b34-detalle-de-categoría-de-gasto-variable-detallecategoriajsx) para gastos.

**Pasos:** Abrir el detalle de la cuenta (si es ingreso/traslado) o de la categoría (si es gasto) donde vive el movimiento → tocar el ícono de lápiz sobre él → cambiar monto/cuenta/categoría/descripción → Guardar.

**Resultado esperado:** El saldo de la(s) cuenta(s) se recalcula correctamente (revierte el efecto del monto viejo y aplica el nuevo). La lista y los totales de la pantalla de detalle desde la que se editó se refrescan solos.

**Casos borde / variantes:**
- Editar un traslado: solo deben ser editables el monto y la descripción; las cuentas de origen/destino deben aparecer bloqueadas (ver [E3](#e3-editar-un-traslado-ya-existente-restricción)).
- Un movimiento vinculado a un gasto fijo (`gasto_fijo_id` no nulo) NO debe mostrar botón de editar en la lista.
- Editar un gasto para cambiarle la categoría, viéndolo desde `DetalleCategoria.jsx` de la categoría ORIGINAL → después de guardar, ese gasto ya no debe aparecer en esa lista (ahora pertenece a otra categoría).

## B19. Eliminar movimiento

**Pasos:** Desde el detalle de la cuenta o de la categoría del movimiento (ver nota de [B18](#b18-editar-movimiento)) → ícono de basurero → confirmar diálogo (el texto cambia si es traslado) → confirmar.

**Resultado esperado:** El saldo de la(s) cuenta(s) revierte el efecto del movimiento borrado, y el movimiento desaparece de la lista y de los totales de la pantalla de detalle sin recargar.

**Casos borde / variantes:** Un movimiento con `gasto_fijo_id` no debe tener botón de eliminar aquí (se desmarca desde [B23](#b23-gastos-fijos-desmarcar-como-pagado), no se borra suelto).

## B20. Gastos fijos: crear

**Pasos:** "Inicio" → "Gestionar gastos fijos" → "Agregar gasto fijo" → nombre, monto, día de pago opcional (1-31) → Guardar.

**Resultado esperado:** Aparece en la lista, ordenado por día de pago, con estado "Pendiente".

**Casos borde / variantes:** Nombre vacío, monto ≤0, o día de pago fuera de 1-31 → error.

## B21. Gastos fijos: editar

**Pasos:** Ícono de lápiz sobre un gasto fijo → cambiar nombre/monto/día de pago → Guardar.

**Resultado esperado:** Si el gasto YA está pagado, el campo de monto debe aparecer bloqueado (deshabilitado, con nota explicativa) — cambiar el monto de un gasto pagado exige desmarcarlo primero. Si se cambia el nombre de un gasto pagado, la descripción del movimiento vinculado debe sincronizarse con el nuevo nombre.

**Casos borde / variantes:** Intentar forzar un cambio de monto en un gasto pagado (vía red/API) → el servicio lo rechaza con error explícito.

## B22. Gastos fijos: marcar como pagado — ⚠️ BUG CONOCIDO

**Precondiciones:** Al menos una cuenta bancaria creada. **La cuenta debe tener la categoría de sistema correctamente marcada (`es_sistema = true`) — ver [B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido).**

**Pasos:**
1. En "Inicio", sección "Gastos fijos", tocar el checkbox de un gasto pendiente.
2. Elegir la cuenta desde la que se paga (`HojaElegirCuentaPago`). Confirmar.

**Resultado esperado:**
- Se crea un movimiento tipo "gasto" con la categoría de sistema, vinculado a ese gasto fijo (`gasto_fijo_id`) y a ESE mes concreto (el índice único en base de datos es por gasto fijo + mes, no de por vida).
- El saldo de la cuenta elegida baja en el monto del gasto fijo.
- El checkbox queda marcado y la barra de progreso de "Gastos fijos" (% pagado) se actualiza.

**Casos borde / variantes:**
- **Sin la reparación del bug ([B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido)):** debe fallar con el mensaje `"Falta la categoría de gastos fijos. Corre el script supabase_categorias_default.sql en Supabase."` — confirmar que este mensaje YA NO aparece después de aplicar `sql/supabase_fix_trigger_categorias.sql`.
- Marcar el mismo gasto como pagado dos veces muy rápido (doble clic, u otra pestaña) → ver [E4](#e4-error-de-doble-clic-en-marcar-gasto-fijo-pagado).
- Cambiar de mes en el selector de período de Inicio y volver a marcar el mismo gasto fijo → debe crear un movimiento NUEVO para ese otro mes (un gasto fijo se puede pagar una vez por mes, no una sola vez de por vida).
- Si falla el descuento de saldo después de crear el movimiento (simular con red inestable) → el movimiento recién creado debe revertirse (no debe quedar un movimiento sin su descuento correspondiente).

## B23. Gastos fijos: desmarcar como pagado

**Precondiciones:** Un gasto fijo pagado en el mes seleccionado.

**Pasos:** Tocar el checkbox ya marcado de un gasto fijo pagado.

**Resultado esperado:** Se borra el movimiento vinculado a ESE mes, el saldo de la cuenta se devuelve, y el checkbox vuelve a "Pendiente".

**Casos borde / variantes:** Falla de red al desmarcar → el checkbox debe revertir visualmente a "pagado" y mostrar error (no quedar en un estado optimista incorrecto).

## B24. Gastos fijos: eliminar

**Pasos:** "Gestionar gastos fijos" → ícono de basurero → confirmar diálogo (el texto avisa si está pagado y menciona el monto que se revertirá).

**Resultado esperado:** Si estaba pagado, primero revierte el pago (reutiliza la misma lógica de "desmarcar": devuelve saldo, borra movimiento) y solo entonces borra el gasto fijo.

**Casos borde / variantes:** Si falla el borrado del gasto fijo DESPUÉS de haber revertido el pago exitosamente → el gasto queda como pendiente (sin movimiento, sin saldo descontado) en vez de un estado inconsistente — vale la pena confirmar este caso con una falla de red simulada.

## B25. Gastos variables (con presupuesto)

**Precondiciones:** Al menos una categoría no-sistema con presupuesto asignado, y algún gasto en ella dentro del período seleccionado.

**Pasos:** En "Inicio", revisar la sección "Gastos variables" — barra de progreso por categoría (gastado vs. presupuesto), y el resumen del total gastado / total con tope.

**Resultado esperado:** Los montos deben coincidir con la suma de movimientos tipo "gasto" de esa categoría, filtrados por el período (mes/quincena) seleccionado — NO con el histórico completo.

**Casos borde / variantes:**
- Categoría sin presupuesto asignado (0) → debe mostrarse sin barra de progreso ("sin tope definido").
- Gasto que supera el presupuesto → confirmar cómo se visualiza (¿barra roja, >100%?).
- La categoría de sistema NUNCA debe aparecer en esta lista (ver [B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido)).

## B26. Filtrado por mes y quincena

**Pasos:**
1. En "Inicio", usar las flechas ‹ › para cambiar de mes.
2. Tocar "1ra quincena" / "2da quincena" / "Completo".

**Resultado esperado:** La tarjeta de saldo (ingresos/gastos/ahorro del período), "Gastos fijos" (siempre por mes completo, sin importar la quincena — un gasto fijo no se puede "pagar a medias") y "Gastos variables" deben recalcularse todos según el filtro activo.

**Casos borde / variantes:**
- Cambiar de diciembre a enero (o viceversa) → debe ajustar también el año.
- Un mes sin ningún movimiento → secciones deben mostrar sus estados vacíos, no romperse.
- Verificar que "Gastos fijos" NO cambia al alternar quincena (por diseño), pero sí cambia al cambiar de mes.
- El selector de mes/quincena de Inicio es independiente del selector de mes de `DetalleCuenta.jsx`/`DetalleCategoria.jsx` (ver [B33](#b33-detalle-de-cuenta-detallecuentajsx)/[B34](#b34-detalle-de-categoría-de-gasto-variable-detallecategoriajsx)): cada pantalla de detalle tiene su propio mes seleccionado, sin quincena, que arranca siempre en el mes actual al entrar (no hereda el mes que estaba elegido en Inicio).

## B27. Resumen: filtro año/mes

**Pasos:** Pestaña "Resumen" → elegir año en el selector (solo aparecen años con movimientos reales + el año actual) → opcionalmente elegir un mes específico, o dejar "todos los meses" para ver el año completo.

**Resultado esperado:** Totales de ingresos, gastos fijos, gastos variables y balance recalculados para el rango elegido.

**Casos borde / variantes:** Año/mes sin ningún movimiento → mensaje de "sin movimientos", sin gráfico ni desglose roto.

## B28. Resumen: gráfico mensual

**Precondiciones:** Ver "todos los meses" de un año con movimientos en más de un mes.

**Pasos:** Con `mesSeleccionado === null`, revisar `GraficoMensualResumen`.

**Resultado esperado:** El gráfico solo debe mostrarse cuando se ve el año completo (al elegir un mes específico, el gráfico desaparece y solo queda el desglose por categoría).

## B29. Resumen: desglose por categoría

**Pasos:** Con datos cargados, revisar `DesgloseCategoriasResumen` (lista de categorías con su % del total de gastos).

**Resultado esperado:** Movimientos sin categoría (o de una categoría borrada) deben agruparse bajo "Sin categoría", no desaparecer ni romper el cálculo.

## B30. Calculadora de cuota de crédito

**Precondiciones:** Ninguna (no requiere datos guardados; es puramente educativa, sin lectura/escritura a Supabase).

**Pasos:** "Cuenta" → "Calculadora de cuota de crédito" → monto, tasa E.A. (%), plazo (lista de meses típicos). El cálculo es reactivo (sin botón "Calcular").

**Resultado esperado:** Muestra cuota mensual (sistema francés), total a pagar, total de intereses, y tasa mensual equivalente.

**Casos borde / variantes:** Monto vacío/≤0 → error. Tasa vacía o negativa → error. Tasa >300% → error ("tasa excesiva"). Tasa exactamente 0% → debe calcular como división simple (monto/plazo), sin dividir por cero.

## B31. Calculadora CDT vs. cuenta de alto rendimiento

**Pasos:** "Cuenta" → "Calculadora CDT" → monto, plazo en meses, tasa del CDT (%), tasa de la cuenta (%), frecuencia de liquidación de la cuenta (diaria/mensual).

**Resultado esperado:** Muestra el monto final de cada opción y una frase indicando cuál rinde más y por cuánto.

**Casos borde / variantes:** Cualquier campo vacío o tasa negativa → error. Tasas >100% → error. Resultado con diferencia menor a $1 → debe mostrar "empate" en vez de la frase comparativa.

## B32. Calculadora de ahorro con interés compuesto

**Pasos:** "Cuenta" → "Calculadora de ahorro" → aporte mensual y/o monto inicial (al menos uno >0), plazo (meses o años), tasa E.A.

**Resultado esperado:** Total acumulado, total aportado, intereses ganados.

**Casos borde / variantes:** Aporte y monto inicial ambos en 0 → error. Plazo vacío/≤0 → error. Tasa vacía, negativa o >100% → error. Tasa 0% → cálculo simple sin interés (aporte × n + inicial), sin dividir por cero.

## B33. Detalle de cuenta (`DetalleCuenta.jsx`)

**Precondiciones:** Al menos una cuenta creada.

**Pasos:**
1. En "Inicio", tocar una fila de la lista de "Mis cuentas" (ahora es un botón completo, con chevron `›`).
2. Revisar el header: avatar/inicial y color de la cuenta, nombre, tipo, saldo actual, y debajo la tarjeta con los 3 totales del mes: "Ingresos", "Egresos", "Neto".
3. Con las flechas ‹ › del selector de mes (sin opción de quincena), cambiar de mes y confirmar que los 3 totales y la lista de abajo se recalculan.
4. Revisar la lista "Ingresos y traslados".
5. Tocar "+ Nuevo movimiento" → se abre el formulario con esta cuenta ya elegida.
6. Sobre un movimiento editable de la lista, tocar el lápiz → editar → Guardar.
7. Sobre un movimiento editable, tocar la basurera → confirmar → se elimina.
8. Tocar el botón "Volver" del header.

**Resultado esperado:**
- Los 3 totales consideran TODOS los movimientos del mes donde participa esta cuenta, incluidos los traslados en ambas direcciones: "Ingresos" = ingresos + traslados donde esta cuenta es el destino; "Egresos" = gastos + traslados donde esta cuenta es el origen; "Neto" = Ingresos − Egresos (en coral si es negativo).
- La lista de abajo excluye los gastos normales — esos solo se ven desde el detalle de su categoría (ver [B34](#b34-detalle-de-categoría-de-gasto-variable-detallecategoriajsx)). Solo lista ingresos y traslados (de entrada y de salida) de esta cuenta.
- Un traslado se muestra con perspectiva direccional: si esta cuenta es el origen, aparece como "Traslado a X" en coral con signo `−`; si es el destino, como "Traslado desde Y" en mint con signo `+` (distinto de cómo se ve un traslado "desde afuera", con flecha `origen → destino` en azul).
- "+ Nuevo movimiento" abre `HojaNuevoMovimiento` con la cuenta ya preseleccionada (se puede cambiar antes de guardar).
- Editar/eliminar actualiza el saldo de la(s) cuenta(s) igual que en [B18](#b18-editar-movimiento)/[B19](#b19-eliminar-movimiento); la lista y los 3 totales de esta pantalla se refrescan solos, sin recargar.
- "Volver" regresa a "Inicio" sin pasar por `App.jsx`: es un estado interno de `Home.jsx` (el mismo patrón de "modo" que usa `Viajes.jsx` para `DetalleViaje.jsx`), así que el botón "+" flotante y la barra de navegación inferior siguen mostrándose igual mientras se navega dentro de una cuenta.

**Casos borde / variantes:**
- Mes sin ingresos ni traslados → mensaje "No hay ingresos ni traslados este mes." en vez de una lista vacía rota.
- Un movimiento vinculado a un gasto fijo (`gasto_fijo_id`) no debe tener botones de editar/eliminar aquí, igual que en cualquier otra lista de movimientos.
- Si la cuenta se elimina (desde "Gestionar cuentas") mientras se está viendo su detalle, `Home.jsx` debe caer de nuevo a la vista de resumen en vez de romperse.
- Un traslado cuya cuenta contraparte (origen o destino) ya fue eliminada → debe mostrar "cuenta eliminada" en el texto direccional en vez de romperse.

## B34. Detalle de categoría de gasto variable (`DetalleCategoria.jsx`)

**Precondiciones:** Al menos una categoría de gasto variable (no de sistema) creada.

**Pasos:**
1. En "Inicio", sección "Gastos variables", tocar una categoría (también es ahora un botón completo, con chevron `›`).
2. Revisar el header: emoji y color de la categoría, nombre, barra de progreso (solo si tiene presupuesto), y los totales del mes.
3. Con el selector de mes (sin quincena), cambiar de mes.
4. Tocar "+ Nuevo gasto" → se abre el formulario con esta categoría ya elegida.
5. Editar/eliminar un gasto de la lista (mismo mecanismo que en [B33](#b33-detalle-de-cuenta-detallecuentajsx)).
6. Tocar "Volver".

**Resultado esperado:**
- Si la categoría tiene presupuesto (>0): se muestran 3 totales — "Presupuesto", "Gastado", "Restante" (en coral si quedó negativo) — y la barra de progreso, calculados con la misma función (`calcularProgresoPresupuesto`) que usa la fila de "Gastos variables" en Inicio, así que ambas vistas siempre coinciden en si está "excedido" y en el % de la barra.
- Si NO tiene presupuesto (0 o vacío): solo se muestra "Gastado" como un único bloque de ancho completo, sin barra de progreso ni grilla de 3 columnas.
- La lista de abajo ("Gastos") son exclusivamente gastos de esta categoría en el mes seleccionado — nunca ingresos ni traslados, porque esos nunca tienen `categoria_id`.
- "+ Nuevo gasto" abre `HojaNuevoMovimiento` con tipo "Gasto" y esta categoría ya preseleccionada.
- "Volver" regresa a "Inicio" con el mismo mecanismo de "modo" interno de [B33](#b33-detalle-de-cuenta-detallecuentajsx).

**Casos borde / variantes:**
- Mes sin gastos en esta categoría → mensaje "No hay gastos este mes en esta categoría."
- Un gasto que supera el presupuesto → la barra se pinta en coral y "Restante" se muestra en coral (negativo), igual que en la fila de Inicio.
- Si la categoría se elimina, o se reasignan sus gastos a otra (ver [B13](#b13-categorías-eliminar-con-reasignación)), mientras se ve su detalle → `Home.jsx` debe caer a la vista de resumen en vez de romperse.
- Un gasto vinculado a un gasto fijo (`gasto_fijo_id`) no debe tener botones de editar/eliminar aquí.

---

# C. Viajes

## C1. Crear viaje

**Pasos:** Pestaña "Viajes" → "Nuevo viaje" (o el botón del estado vacío) → nombre, adultos (mín. 1), niños (mín. 0), fechas desde/hasta opcionales, origen/destino opcionales → Guardar.

**Resultado esperado:** El viaje aparece en la lista. Automáticamente se crean 6 categorías de viaje por defecto en el idioma del usuario (Tiquetes, Transporte, Alimentación, Hotel, Souvenirs, Otros), cada una con presupuesto 0 y moneda COP.

**Casos borde / variantes:**
- Nombre vacío → error. Adultos <1 → error. Niños negativo → error. Fecha "hasta" anterior a "desde" → error.
- Si falla la creación de las categorías por defecto (pero el viaje sí se creó) → debe avisar con un mensaje aparte, sin dar a entender que el viaje no se guardó.

## C2. Editar viaje

**Pasos:** Tarjeta de viaje → "Editar" → cambiar datos → Guardar.

**Resultado esperado:** Cambios reflejados en la tarjeta y en el detalle del viaje.

## C3. Eliminar viaje

**Pasos:** Tarjeta de viaje → "Eliminar" → confirmar diálogo.

**Resultado esperado:** El viaje desaparece de la lista. Verificar qué pasa con sus categorías y gastos asociados (deberían eliminarse en cascada — confirmar en la base de datos que no quedan huérfanos).

## C4. Categorías de viaje con presupuesto

**Precondiciones:** Un viaje creado (con sus 6 categorías por defecto, o vacío si fallaron).

**Pasos:**
1. Abrir el viaje (dashboard/detalle) → sección "Categorías" → "Nueva categoría" (o editar una existente): nombre, emoji, moneda propia (COP/USD/EUR — independiente de la moneda del perfil, porque un viaje puede mezclar monedas), presupuesto.
2. Intentar eliminar una categoría CON gastos ya registrados.
3. Intentar eliminar una categoría SIN gastos.

**Resultado esperado:**
- Crear/editar funciona igual que categorías normales (validaciones de nombre/emoji/presupuesto).
- Eliminar una categoría con gastos debe BLOQUEARSE con un mensaje explícito (a diferencia de las categorías normales, aquí NO hay reasignación — hay que borrar los gastos primero).
- Eliminar una categoría sin gastos debe funcionar directo.

**Casos borde / variantes:** Cambiar la moneda de una categoría después de haber escrito un presupuesto → el monto escrito debe reinterpretarse con las reglas de formato de la nueva moneda (no quedar un valor inválido).

## C5. Gastos de viaje (multi-moneda)

**Pasos:** Dentro del detalle del viaje → "Nuevo gasto" → elegir categoría (grid), fecha (libre, no restringida al rango del viaje — ej. una reserva pagada con anticipación), moneda propia del gasto, monto, descripción opcional → Guardar.

**Resultado esperado:** El gasto aparece en la lista del viaje y se suma a los totales de SU moneda (los totales se agrupan por moneda, no se convierten entre sí).

**Casos borde / variantes:**
- Sin categorías disponibles (todas borradas) → el formulario debe avisar y no dejar guardar.
- Categoría vacía, fecha vacía, o monto ≤0 → error.
- Registrar gastos en 2 monedas distintas dentro del mismo viaje → confirmar que el dashboard y el resumen los muestran SEPARADOS por moneda, nunca sumados entre sí.
- Un gasto sin categoría asignada (o cuya categoría fue borrada) → debe aparecer agrupado como "gasto sin categoría", visible aparte en el detalle.

## C6. Dashboard de viaje (`DetalleViaje.jsx`)

**Pasos:** Tocar una tarjeta de viaje desde la lista.

**Resultado esperado:** Muestra: datos del viaje (fechas, adultos/niños, origen→destino), totales generales por moneda, tarjetas de categoría con su presupuesto vs. gastado, y la lista completa de gastos (más recientes primero).

**Casos borde / variantes:** Viaje recién creado sin gastos → estados vacíos en categorías y gastos, sin romper.

## C7. Resumen de viaje

**Pasos:** Desde el detalle del viaje → "Ver resumen".

**Resultado esperado:** Vista de solo lectura con los totales por moneda y categoría, y la lista de gastos en orden CRONOLÓGICO ascendente (primero al último día, a diferencia del detalle que los muestra más reciente primero). Botón "Volver" regresa al detalle (no a la lista de viajes).

**Casos borde / variantes:** Viaje sin gastos → mensaje de "sin gastos", sin secciones de totales.

---

# D. Otros

## D1. Guía de uso (referencia)

**Pasos:** "Cuenta" → "Guía de uso" → expandir cada una de las 12 secciones (acordeón, una abierta a la vez).

**Resultado esperado:** Cada sección muestra su texto explicativo en el idioma activo. Abrir una nueva sección debe cerrar la anterior.

## D2. Guía de bienvenida (primera vez)

**Precondiciones:** Un usuario cuyo `perfiles.guia_vista = false` (usuarios nuevos nacen así; usuarios viejos migrados nacen en `true` para no interrumpirlos).

**Pasos:**
1. Iniciar sesión con esa cuenta → debe aparecer el overlay de bienvenida automáticamente (carrusel de 4 tarjetas), pero solo después de que moneda/idioma/guía hayan terminado de cargar (para evitar parpadeo en el idioma incorrecto).
2. Navegar con "Siguiente"/"Anterior", o tocar "Saltar" en cualquier punto.

**Resultado esperado:** Cerrar de cualquier forma (terminar el carrusel o saltar) marca `guia_vista = true` de inmediato — no debe volver a aparecer en la siguiente sesión.

**Casos borde / variantes:** Cerrar sesión a mitad del carrusel sin terminarlo → al día siguiente, confirmar si vuelve a aparecer (depende de si se alcanzó a marcar `guia_vista`).

## D3. Documentos legales: Política de Datos y Términos

**Pasos:** Accesible desde 3 lugares: Registro (antes de crear cuenta), `PantallaConsentimiento` (gate), y "Cuenta" → sección "Legal" (después de logueado). Abrir cada documento y volver.

**Resultado esperado:** El texto se muestra siempre en español (aunque la app esté en inglés — solo el botón "Volver" y la línea de versión/fecha se traducen), con la versión y fecha de última actualización visibles (`VERSIONES_LEGALES`). Volver desde cualquiera de los 3 puntos de entrada debe regresar exactamente a donde estaba (sin perder lo que se había escrito en el formulario, si aplica).

## D4. PWA (instalación)

**Precondiciones:** Build de producción servido por HTTPS (o localhost), navegador compatible con instalación de PWA (Chrome/Edge en desktop o Android; en iOS es "Agregar a inicio" desde Safari).

**Pasos:**
1. Abrir la app en el navegador. Verificar que aparece el ícono/botón de instalar (o el prompt automático).
2. Instalar. Abrir la app instalada.
3. Verificar el ícono, nombre "Seed", y que abre en modo `standalone` (sin la barra de navegador).
4. Modificar y desplegar una versión nueva → reabrir la app instalada y confirmar que se actualiza sola en segundo plano (`registerType: 'autoUpdate'`), sin pedirle nada al usuario.

**Resultado esperado:** Ícono y splash correctos, orientación portrait, colores de tema (`#0f1512`) aplicados.

**Casos borde / variantes:** Probar sin conexión después de instalada — el precache cubre el "app shell" (JS/CSS/HTML/iconos), pero NO hay caché de datos de Supabase todavía, así que las pantallas deberían cargar su estructura pero fallar (con los mensajes de error ya previstos) al pedir datos.

## D5. Multi-idioma (es/en)

**Pasos:**
1. En Registro, elegir "English" antes de crear la cuenta → confirmar que TODA la pantalla de registro se traduce en vivo.
2. Completar el registro en inglés.
3. Iniciar sesión con esa cuenta → toda la app (nav, textos, categorías por defecto, mensajes de error) debe estar en inglés.

**Resultado esperado:** Consistencia total del idioma elegido en el registro.

**⚠️ Importante — hallazgo del código, no un supuesto:** el idioma **NO se puede cambiar después de registrarse** desde la UI actual. `IdiomaContext.jsx` solo LEE `perfiles.idioma`; no expone ninguna función de actualización (a diferencia de `MonedaContext`, que sí tiene `cambiarMoneda`). No existe ningún botón "cambiar idioma" en Perfil. Si el usuario/QA esperaba poder cambiar el idioma después de crear la cuenta, ese flujo **no existe en el código actual** — probarlo debe consistir en confirmar que, en efecto, no hay forma de hacerlo desde la interfaz (para no reportarlo como un bug si es una limitación conocida).

**Casos borde / variantes:** Documentos legales (Política/Términos) siempre se muestran en español sin importar el idioma de la cuenta (ver [D3](#d3-documentos-legales-política-de-datos-y-términos)).

## D6. Multi-moneda (COP/USD/EUR)

**Pasos:** Ver [A11](#a11-cambiar-moneda-desde-perfil) para el cambio en Perfil, y el paso de moneda en Registro. Probar además: categorías de viaje y gastos de viaje, que tienen su PROPIA moneda independiente de la del perfil (ver [C4](#c4-categorías-de-viaje-con-presupuesto)/[C5](#c5-gastos-de-viaje-multi-moneda)).

**Resultado esperado:** El formato numérico (separadores, decimales, símbolo) cambia según `utils/monedas.js` (`configMoneda`) en cada input de monto de toda la app.

**Casos borde / variantes:** Escribir un monto con el formato de una moneda y luego cambiar de moneda en el mismo formulario (ej. en gasto de viaje) → el valor debe reinterpretarse correctamente, no quedar corrupto.

---

# E. Flujos adicionales encontrados en el código (no listados por el usuario)

## E1. Ayuda contextual (tooltips `guia.ayuda.*`)

Repartidos por toda la app (`AyudaContextual.jsx`) junto a varios campos y títulos: tipos de movimiento, traslados, quincena, fondo de emergencia, gasto fijo pagado, categoría de sistema, presupuesto opcional, descripción de categoría, meta con fecha, multi-moneda, gastos variables, resumen de totales, y varios campos del módulo de viajes. **Pasos:** tocar cada ícono de ayuda (ⓘ) y confirmar que muestra el texto explicativo correcto para ese contexto específico, en el idioma activo.

## E2. Promoción de 2FA en Home

`TarjetaPromoMfa.jsx` muestra una invitación a activar 2FA en la pantalla de Inicio, SOLO si el usuario no lo tiene activo y no la descartó antes. **Pasos:** con una cuenta sin 2FA, confirmar que aparece en Inicio; tocar "Activar" y confirmar que lleva directo a la sección Seguridad de Perfil (no solo a Perfil en general); descartarla (×) y confirmar que no vuelve a aparecer en esa sesión del navegador (se guarda por `usuario.id`, revisar en qué almacenamiento — probablemente `localStorage`).

## E3. Editar un traslado ya existente (restricción)

Al editar un movimiento tipo "traslado" ya guardado, las cuentas de origen/destino NO son editables (quedan bloqueadas, mostrando "Origen → Destino" como texto fijo) — solo se puede cambiar el monto y la descripción. Si el usuario se equivocó de cuenta, la única vía es borrar el traslado y crear uno nuevo. **Pasos:** crear un traslado, luego intentar editarlo y confirmar que las cuentas están bloqueadas y hay un texto explicando por qué.

## E4. Error de doble clic en "marcar gasto fijo pagado"

Si el mismo gasto fijo se marca como pagado dos veces muy rápido (doble clic, o desde dos pestañas a la vez), el índice único de la base de datos (por gasto fijo + mes) rechaza el segundo intento con el código `23505`, y la app debe mostrar un mensaje específico ("ya quedó marcado como pagado este mes... actualiza la pantalla") en vez de un error genérico. **Pasos:** simular el doble clic (puede requerir código o dos pestañas) y confirmar el mensaje.

## E5. Fila de `fondo_emergencia` o `perfiles` faltante (auto-reparación en cliente)

Varias pantallas asumen que toda cuenta tiene sus filas de `perfiles` y `fondo_emergencia` (creadas por el trigger al registrarse), pero manejan el caso de que falten (cuentas viejas, o afectadas por el mismo tipo de bug que [B14](#b14-categoría-de-sistema-gastos-fijos--️-bug-conocido)):
- `Emergencia.jsx` crea la fila de `fondo_emergencia` sola (con valores por defecto) si no la encuentra, en vez de romperse.
- `MonedaContext`/`IdiomaContext`/`GuiaContext` caen a sus valores por defecto (COP/es/`guia_vista: true`) si la consulta a `perfiles` falla o no devuelve fila.

**Pasos:** con una cuenta de prueba, borrar a mano su fila de `fondo_emergencia` y entrar a la pestaña "Emergencia" → confirmar que la pantalla no se rompe y crea la fila sola.
