// Calcula el "monto mensual típico" a partir de una lista de movimientos ya
// filtrados por tipo (solo gastos, o solo ingresos — nunca traslados, que no
// son ni lo uno ni lo otro), cada uno con `monto` y `fecha` en formato
// 'YYYY-MM-DD'. El nombre quedó como "gasto" porque nació para ese caso,
// pero la lógica no sabe ni le importa si son gastos o ingresos: por eso
// también se reutiliza tal cual para calcular el ingreso mensual promedio
// (ver Emergencia.jsx).
//
// Regla:
// - Sin gastos -> 0 (sin dividir por cero).
// - Gastos en un solo mes calendario -> el gasto real de ese mes, sin
//   promediar (dividir entre 1 mes sería lo mismo, pero así queda explícito
//   que no estamos "inventando" un promedio con un solo dato).
// - Gastos en dos o más meses calendario distintos -> el promedio del total
//   de esos meses (total general / cantidad de meses CON actividad).
//
// "Meses con actividad" = meses calendario que tienen al menos un gasto
// registrado, no todos los meses transcurridos desde el primer uso. La
// alternativa (contar también los meses sin ningún gasto como $0) diluye el
// promedio con meses en los que el usuario simplemente no usó la app
// todavía o no tuvo gastos, lo cual no representa el gasto típico real y
// además penalizaría a alguien que apenas empieza a registrar sus gastos.
export function gastoMensualPromedio(gastos) {
  if (gastos.length === 0) return 0

  const totalesPorMes = new Map()
  for (const { monto, fecha } of gastos) {
    const mes = fecha.slice(0, 7)
    totalesPorMes.set(mes, (totalesPorMes.get(mes) ?? 0) + monto)
  }

  const totalGeneral = [...totalesPorMes.values()].reduce((suma, monto) => suma + monto, 0)
  return totalGeneral / totalesPorMes.size
}
