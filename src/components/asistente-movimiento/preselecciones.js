// Valida que un id "propuesto" -- una preselección explícita por props
// (cuentaPreseleccionadaId/categoriaPreseleccionadaId) o una sugerencia de
// "última cuenta/categoría usada" (ver ultimoUsado.js) -- siga existiendo en
// la lista actual antes de ofrecerlo. Sin esto, un id obsoleto (la cuenta o
// categoría se borró después de guardarse como preselección o como "última
// usada") dejaría a flujos.js saltando un paso hacia un id fantasma, sin
// ningún paso donde el usuario pueda corregirlo.
//
// Devuelve el id tal cual si es válido, o '' si no -- '' es el mismo valor
// "sin nada" que ya usa el resto del borrador (ver estadoInicialAsistente en
// reductorAsistente.js), nunca undefined.
export function idValidoEnLista(id, lista) {
  return lista.some((item) => item.id === id) ? id : ''
}
