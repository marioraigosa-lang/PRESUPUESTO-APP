// Devuelve la CLAVE de traducción del mensaje según el estado del fondo (no
// el texto ya armado): así el componente que llama a esto decide en qué
// idioma mostrarlo con t(clave), sin que este util (que no es un componente
// y no tiene acceso al idioma activo) tenga que preocuparse por eso.
export function mensajeFondo(meses) {
  if (meses < 1) {
    return { clave: 'emergencia.mensajeMenosDeUnMes', tono: 'alerta' }
  }

  if (meses < 3) {
    return { clave: 'emergencia.mensajeMenosDeTresMeses', tono: 'neutral' }
  }

  if (meses < 6) {
    return { clave: 'emergencia.mensajeMenosDeSeisMeses', tono: 'neutral' }
  }

  return { clave: 'emergencia.mensajeSeisMasMeses', tono: 'positivo' }
}
