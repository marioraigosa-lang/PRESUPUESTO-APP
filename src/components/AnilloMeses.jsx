import { useIdioma } from '../context/IdiomaContext'

const RADIO = 54
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

function AnilloMeses({ mesesCubiertos, metaMeses }) {
  const { t } = useIdioma()
  const progreso = metaMeses > 0 ? Math.min(1, mesesCubiertos / metaMeses) : 0
  const offset = CIRCUNFERENCIA * (1 - progreso)

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--color-line)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={RADIO}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <p className="text-3xl font-bold text-text">{mesesCubiertos.toFixed(1)}</p>
        <p className="text-xs text-text-dim">{t('emergencia.mesesCubiertos')}</p>
      </div>
    </div>
  )
}

export default AnilloMeses
