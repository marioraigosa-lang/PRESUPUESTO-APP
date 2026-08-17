import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import MensajeError from './ui/MensajeError'

function HojaReasignarCategoria({
  abierta,
  onCerrar,
  categorias,
  categoria,
  cantidadMovimientos,
  onConfirmar,
}) {
  const { t, tp } = useIdioma()
  const [categoriaDestinoId, setCategoriaDestinoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  const opciones = categorias.filter((c) => c.id !== categoria?.id)

  useEffect(() => {
    if (!abierta) return
    setCategoriaDestinoId(opciones[0]?.id ?? '')
    setErrorGuardado('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, categoria])

  if (!abierta || !categoria) return null

  function cerrarYLimpiar() {
    if (guardando) return
    setErrorGuardado('')
    onCerrar()
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    if (!categoriaDestinoId) {
      setErrorGuardado(t('categorias.reasignar.errorSeleccionVacia'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar(categoriaDestinoId)
    } catch (err) {
      console.error(err)
      setErrorGuardado(t('categorias.reasignar.errorGuardar'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('categorias.reasignar.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarConfirmar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text">{t('categorias.reasignar.titulo')}</h2>
            <p className="truncate text-xs text-text-dim">
              {tp('categorias.reasignar.contador', cantidadMovimientos, { nombre: categoria.nombre })}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('categorias.reasignar.cerrarAria')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-text-dim">
          {t('categorias.reasignar.instruccion', { nombre: categoria.nombre })}
        </p>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('categorias.reasignar.moverALabel')}</p>

          {opciones.length === 0 ? (
            <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
              {t('categorias.reasignar.sinOpciones')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {opciones.map((opcion) => {
                const activo = opcion.id === categoriaDestinoId
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    onClick={() => setCategoriaDestinoId(opcion.id)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      activo ? 'bg-mint/15 ring-1 ring-mint' : 'bg-panel-2'
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${opcion.color}26` }}
                    >
                      {opcion.emoji}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                      {opcion.nombre}
                    </p>
                    {activo && <Check className="h-4 w-4 shrink-0 text-mint" strokeWidth={3} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {errorGuardado && <MensajeError>{errorGuardado}</MensajeError>}

        <button
          type="submit"
          disabled={guardando || !categoriaDestinoId}
          className="mt-1 w-full rounded-2xl bg-coral py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('categorias.reasignar.moviendo') : t('categorias.reasignar.confirmar')}
        </button>
      </form>
    </div>
  )
}

export default HojaReasignarCategoria
