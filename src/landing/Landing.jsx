import { useRef, useState } from 'react'
import { Apple, CreditCard, PiggyBank, Plane, PieChart, PlayCircle, Share2, ShieldCheck, Zap } from 'lucide-react'
import IndicadorScroll from './IndicadorScroll'
import LogoBrote from './LogoBrote'
import Revelar from './Revelar'
import TarjetaBeneficio from './TarjetaBeneficio'
import { detectarPlataforma } from './plataforma'
import {
  BENEFICIOS,
  CIERRE,
  COMPARTIR,
  CONTACTO_EMAIL,
  DESCARGA,
  HERO,
  PLAY_STORE_PUBLICADO,
  PLAY_STORE_URL,
  PRIVACIDAD,
  PROPOSITO,
  URL_SEED,
} from './contenido'

const ICONOS = { Zap, CreditCard, PieChart, PiggyBank, Plane }

function Eyebrow({ children }) {
  return (
    <p className="text-xs font-semibold tracking-[0.2em] text-mint uppercase">{children}</p>
  )
}

function BotonPrimario({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full bg-mint px-8 py-3.5 text-sm font-semibold text-bg transition hover:bg-mint/90 ${className}`}
    >
      {children}
    </button>
  )
}

function BotonSecundario({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border border-line px-8 py-3.5 text-sm font-semibold text-text transition hover:border-mint/50 hover:text-mint ${className}`}
    >
      {children}
    </button>
  )
}

