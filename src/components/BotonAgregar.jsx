import { useIdioma } from '../context/IdiomaContext'

function BotonAgregar({ onClick }) {
  const { t } = useIdioma()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('home.registrarMovimiento')}
      className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-mint px-5 py-3.5 text-sm font-semibold text-bg shadow-lg shadow-black/40 transition-transform active:scale-95"
    >
      <span className="text-lg font-light leading-none">+</span>
      {t('home.registrarMovimiento')}
    </button>
  )
}

export default BotonAgregar
