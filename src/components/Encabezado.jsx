import AvatarUsuario from './AvatarUsuario'

function Encabezado({ subtitulo = 'Tus cuentas, en un solo lugar' }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-lg font-bold text-bg">
          S
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text">Seed</h1>
          <p className="text-xs text-text-dim">{subtitulo}</p>
        </div>
      </div>
      <AvatarUsuario />
    </header>
  )
}

export default Encabezado