export default function Landing({ onEntrar }) {
  // Se muestra un instante tras copiar el enlace (fallback de compartir en
  // navegadores sin Web Share API -- ver manejarCompartir). null cuando no
  // hay nada que mostrar.
  const [mensajeCompartir, setMensajeCompartir] = useState(null)
  // Lazy initializer: se calcula una sola vez, de forma síncrona (mismo
  // criterio que debeMostrarApp en RaizApp.jsx). Solo se usa para resaltar
  // el badge de tienda del visitante en el hero (ver plataforma.js) --
  // 'android' | 'ios' | null, nunca oculta el otro.
  const [plataforma] = useState(() => detectarPlataforma())
  // Destino del indicador de scroll del hero (ver IndicadorScroll.jsx): la
  // sección justo debajo, a la que baja suavemente al tocarlo.
  const refProposito = useRef(null)

  async function manejarCompartir() {
    const datos = {
      title: COMPARTIR.tituloCompartir,
      text: COMPARTIR.textoCompartir,
      url: URL_SEED,
    }

    if (navigator.share) {
      try {
        await navigator.share(datos)
      } catch {
        // El usuario cerró el menú de compartir del sistema (AbortError) o
        // falló por otro motivo -- no es un error real, no hay nada que
        // mostrarle.
      }
      return
    }

    // Fallback para navegadores de escritorio sin Web Share API (ej.
    // Firefox/Chrome desktop en algunas versiones): copiar el enlace y
    // avisar, en vez de dejar el botón sin ningún efecto visible.
    try {
      await navigator.clipboard.writeText(URL_SEED)
      setMensajeCompartir(COMPARTIR.enlaceCopiado)
    } catch {
      // clipboard.writeText también puede fallar (permisos, contexto no
      // seguro) -- como último recurso, mostramos el enlace en sí para que
      // el usuario lo copie a mano.
      setMensajeCompartir(URL_SEED)
    } finally {
      setTimeout(() => setMensajeCompartir(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header minimal, fijo: logo + acceso rápido a "Iniciar sesión" --
          duplica el CTA secundario del hero para quien ya conoce la app y
          llega directo a buscar el login. */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoBrote className="h-7 w-7" />
            <span className="text-base font-semibold tracking-tight">Seed</span>
          </div>
          <button
            type="button"
            onClick={() => onEntrar('login')}
            className="text-sm text-text-dim transition hover:text-text"
          >
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* HERO -- todo el primer pantallazo: logo, promesa, los dos CTAs
          principales y, por debajo (más pequeño, sin competir con ellos),
          los badges de tienda y el acceso a compartir. Jerarquía a
          propósito: "Empezar gratis" es lo único que debe saltar a la
          vista; el resto acompaña. */}
      <section className="relative flex flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-mint/15 blur-3xl"
        />
        <Revelar className="relative flex flex-col items-center">
          <LogoBrote className="h-20 w-20 sm:h-24 sm:w-24" />
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-text sm:text-7xl">Seed</h1>
          <p className="mt-4 text-xl font-medium text-mint sm:text-2xl">{HERO.subtitulo}</p>
          <p className="mt-6 max-w-xl text-base text-text-dim sm:text-lg">{HERO.gancho}</p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <BotonPrimario onClick={() => onEntrar('registro')}>Empezar gratis</BotonPrimario>
            <BotonSecundario onClick={() => onEntrar('login')}>Ya tengo cuenta</BotonSecundario>
          </div>

          {/* Badges de tienda -- compactos y atenuados a propósito (son
              "próximamente", no una acción): mismo resalte de plataforma
              que antes (borde mint sutil en la del visitante, ver
              plataforma.js), sin ocultar nunca la otra. */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {PLAY_STORE_PUBLICADO ? (
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium text-text-dim transition hover:text-text ${
                  plataforma === 'android' ? 'border-mint/50' : 'border-line'
                }`}
              >
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {DESCARGA.android.disponible}
              </a>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs text-text-dim opacity-70 ${
                  plataforma === 'android' ? 'border-mint/40' : 'border-line'
                }`}
              >
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {DESCARGA.android.proximamente}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs text-text-dim opacity-70 ${
                plataforma === 'ios' ? 'border-mint/40' : 'border-line'
              }`}
            >
              <Apple className="h-3.5 w-3.5" aria-hidden="true" />
              {DESCARGA.ios.proximamente}
            </span>
          </div>

          {/* Instrucción de instalar en iPhone -- el único detalle que no
              cabe en un badge compacto. <details> nativo: cero JS extra,
              accesible por defecto, oculto hasta que alguien lo busca. El
              resumen es una afirmación ("Instálalo...") a propósito, no una
              pregunta -- invita a la acción con confianza. */}
          <details className="mt-2.5 text-xs text-text-dim">
            <summary className="cursor-pointer list-none underline decoration-dotted underline-offset-2 hover:text-text">
              {DESCARGA.ios.tituloInstalar}
            </summary>
            <p className="mt-1.5 max-w-xs">{DESCARGA.ios.instruccionInstalar}</p>
          </details>

          {/* Compartir -- discreto, un enlace con icono, no un botón mint:
              es la acción menos prioritaria del hero. */}
          <button
            type="button"
            onClick={manejarCompartir}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-text-dim transition hover:text-mint"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            {COMPARTIR.boton}
          </button>
          {mensajeCompartir && <p className="mt-1.5 text-xs text-mint">{mensajeCompartir}</p>}
        </Revelar>

        <IndicadorScroll destinoRef={refProposito} />
      </section>

      {/* PROPÓSITO -- tratado como el manifiesto/corazón de Seed, no como
          una sección más: línea vertical mint tipo cita, fondo panel muy
          sutil, más aire, y una revelación más lenta y notable que el
          resto (duracionMs/distanciaPx por encima del default). */}
      <section ref={refProposito} className="px-6 py-24 sm:py-32">
        <Revelar
          as="blockquote"
          duracionMs={1100}
          distanciaPx={32}
          className="mx-auto max-w-2xl rounded-2xl border-l-4 border-mint bg-panel/40 py-10 pr-8 pl-8 sm:py-12 sm:pr-12 sm:pl-10"
        >
          <Eyebrow>Nuestro propósito</Eyebrow>
          <p className="mt-5 text-xl leading-relaxed font-medium text-text sm:text-2xl">
            {PROPOSITO.parrafo.map((segmento, i) =>
              typeof segmento === 'string' ? (
                <span key={i}>{segmento}</span>
              ) : (
                <span key={i} className="text-mint">
                  {segmento.destacado}
                </span>
              ),
            )}
          </p>
        </Revelar>
      </section>

      {/* BENEFICIOS -- cada tarjeta es un acordeón (ver TarjetaBeneficio.jsx):
          limpia por defecto (icono + título + una línea), se expande al
          click con 2-3 frases más de detalle. */}
      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Revelar className="mx-auto max-w-2xl text-center">
            <Eyebrow>Todo en un solo lugar</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Todo lo que necesitas para ver claro
            </h2>
          </Revelar>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {BENEFICIOS.map((item, i) => (
              <TarjetaBeneficio
                key={item.titulo}
                icono={ICONOS[item.icono]}
                titulo={item.titulo}
                descripcion={item.descripcion}
                detalle={item.detalle}
                retraso={(i % 3) * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACIDAD -- banda con más peso visual que una tarjeta normal */}
      <section className="border-y border-line bg-panel-2 px-6 py-16 sm:py-20">
        <Revelar className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10">
            <ShieldCheck className="h-7 w-7 text-mint" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-text sm:text-3xl">{PRIVACIDAD.titulo}</h2>
          <p className="mx-auto mt-4 max-w-xl text-text-dim">{PRIVACIDAD.parrafo}</p>
        </Revelar>
      </section>

      {/* CIERRE + CTA */}
      <section className="px-6 py-24 text-center sm:py-28">
        <Revelar className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {CIERRE.titulo}
          </h2>
          <p className="mt-4 text-text-dim">{CIERRE.parrafo}</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <BotonPrimario onClick={() => onEntrar('registro')}>Empezar gratis</BotonPrimario>
          </div>
        </Revelar>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-text-dim">
            <LogoBrote className="h-5 w-5" />
            <span>© {new Date().getFullYear()} Seed</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-dim">
            <a href="/politica.html" className="transition hover:text-text">
              Política de privacidad
            </a>
            <a href="/terminos.html" className="transition hover:text-text">
              Términos
            </a>
            <a href={`mailto:${CONTACTO_EMAIL}`} className="transition hover:text-text">
              {CONTACTO_EMAIL}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
