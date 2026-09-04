import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reiniciarDatos } from './reinicio'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}))

describe('reiniciarDatos', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('llama a la función RPC con borrar_gastos_fijos = false por defecto', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })

    await reiniciarDatos({ usuarioId: 'user-1' })

    expect(rpcMock).toHaveBeenCalledWith('reiniciar_datos_usuario', { borrar_gastos_fijos: false })
  })

  it('pasa borrar_gastos_fijos = true cuando se elige reiniciar todo', async () => {
    rpcMock.mockResolvedValueOnce({ error: null })

    await reiniciarDatos({ usuarioId: 'user-1' }, { borrarGastosFijos: true })

    expect(rpcMock).toHaveBeenCalledWith('reiniciar_datos_usuario', { borrar_gastos_fijos: true })
  })

  it('lanza un error con el mensaje de Supabase si la función RPC falla', async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: 'permission denied' } })

    await expect(reiniciarDatos({ usuarioId: 'user-1' })).rejects.toThrow('permission denied')
  })

  it('lanza un error genérico si la RPC falla sin mensaje', async () => {
    rpcMock.mockResolvedValueOnce({ error: {} })

    await expect(reiniciarDatos({ usuarioId: 'user-1' })).rejects.toThrow('No se pudieron reiniciar los datos')
  })

  it('rechaza sin llamar a la RPC si no hay sesión activa', async () => {
    await expect(reiniciarDatos({ usuarioId: null })).rejects.toThrow('No hay una sesión activa')
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
