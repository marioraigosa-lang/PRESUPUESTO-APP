function Proximamente({ titulo }) {
  return (
    <main className="flex min-h-screen flex-col bg-bg px-4 py-6">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center gap-3 pb-28 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-panel text-3xl">
          🚧
        </div>
        <h1 className="text-lg font-semibold text-text">{titulo}</h1>
        <p className="text-sm text-text-dim">Próximamente</p>
      </div>
    </main>
  )
}

export default Proximamente
