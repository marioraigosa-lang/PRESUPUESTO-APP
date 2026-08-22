import { useEffect, useState } from 'react'
import { CreditCard, TrendingUp, Sprout, BookOpen, ShieldCheck, Lock, FileText, Trash2 } from 'lucide-react'
import AvatarUsuario from '../components/AvatarUsuario'
import CalculadoraCuotaCredito from './CalculadoraCuotaCredito'
import CalculadoraCdt from './CalculadoraCdt'
import CalculadoraAhorro from './CalculadoraAhorro'
import GuiaUso from './GuiaUso'
import SeguridadPerfil from './SeguridadPerfil'
import PoliticaDatos from './PoliticaDatos'
import TerminosCondiciones from './TerminosCondiciones'
import EliminarCuenta from './EliminarCuenta'
import AyudaContextual from '../components/AyudaContextual'
import { useAuth } from '../context/AuthContext'
import { useMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { MONEDAS } from '../utils/monedas'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'
import BotonSecundario from '../components/ui/BotonSecundario'

// Herramientas educativas de cálculo: no leen ni escriben nada en Supabase,
// solo hacen cuentas en pantalla con lo que el usuario escribe. Título y
// descripción van por clave (no por texto fijo) porque esta lista sí vive
// en Perfil.jsx -- las pantallas de cada calculadora en sí se traducen en
// una fase posterior.
const CALCULADORAS = [
  {
    id: 'cuota',
    claveTitulo: 'perfil.calcCuotaTitulo',
    claveDescripcion: 'perfil.calcCuotaDescripcion',
    Icono: CreditCard,
  },
  {
    id: 'cdt',
    claveTitulo: 'perfil.calcCdtTitulo',
    claveDescripcion: 'perfil.calcCdtDescripcion',
    Icono: TrendingUp,
  },
  {
    id: 'ahorro',
    claveTitulo: 'perfil.calcAhorroTitulo',
    claveDescripcion: 'perfil.calcAhorroDescripcion',
    Icono: Sprout,
  },
]

function Perfil({ abrirSeguridadInicial = false, onSeguridadInicialConsumida }) {
  const { usuario, cerrarSesion, tieneMfaActivo } = useAuth()
  const { moneda, cambiarMoneda } = useMoneda()
  const { t } = useIdioma()
  const [cerrando, setCerrando] = useState(false)
  const [calculadoraAbierta, setCalculadoraAbierta] = useState(null)
  const [guiaAbierta, setGuiaAbierta] = useState(false)
  // 'politica' | 'terminos' | null -- mismo criterio que calculadoraAbierta:
  // un solo estado en vez de dos booleanos, porque nunca hay más de un
  // documento legal abierto a la vez.
  const [documentoLegalAbierto, setDocumentoLegalAbierto] = useState(null)
  // Si se llegó acá desde la tarjeta de promoción de Home.jsx, abre
  // Seguridad de una vez -- el valor inicial se lee UNA sola vez (lazy
  // init) porque Perfil se monta de cero cada vez que `vista` vuelve a
  // 'mas' en App.jsx.
  const [seguridadAbierta, setSeguridadAbierta] = useState(() => abrirSeguridadInicial)
  const [cambiandoMoneda, setCambiandoMoneda] = useState(false)
  const [errorMoneda, setErrorMoneda] = useState('')
  const [eliminarCuentaAbierta, setEliminarCuentaAbierta] = useState(false)

  useEffect(() => {
    if (abrirSeguridadInicial) {
      onSeguridadInicialConsumida?.()
    }
    // Solo debe correr una vez, al montar: es lo que "consume" la señal de
    // App.jsx para que no se repita en la próxima visita normal a Perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function manejarCerrarSesion() {
    setCerrando(true)
    await cerrarSesion()
  }

  // No hay conversión entre monedas: cambiar de moneda solo cambia el
  // símbolo y el formato con que se muestran los montos, nunca el número
  // guardado. Se avisa ANTES de aplicar el cambio para que el usuario no se
  // confunda al ver, por ejemplo, un saldo de "1.000.000" convertirse en
  // "US$1,000,000.00" sin que su plata realmente haya cambiado.
  async function manejarCambiarMoneda(nuevaMoneda) {
    if (nuevaMoneda === moneda || cambiandoMoneda) return

    const confirmado = window.confirm(t('perfil.monedaConfirmacion'))
    if (!confirmado) return

    setCambiandoMoneda(true)
    setErrorMoneda('')

    try {
      await cambiarMoneda(nuevaMoneda)
    } catch (err) {
      console.error(err)
      setErrorMoneda(true)
    } finally {
      setCambiandoMoneda(false)
    }
  }

  function cerrarCalculadora() {
    setCalculadoraAbierta(null)
  }

  if (guiaAbierta) {
    return <GuiaUso onVolver={() => setGuiaAbierta(false)} />
  }

  if (seguridadAbierta) {
    return <SeguridadPerfil onVolver={() => setSeguridadAbierta(false)} />
  }

  if (documentoLegalAbierto === 'politica') {
    return <PoliticaDatos onVolver={() => setDocumentoLegalAbierto(null)} />
  }

  if (documentoLegalAbierto === 'terminos') {
    return <TerminosCondiciones onVolver={() => setDocumentoLegalAbierto(null)} />
  }

  if (eliminarCuentaAbierta) {
    return <EliminarCuenta onVolver={() => setEliminarCuentaAbierta(false)} />
  }

  if (calculadoraAbierta === 'cuota') {
    return <CalculadoraCuotaCredito onVolver={cerrarCalculadora} />
  }
  if (calculadoraAbierta === 'cdt') {
    return <CalculadoraCdt onVolver={cerrarCalculadora} />
  }
  if (calculadoraAbierta === 'ahorro') {
    return <CalculadoraAhorro onVolver={cerrarCalculadora} />
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-text">{t('perfil.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('perfil.subtitulo')}</p>
          </div>
          <AvatarUsuario />
        </header>

        <Tarjeta>
          <p className="text-xs text-text-dim">{t('perfil.sesionIniciadaComo')}</p>
          <p className="mt-1 text-sm font-medium text-text">{usuario?.email}</p>
        </Tarjeta>

        <Tarjeta>
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-xs text-text-dim">{t('perfil.moneda')}</p>
            <AyudaContextual clave="guia.ayuda.multiMoneda" etiqueta={t('guia.ayuda.multiMonedaAria')} />
          </div>
          <div className="flex gap-2 rounded-full bg-panel-2 p-1">
            {Object.values(MONEDAS).map((opcion) => (
              <button
                key={opcion.codigo}
                type="button"
                onClick={() => manejarCambiarMoneda(opcion.codigo)}
                disabled={cambiandoMoneda}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  moneda === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
                }`}
              >
                {opcion.codigo}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-dim">{t('perfil.monedaNota')}</p>
          {errorMoneda && (
            <MensajeError className="mt-2 px-3 py-2 text-xs">{t('perfil.monedaError')}</MensajeError>
          )}
        </Tarjeta>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('perfil.seguridadTitulo')}
          </h2>
          <button
            type="button"
            onClick={() => setSeguridadAbierta(true)}
            className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-panel-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-text-dim">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{t('perfil.seguridadItemTitulo')}</p>
              <p className="truncate text-xs text-text-dim">
                {tieneMfaActivo ? t('seguridad.estadoActivo') : t('seguridad.estadoInactivo')}
              </p>
            </div>
            <span className="shrink-0 text-text-dim">›</span>
          </button>
        </section>

        <BotonSecundario onClick={manejarCerrarSesion} disabled={cerrando} className="text-coral">
          {cerrando ? t('perfil.cerrandoSesion') : t('perfil.cerrarSesion')}
        </BotonSecundario>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('perfil.ayudaTitulo')}
          </h2>
          <button
            type="button"
            onClick={() => setGuiaAbierta(true)}
            className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-panel-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-text-dim">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{t('perfil.guiaTitulo')}</p>
              <p className="truncate text-xs text-text-dim">{t('perfil.guiaDescripcion')}</p>
            </div>
            <span className="shrink-0 text-text-dim">›</span>
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('perfil.legalTitulo')}
          </h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setDocumentoLegalAbierto('politica')}
              className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-panel-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-text-dim">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{t('perfil.politicaTitulo')}</p>
                <p className="truncate text-xs text-text-dim">{t('perfil.politicaDescripcion')}</p>
              </div>
              <span className="shrink-0 text-text-dim">›</span>
            </button>
            <button
              type="button"
              onClick={() => setDocumentoLegalAbierto('terminos')}
              className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-panel-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-text-dim">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{t('perfil.terminosTitulo')}</p>
                <p className="truncate text-xs text-text-dim">{t('perfil.terminosDescripcion')}</p>
              </div>
              <span className="shrink-0 text-text-dim">›</span>
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t('perfil.calculadoras')}
          </h2>
          <div className="flex flex-col gap-2">
            {CALCULADORAS.map((calculadora) => (
              <button
                key={calculadora.id}
                type="button"
                onClick={() => setCalculadoraAbierta(calculadora.id)}
                className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-panel-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-text-dim">
                  <calculadora.Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{t(calculadora.claveTitulo)}</p>
                  <p className="truncate text-xs text-text-dim">
                    {t(calculadora.claveDescripcion)}
                  </p>
                </div>
                <span className="shrink-0 text-text-dim">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-coral/80">
            {t('perfil.zonaPeligroTitulo')}
          </h2>
          <button
            type="button"
            onClick={() => setEliminarCuentaAbierta(true)}
            className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4 text-left transition-colors hover:bg-coral/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-coral">{t('perfil.eliminarCuentaTitulo')}</p>
              <p className="truncate text-xs text-text-dim">{t('perfil.eliminarCuentaDescripcion')}</p>
            </div>
            <span className="shrink-0 text-text-dim">›</span>
          </button>
        </section>
      </div>
    </main>
  )
}

export default Perfil
