import { useEffect, useState } from 'react'
import Interruptor from './Interruptor'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'

const COLORES = [
  '#4fd1a5',
  '#f2795b',
  '#e9b949',
  '#60a5fa',
  '#c084fc',
  '#f472b6',
  '#94a3b8',
  '#38bdf8',
]

function HojaCuenta({ abierta, onCerrar, onGuardar, onActualizar, cuentaEditando }) {
  const editando = Boolean(cuentaEditando)
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [color, setColor] = useState(COLORES[0])
  const [saldo, setSaldo] = useState('')
  const [esAhorro, setEsAhorro] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (cuentaEditando) {
      setNombre(cuentaEditando.nombre)
      setTipo(cuentaEditando.tipo || '')
      setColor(cuentaEditando.color || COLORES[0])
      setSaldo(String(cuentaEditando.saldo ?? ''))
      setEsAhorro(Boolean(cuentaEditando.es_ahorro))
    } else {
      setNombre('')
      setTipo('')
      setColor(COLORES[0])
      setSaldo('')
      setEsAhorro(false)
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, cuentaEditando])

  if (!abierta) return null

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioNombre(evento) {
    setNombre(evento.target.value)
    setError('')
  }

  function manejarCambioSaldo(evento) {
    setSaldo(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError('Ingresa un nombre para la cuenta')
      return
    }
    if (saldo === '' || Number(saldo) < 0) {
      setError('Ingresa un saldo válido')
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      color,
      saldo: Number(saldo),
      esAhorro,
    }

    try {
      if (editando) {
        await onActualizar(cuentaEditando.id, datos)
      } else {
        await onGuardar(datos)
      }

      cerrarYLimpiar()
    } catch (err) {
      setErrorGuardado(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const saldoFormateado = formatearEntradaMonto(saldo, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {editando ? 'Editar cuenta' : 'Nueva cuenta'}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ×
          </button>
        </div>

        <div>
          <label htmlFor="nombreCuenta" className="mb-1 block text-xs text-text-dim">
            Nombre
          </label>
          <input
            id="nombreCuenta"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder="Ej: Nequi"
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <label htmlFor="tipoCuenta" className="mb-1 block text-xs text-text-dim">
            Tipo (opcional)
          </label>
          <input
            id="tipoCuenta"
            type="text"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            placeholder="Ej: Cuenta de ahorros"
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={`Color ${opcion}`}
                onClick={() => setColor(opcion)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  color === opcion ? 'ring-2 ring-text ring-offset-2 ring-offset-panel' : ''
                }`}
                style={{ backgroundColor: opcion }}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="saldoCuenta" className="mb-1 block text-xs text-text-dim">
            Saldo
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="saldoCuenta"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={saldoFormateado}
              onChange={manejarCambioSaldo}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-panel-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              ¿El saldo de esta cuenta es parte de tu fondo de emergencia?
            </p>
            <p className="mt-0.5 text-xs leading-snug text-text-dim">
              Las cuentas de ahorro o inversión suman a tu colchón para imprevistos.
            </p>
          </div>
          <Interruptor
            activo={esAhorro}
            onCambiar={() => setEsAhorro((actual) => !actual)}
            etiqueta="¿Esta cuenta es parte de tu fondo de emergencia?"
          />
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}
        {errorGuardado && (
          <p className="text-xs text-coral">No se pudo guardar la cuenta: {errorGuardado}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar cuenta'}
        </button>
      </form>
    </div>
  )
}

export default HojaCuenta
