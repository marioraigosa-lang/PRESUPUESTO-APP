import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useIdioma } from '../context/IdiomaContext'
import { estaDescartadaPromoMfa, descartarPromoMfa } from '../utils/promoMfa'
import Tarjeta from './ui/Tarjeta'
import BotonPrimario from './ui/BotonPrimario'

// Invitación amable (no obligatoria) a activar el 2FA, visible en Perfil
// solo para quien todavía no lo tiene activo. `onActivar` la pasa Perfil.jsx
// para abrir SeguridadPerfil.jsx sin que este componente conozca esa
// navegación interna.
function TarjetaPromoMfa({ onActivar }) {
  const { usuario, tieneMfaActivo, cargandoMfa } = useAuth()
  const { t } = useIdioma()
  const [descartada, setDescartada] = useState(() => estaDescartadaPromoMfa(usuario?.id))

  // Mientras no se sabe si ya tiene 2FA (cargandoMfa) no se muestra nada,
  // para no hacerla parpadear un instante si resulta que sí lo tiene.
  if (cargandoMfa || tieneMfaActivo || descartada) return null

  function manejarDescartar() {
    descartarPromoMfa(usuario?.id)
    setDescartada(true)
  }

  return (
    <Tarjeta variante="mint" className="relative flex flex-col gap-2">
      <button
        type="button"
        onClick={manejarDescartar}
        aria-label={t('seguridad.promoDescartarAria')}
        className="absolute right-3 top-3 text-text-dim hover:text-text"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-2 pr-6">
        <ShieldCheck className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
        <p className="text-sm font-semibold text-text">{t('seguridad.promoTitulo')}</p>
      </div>
      <p className="text-xs leading-relaxed text-text-dim">{t('seguridad.promoTexto')}</p>
      <BotonPrimario onClick={onActivar} className="mt-1">
        {t('seguridad.promoBoton')}
      </BotonPrimario>
    </Tarjeta>
  )
}

export default TarjetaPromoMfa
