import { useState } from 'react'
import AvatarUsuario from '../components/AvatarUsuario'
import CalculadoraCuotaCredito from './CalculadoraCuotaCredito'
import CalculadoraCdt from './CalculadoraCdt'
import CalculadoraAhorro from './CalculadoraAhorro'
import { useAuth } from '../context/AuthContext'
import { useMoneda } from '../context/MonedaContext'
import { useIdioma } from '../context/IdiomaContext'
import { MONEDAS } from '../utils/monedas'
import { IDIOMAS } from '../utils/idiomas'

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
    icono: '💳',
  },
  {
    id: 'cdt',
    claveTitulo: 'perfil.calcCdtTitulo',
    claveDescripcion: 'perfil.calcCdtDescripcion',
    icono: '📈',
  },
  {
    id: 'ahorro',
    claveTitulo: 'perfil.calcAhorroTitulo',
    claveDescripcion: 'perfil.calcAhorroDescripcion',
    icono: '🌱',
  },
]

function Perfil() {
  const { usuario, cerrarSesion } = useAuth()
  const { moneda, cambiarMoneda } = useMoneda()
  const { idioma, cambiarIdioma, t } = useIdioma()
  const [cerrando, setCerrando] = useState(false)
  const [calculadoraAbierta, setCalculadoraAbierta] = useState(null)
  const [cambiandoMoneda, setCambiandoMoneda] = useState(false)
  const [errorMoneda, setErrorMoneda] = useState('')
  const [cambiandoIdioma, setCambiandoIdioma] = useState(false)
  const [errorIdioma, setErrorIdioma] = useState('')

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
      setErrorMoneda(err.message)
    } finally {
      setCambiandoMoneda(false)
    }
  }

  // El idioma no tiene el mismo riesgo de "confusión de valores" que la
  // moneda (no hay montos guardados que interpretar distinto), así que
  // cambia de una vez, sin aviso de confirmación.
  async function manejarCambiarIdioma(nuevoIdioma) {
    if (nuevoIdioma === idioma || cambiandoIdioma) return

    setCambiandoIdioma(true)
    setErrorIdioma('')

    try {
      await cambiarIdioma(nuevoIdioma)
    } catch (err) {
      setErrorIdioma(err.message)
    } finally {
      setCambiandoIdioma(false)
    }
  }

  function cerrarCalculadora() {
    setCalculadoraAbierta(null)
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

        <div className="rounded-2xl bg-panel p-4">
          <p className="text-xs text-text-dim">{t('perfil.sesionIniciadaComo')}</p>
          <p className="mt-1 text-sm font-medium text-text">{usuario?.email}</p>
        </div>

        <div className="rounded-2xl bg-panel p-4">
          <p className="mb-2 text-xs text-text-dim">{t('perfil.moneda')}</p>
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
            <p className="mt-2 text-xs text-coral">
              {t('perfil.monedaError')}
              {errorMoneda}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-panel p-4">
          <p className="mb-2 text-xs text-text-dim">{t('perfil.idioma')}</p>
          <div className="flex gap-2 rounded-full bg-panel-2 p-1">
            {Object.values(IDIOMAS).map((opcion) => (
              <button
                key={opcion.codigo}
                type="button"
                onClick={() => manejarCambiarIdioma(opcion.codigo)}
                disabled={cambiandoIdioma}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  idioma === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-dim">{t('perfil.idiomaNota')}</p>
          {errorIdioma && (
            <p className="mt-2 text-xs text-coral">
              {t('perfil.idiomaError')}
              {errorIdioma}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={manejarCerrarSesion}
          disabled={cerrando}
          className="w-full rounded-2xl bg-panel-2 py-3 text-sm font-semibold text-coral disabled:opacity-60"
        >
          {cerrando ? t('perfil.cerrandoSesion') : t('perfil.cerrarSesion')}
        </button>

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
                className="flex items-center gap-3 rounded-2xl bg-panel p-4 text-left transition-colors hover:bg-panel-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-lg">
                  {calculadora.icono}
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
      </div>
    </main>
  )
}

export default Perfil
