// Diccionario en español. Es el idioma con el que ya funcionaba la app
// antes del multi-idioma, así que sirve también como el RESPALDO: si una
// clave no existe todavía en otro idioma (por ejemplo, mientras se van
// traduciendo pantallas fase a fase), src/i18n/index.js cae aquí.
//
// Claves organizadas por pantalla/sección (nav, perfil, registro...) para
// que sea fácil ubicar a qué archivo pertenece cada una. Por ahora solo
// están las de Perfil, Registro y la navegación inferior (Fase 1). Las
// demás pantallas se agregan en las siguientes fases sin tocar esta
// estructura.
export default {
  nav: {
    inicio: 'Inicio',
    emergencia: 'Fondo',
    resumen: 'Resumen',
    viajes: 'Viajes',
    mas: 'Cuenta',
  },

  // Textos compartidos por varias pantallas (nombres de meses, quincenas,
  // el menú de cuenta que aparece en el encabezado de Inicio/Emergencia/
  // Resumen). Los nombres de mes van en minúscula a propósito: cada sitio
  // que los usa decide si capitalizar o no según el contexto.
  comun: {
    meses: [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ],
    mesesAbrev: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    quincena: {
      primera: '1ª quincena',
      segunda: '2ª quincena',
      completo: 'Mes completo',
    },
    menuCuenta: 'Menú de tu cuenta',
    errorCerrarSesion: 'No se pudo cerrar la sesión. Intenta de nuevo.',
    mostrarContrasena: 'Mostrar contraseña',
    ocultarContrasena: 'Ocultar contraseña',

    // Medidor de fortaleza (MedidorFortaleza.jsx + utils/fortalezaContrasena.js):
    // se muestra bajo el campo de contraseña en Registro.jsx y
    // EstablecerNuevaContrasena.jsx. Es solo informativo/motivacional, nunca
    // bloquea el envío -- el único requisito bloqueante es el mínimo de 10
    // caracteres, validado aparte. Las "sugerencia*" son pistas breves y no
    // regañonas: solo se muestra UNA a la vez (la primera que aplique).
    fortalezaDebil: 'Débil',
    fortalezaMedia: 'Media',
    fortalezaFuerte: 'Fuerte',
    fortalezaMuyFuerte: 'Muy fuerte',
    fortalezaSugerenciaLongitud: 'Una contraseña más larga la hace más fuerte.',
    fortalezaSugerenciaMayuscula: 'Agrega una mayúscula para hacerla más fuerte.',
    fortalezaSugerenciaNumero: 'Agrega un número para hacerla más fuerte.',
    fortalezaSugerenciaSimbolo: 'Agrega un símbolo (como !, # o %) para hacerla más fuerte.',
  },

  home: {
    subtituloDineroDisponible: 'Dinero disponible (todas las cuentas)',
    misCuentas: 'Mis cuentas',
    gestionarCuentas: 'Gestionar cuentas',
    cargandoCuentas: 'Cargando cuentas...',
    errorCargarCuentas: 'No se pudieron cargar las cuentas. Intenta de nuevo.',
    totalDisponible: 'Total disponible',
    ingresos: 'Ingresos',
    gastos: 'Gastos',
    ahorro: 'Ahorro',
    mesAnterior: 'Mes anterior',
    mesSiguiente: 'Mes siguiente',
    registrarMovimiento: 'Registrar movimiento',

    gastosFijosTitulo: 'Gastos fijos del periodo',
    gestionarGastosFijos: 'Gestionar gastos fijos',
    cargandoGastosFijos: 'Cargando gastos fijos...',
    errorCargarGastosFijos: 'No se pudieron cargar los gastos fijos. Intenta de nuevo.',
    pagadoPorcentaje: 'Pagado {{porcentaje}}%',
    pagadoDeTotal: '{{pagado}} de {{total}}',
    faltaPorPagar: 'Falta por pagar',
    errorDesmarcar: 'No se pudo desmarcar "{{nombre}}". Intenta de nuevo.',
    venceDia: 'Vence día {{dia}}',
    sinFecha: 'Sin fecha',

    gastosVariablesTitulo: 'Gastos variables por categoría',
    gestionarCategorias: 'Gestionar categorías',
    cargandoCategorias: 'Cargando categorías...',
    errorCargarCategorias: 'No se pudieron cargar las categorías. Intenta de nuevo.',
    totalGastado: 'Total gastado',
    topesResumen: '{{monto}} en topes definidos ({{conTope}} de {{total}} {{palabra}})',
    categoriaContador: { uno: 'categoría', otro: 'categorías' },
    deMontoPresupuesto: 'de {{monto}}',

    movimientosTitulo: 'Movimientos recientes',
    cargandoMovimientos: 'Cargando movimientos...',
    errorCargarMovimientos: 'No se pudieron cargar los movimientos. Intenta de nuevo.',
    errorEliminarMovimiento: 'No se pudo eliminar el movimiento. Intenta de nuevo.',
    sinMovimientos: 'No hay movimientos en este mes.',
    confirmarEliminarTraslado:
      '¿Eliminar el traslado "{{descripcion}}"? Se revertirá en ambas cuentas (origen y destino). Esta acción no se puede deshacer.',
    confirmarEliminarMovimiento:
      '¿Eliminar "{{descripcion}}"? Se devolverá su efecto al saldo de la cuenta. Esta acción no se puede deshacer.',
    editarMovimiento: 'Editar movimiento {{descripcion}}',
    eliminarMovimiento: 'Eliminar movimiento {{descripcion}}',
    cuentaEliminada: 'Cuenta eliminada',
    sinCuenta: 'Sin cuenta',
    vieneDeGastoFijo: 'Viene de un gasto fijo: para cambiarlo, desmárcalo desde Gastos fijos',
  },

  resumen: {
    titulo: 'Resumen',
    subtitulo: 'Tu panorama financiero por periodo',
    todoElAnio: 'Todo el año',
    cargando: 'Cargando resumen...',
    error: 'No se pudo cargar el resumen. Intenta de nuevo.',
    sinMovimientos: 'No hay movimientos en este periodo.',
    ingresos: 'Ingresos',
    gastos: 'Gastos',
    fijos: 'Fijos: {{monto}}',
    variables: 'Variables: {{monto}}',
    balancePeriodo: 'Balance del periodo',
    graficoTitulo: 'Ingresos y gastos por mes',
    categoriasTitulo: 'Gastos por categoría',
    sinCategoria: 'Sin categoría',
  },

  emergencia: {
    titulo: 'Fondo de emergencia',
    subtitulo: 'Tu colchón para los imprevistos',
    mesesCubiertos: 'meses cubiertos',
    cargando: 'Cargando fondo de emergencia...',
    fondoErrorCarga: 'No se pudo cargar el fondo de emergencia. Intenta de nuevo.',
    calculadoConCuentas: 'Calculado con tus cuentas marcadas como ahorro: {{cuentas}}',
    sinCuentasAhorro: 'No tienes cuentas marcadas como ahorro',
    fondoActual: 'Fondo actual',
    gastoMensual: 'Gasto mensual',
    meta: 'Meta',
    metaMeses: { uno: '{{count}} mes', otro: '{{count}} meses' },
    ajustarMeta: 'Ajustar meta',
    promptMeta: '¿Cuántos meses quieres como meta? (1 a 12)',
    metaErrorGuardar: 'No se pudo guardar la meta. Intenta de nuevo.',
    explicacion:
      'Tomamos tu gasto mensual promedio y lo dividimos en tu fondo actual. Eso te dice cuántos meses podrías sostenerte si te quedaras sin ingresos. Lo recomendado son entre 3 y 6 meses.',
    mensajeSinGastos: 'Todavía no registras gastos, así que no podemos calcular cuánto cubre tu fondo.',
    mensajeMenosDeUnMes: '⚠️ Tu fondo cubre menos de un mes. Es tu prioridad #1.',
    mensajeMenosDeTresMeses: 'Vas por buen camino. La meta mínima recomendada son 3 meses.',
    mensajeMenosDeSeisMeses: '¡Bien! Ya tienes un colchón sólido. Apunta a 6 meses.',
    mensajeSeisMasMeses: '🎉 Excelente. Tienes 6+ meses cubiertos.',
    metasTitulo: 'Metas de ahorro',
    nuevaMeta: '+ Nueva meta',
    cargandoMetas: 'Cargando metas...',
    metasErrorCarga: 'No se pudieron cargar las metas de ahorro. Intenta de nuevo.',
    metaErrorEliminar: 'No se pudo eliminar la meta. Intenta de nuevo.',
    sinMetas: 'Aún no tienes metas de ahorro. Crea la primera con "+ Nueva meta".',
    confirmarEliminarMeta: '¿Eliminar "{{nombre}}"? Esta acción no se puede deshacer.',
    metaProgreso: '{{ahorrado}} de {{objetivo}}',
    metaAlcanzada: '🎉 ¡Meta alcanzada!',
    verProyeccion: 'Ver proyección ▾',
    ocultarProyeccion: 'Ocultar proyección ▴',
    metaPara: 'Meta para {{fecha}}',
    anioSinFecha: 'Año {{anio}} · Sin fecha objetivo',
    editarMetaAria: 'Editar meta {{nombre}}',
    eliminarMetaAria: 'Eliminar meta {{nombre}}',
    metaSinFecha: 'Esta meta no tiene fecha objetivo. Edítala y elige un mes y año para ver la proyección.',
    // Mensajes de generarRecomendacionMeta (proyeccionMeta.js): ese util
    // devuelve clave+valores en vez de un texto armado (mismo patrón que
    // emergencia.mensajeMenosDeUnMes y compañía, arriba), así que acá solo
    // están las plantillas.
    proyeccion: {
      fechaPasada: '📅 La fecha objetivo ({{fecha}}) ya pasó. Actualiza la fecha de tu meta para ver una proyección real.',
      capacidadNegativa:
        '⚠️ Tus gastos superan tus ingresos por {{exceso}}; tu ahorro no crece. Equilibra tu presupuesto antes de la meta.',
      sobrado: '🎉 ¡Vas sobrado! A este ritmo alcanzas tu meta antes de {{fecha}}. Podrías subir la meta.',
      enCamino: '✅ Vas en camino. Ahorrando {{ahorroMensual}} al mes llegas a tu meta para {{fecha}}.',
      noAlcanza:
        '📊 A tu ritmo llegarás a {{proyeccion}}, te faltarían {{diferencia}}. Para lograrla necesitas ahorrar {{necesario}} al mes (ahora ahorras {{ahorroMensual}}). Opciones: recorta {{recorte}} en gastos, o ajusta tu meta a {{proyeccion}} o mueve la fecha.',
    },
    metaFormulario: {
      nuevoTitulo: 'Nueva meta de ahorro',
      editarTitulo: 'Editar meta de ahorro',
      cerrarAria: 'Cerrar',
      nombreLabel: 'Nombre',
      nombrePlaceholder: 'Ej: Meta de ahorro 2026',
      montoLabel: 'Monto objetivo',
      fechaLabel: 'Fecha objetivo (mes y año)',
      errorNombreVacio: 'Ingresa un nombre para la meta',
      errorMontoInvalido: 'Ingresa un monto objetivo mayor a cero',
      errorFechaVacia: 'Elige el mes y año para tu meta',
      errorGuardar: 'No se pudo guardar la meta. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarMeta: 'Guardar meta',
    },
  },

  cuentas: {
    gestion: {
      volverAria: 'Volver',
      titulo: 'Gestionar cuentas',
      subtitulo: 'Agrega, edita y marca tus cuentas de ahorro',
      agregarCuenta: '+ Agregar cuenta',
      cargando: 'Cargando cuentas...',
      errorCargar: 'No se pudieron cargar las cuentas. Intenta de nuevo.',
      errorEliminar: 'No se pudo eliminar la cuenta. Intenta de nuevo.',
      errorActualizar: 'No se pudo actualizar la cuenta. Intenta de nuevo.',
      confirmarEliminar: '¿Eliminar la cuenta "{{nombre}}"? Esta acción no se puede deshacer.',
      sinCuentas: 'Aún no tienes cuentas. Crea la primera con "+ Agregar cuenta".',
      badgeAhorro: 'Ahorro',
      editarAria: 'Editar cuenta {{nombre}}',
      eliminarAria: 'Eliminar cuenta {{nombre}}',
      fondoAhorroLabel: 'Cuenta para fondo de ahorro',
      fondoAhorroAria: 'Marcar {{nombre}} como cuenta de ahorro',
    },
    formulario: {
      nuevoTitulo: 'Nueva cuenta',
      editarTitulo: 'Editar cuenta',
      cerrarAria: 'Cerrar',
      nombreLabel: 'Nombre',
      nombrePlaceholder: 'Ej: Nequi',
      tipoLabel: 'Tipo (opcional)',
      tipoPlaceholder: 'Ej: Cuenta de ahorros',
      colorLabel: 'Color',
      colorAria: 'Color {{color}}',
      saldoLabel: 'Saldo',
      esAhorroPregunta: '¿El saldo de esta cuenta es parte de tu fondo de emergencia?',
      esAhorroAyuda: 'Las cuentas de ahorro o inversión suman a tu colchón para imprevistos.',
      esAhorroAria: '¿Esta cuenta es parte de tu fondo de emergencia?',
      errorNombreVacio: 'Ingresa un nombre para la cuenta',
      errorSaldoInvalido: 'Ingresa un saldo válido',
      errorGuardar: 'No se pudo guardar la cuenta. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarCuenta: 'Guardar cuenta',
    },
    // Fase 1 de "cuentas navegables": pantalla que se abre al tocar una
    // cuenta en Inicio, con sus movimientos del mes. Reutiliza a propósito
    // varias claves de "home.*" (cargando/error/vacío/confirmaciones de
    // movimientos) porque son genéricas y ya dicen exactamente lo mismo.
    detalle: {
      volverAria: 'Volver a inicio',
      abrirDetalleAria: 'Ver movimientos de {{nombre}}',
      nuevoMovimiento: '+ Nuevo movimiento',
      trasladoA: 'Traslado a {{cuenta}}',
      trasladoDesde: 'Traslado desde {{cuenta}}',
      // Los 3 totales del mes (ver DetalleCuenta.jsx).
      ingresosTitulo: 'Ingresos',
      egresosTitulo: 'Egresos',
      netoTitulo: 'Neto',
      // Lista de abajo: ingresos + traslados (de entrada y de salida), sin
      // los gastos normales -- ver DetalleCuenta.jsx.
      listaTitulo: 'Ingresos y traslados',
      sinMovimientosLista: 'No hay ingresos ni traslados este mes.',
    },
  },

  categorias: {
    gestion: {
      volverAria: 'Volver',
      titulo: 'Gestionar categorías',
      subtitulo: 'Crea, edita y elimina tus categorías de gasto',
      agregarCategoria: '+ Agregar categoría',
      cargando: 'Cargando categorías...',
      errorCargar: 'No se pudieron cargar las categorías. Intenta de nuevo.',
      errorEliminar: 'No se pudo eliminar la categoría. Intenta de nuevo.',
      confirmarEliminar: '¿Eliminar la categoría "{{nombre}}"? Esta acción no se puede deshacer.',
      sinCategorias: 'Aún no tienes categorías. Crea la primera con "+ Agregar categoría".',
      topeMensual: 'Tope mensual: {{monto}}',
      sinTopeDefinido: 'Sin tope definido',
      editarAria: 'Editar categoría {{nombre}}',
      eliminarAria: 'Eliminar categoría {{nombre}}',
      sistemaEtiqueta: '🔒 Categoría del sistema',
      sistemaDescripcion: 'Se usa para los gastos fijos pagados. No se puede editar ni eliminar.',
    },
    formulario: {
      nuevoTitulo: 'Nueva categoría',
      editarTitulo: 'Editar categoría',
      cerrarAria: 'Cerrar',
      nombreLabel: 'Nombre',
      nombrePlaceholder: 'Ej: Mercado',
      emojiLabel: 'Emoji',
      emojiAria: 'Emoji de la categoría',
      emojiAyuda: 'Escribe uno o elige abajo',
      colorLabel: 'Color',
      colorAria: 'Color {{color}}',
      presupuestoLabel: 'Tope mensual (opcional)',
      presupuestoPlaceholder: 'Sin tope',
      presupuestoAyuda:
        'Déjalo vacío si no quieres ponerle un tope a esta categoría; solo se mostrará el total gastado.',
      descripcionLabel: 'Descripción (opcional)',
      descripcionPlaceholder: 'Ej: Café, snacks, propinas...',
      descripcionAyuda: 'Un texto de ayuda corto que se muestra debajo del nombre de la categoría.',
      errorNombreVacio: 'Ingresa un nombre para la categoría',
      errorEmojiVacio: 'Elige un emoji',
      errorPresupuestoInvalido: 'El tope mensual no puede ser negativo',
      errorGuardar: 'No se pudo guardar la categoría. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarCategoria: 'Guardar categoría',
    },
    reasignar: {
      titulo: 'Mover gastos y eliminar',
      cerrarAria: 'Cerrar',
      contador: {
        uno: '"{{nombre}}" tiene {{count}} movimiento',
        otro: '"{{nombre}}" tiene {{count}} movimientos',
      },
      instruccion: 'Para eliminar "{{nombre}}" primero elige a qué categoría se mueven sus gastos.',
      moverALabel: 'Mover gastos a',
      sinOpciones: 'No tienes otra categoría disponible. Crea una primero.',
      errorSeleccionVacia: 'Selecciona una categoría destino',
      errorGuardar: 'No se pudo completar la acción. Intenta de nuevo.',
      moviendo: 'Moviendo y eliminando...',
      confirmar: 'Mover gastos y eliminar categoría',
    },
    // Fase 2 de "categorías navegables": pantalla que se abre al tocar una
    // categoría de gasto variable en Inicio, con sus gastos del mes. Solo
    // aplica a categorías de gasto variable (la de sistema, "Gastos fijos",
    // ni siquiera llega a esta lista -- se filtra antes, igual que en
    // GastosVariables.jsx).
    detalle: {
      volverAria: 'Volver a inicio',
      abrirDetalleAria: 'Ver gastos de {{nombre}}',
      // Los totales del mes: 3 si tiene presupuesto (Presupuesto/Gastado/
      // Restante), o solo "Gastado" si no tiene tope definido.
      presupuestoTitulo: 'Presupuesto',
      gastadoTitulo: 'Gastado',
      restanteTitulo: 'Restante',
      gastosTitulo: 'Gastos',
      nuevoGasto: '+ Nuevo gasto',
      sinGastos: 'No hay gastos este mes en esta categoría.',
    },
  },

  gastosFijos: {
    gestion: {
      volverAria: 'Volver',
      titulo: 'Gestionar gastos fijos',
      subtitulo: 'Crea, edita y elimina tus gastos fijos',
      agregarGastoFijo: '+ Agregar gasto fijo',
      cargando: 'Cargando gastos fijos...',
      errorCargar: 'No se pudieron cargar los gastos fijos. Intenta de nuevo.',
      errorEliminar: 'No se pudo eliminar el gasto fijo. Intenta de nuevo.',
      sinGastosFijos: 'Aún no tienes gastos fijos. Crea el primero con "+ Agregar gasto fijo".',
      confirmarEliminarPagado:
        '"{{nombre}}" ya está pagado. Al eliminarlo se devolverá {{monto}} a la cuenta y se borrará el movimiento vinculado. Esta acción no se puede deshacer. ¿Continuar?',
      confirmarEliminarPendiente: '¿Eliminar el gasto fijo "{{nombre}}"? Esta acción no se puede deshacer.',
      estadoPagado: 'Pagado',
      estadoPendiente: 'Pendiente',
      editarAria: 'Editar gasto fijo {{nombre}}',
      eliminarAria: 'Eliminar gasto fijo {{nombre}}',
    },
    formulario: {
      nuevoTitulo: 'Nuevo gasto fijo',
      editarTitulo: 'Editar gasto fijo',
      cerrarAria: 'Cerrar',
      nombreLabel: 'Nombre',
      nombrePlaceholder: 'Ej: Arriendo',
      montoLabel: 'Monto mensual',
      montoBloqueadoAyuda:
        'Este gasto ya está pagado. Para cambiar el monto, primero desmárcalo desde la pantalla principal.',
      diaPagoLabel: 'Día de pago (opcional)',
      diaPagoPlaceholder: 'Ej: 5',
      errorNombreVacio: 'Ingresa un nombre para el gasto fijo',
      errorMontoInvalido: 'Ingresa un monto válido',
      errorDiaPagoInvalido: 'El día de pago debe estar entre 1 y 31',
      errorGuardar: 'No se pudo guardar el gasto fijo. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarGastoFijo: 'Guardar gasto fijo',
    },
  },

  movimientos: {
    formulario: {
      nuevoTitulo: 'Nuevo movimiento',
      editarTitulo: 'Editar movimiento',
      cerrarAria: 'Cerrar',
      trasladoBadge: '🔄 Traslado entre cuentas',
      tipoLabel: 'Tipo',
      tipoGasto: 'Gasto',
      tipoIngreso: 'Ingreso',
      tipoTraslado: 'Traslado',
      montoLabel: 'Monto',
      errorMontoVacio: 'Ingresa un monto',
      errorCuentasTraslado: 'Selecciona cuenta de origen y de destino',
      errorCuentasIguales: 'La cuenta de origen y destino deben ser distintas',
      cuentasBloqueadasLabel: 'Cuentas (no se pueden cambiar al editar)',
      cuentasBloqueadasAyuda: '¿Te equivocaste de cuenta? Borra este traslado y crea uno nuevo.',
      cuentaOrigenLabel: 'Cuenta origen',
      cuentaDestinoLabel: 'Cuenta destino',
      sufijoOrigen: ' (origen)',
      minimoCuentasTraslado: 'Necesitas al menos 2 cuentas para hacer un traslado.',
      cuentaLabel: 'Cuenta',
      categoriaLabel: 'Categoría',
      descripcionLabel: 'Descripción (opcional)',
      descripcionPlaceholderTraslado: 'Ej: Ahorro del mes',
      descripcionPlaceholderGasto: 'Ej: Cine con amigos',
      errorGuardar: 'No se pudo guardar el movimiento. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarMovimiento: 'Guardar movimiento',
      cuentaGenerica: 'Cuenta',
      cuentaEliminada: 'Cuenta eliminada',
    },
    elegirCuentaPago: {
      titulo: 'Marcar como pagado',
      cerrarAria: 'Cerrar',
      preguntaCuenta: '¿De qué cuenta se pagó?',
      sinCuentas: 'No tienes cuentas registradas todavía.',
      errorSinCuenta: 'Selecciona una cuenta',
      errorGuardar: 'No se pudo marcar como pagado. Intenta de nuevo.',
      guardando: 'Guardando...',
      confirmar: 'Confirmar pago',
    },
  },

  viajes: {
    titulo: 'Planifica tus viajes',
    subtitulo: 'Organiza el presupuesto de tus próximos viajes',
    misViajes: 'Mis viajes',
    nuevoViaje: '+ Nuevo viaje',
    cargando: 'Cargando viajes...',
    errorCargar: 'No se pudieron cargar los viajes. Intenta de nuevo.',
    errorEliminar: 'No se pudo eliminar el viaje. Intenta de nuevo.',
    vacio: {
      titulo: '¡Planea tu primer viaje!',
      descripcion: 'Organiza fechas, presupuesto y gastos de tu próxima escapada en un solo lugar.',
      boton: 'Crear mi primer viaje',
    },
    confirmarEliminar: '¿Eliminar el viaje "{{nombre}}"? Esta acción no se puede deshacer.',
    editarViajeAria: 'Editar viaje {{nombre}}',
    eliminarViajeAria: 'Eliminar viaje {{nombre}}',
    verDetalle: 'Ver detalle',
    desdeFecha: 'Desde {{fecha}}',
    hastaFecha: 'Hasta {{fecha}}',
    sinFechas: 'Sin fechas definidas',
    adultosContador: { uno: '{{count}} adulto', otro: '{{count}} adultos' },
    ninosContador: { uno: '{{count}} niño', otro: '{{count}} niños' },
    formulario: {
      nuevoTitulo: 'Nuevo viaje',
      editarTitulo: 'Editar viaje',
      nombreLabel: 'Nombre del viaje',
      nombrePlaceholder: 'Ej: París 2026',
      adultosLabel: 'Adultos',
      ninosLabel: 'Niños',
      fechaDesdeLabel: 'Fecha desde',
      fechaHastaLabel: 'Fecha hasta',
      origenLabel: 'Origen',
      origenPlaceholder: 'Ej: Bogotá',
      destinoLabel: 'Destino',
      destinoPlaceholder: 'Ej: Cartagena',
      errorNombreVacio: 'Ingresa un nombre para el viaje',
      errorAdultosMinimo: 'Debe haber al menos 1 adulto',
      errorNinosInvalido: 'La cantidad de niños no puede ser negativa',
      errorFechaInvalida: 'La fecha hasta no puede ser anterior a la fecha desde',
      errorGuardar: 'No se pudo guardar el viaje. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarViaje: 'Guardar viaje',
      cerrarAria: 'Cerrar',
    },
    categoriasDefecto: {
      tiquetes: 'Tiquetes avión',
      transporte: 'Costos de desplazamiento',
      alimentacion: 'Alimentación',
      hotel: 'Hotel',
      souvenirs: 'Souvenirs',
      otros: 'Otros',
    },
    detalle: {
      volverAria: 'Volver a mis viajes',
      categoriasTitulo: 'Categorías del viaje',
      nuevaCategoria: '+ Nueva categoría',
      cargandoCategorias: 'Cargando categorías...',
      errorCargar: 'No se pudieron cargar los datos del viaje. Intenta de nuevo.',
      errorCargarCategorias: 'Error al cargar las categorías: ',
      sinCategorias: 'Aún no hay categorías para este viaje.',
      errorCategoriasDefecto:
        'El viaje se creó, pero no se pudieron crear sus categorías por defecto. Intenta crearlas manualmente.',
      errorEliminarCategoria: 'No se pudo eliminar la categoría. Intenta de nuevo.',
      confirmarEliminarCategoria: '¿Eliminar la categoría "{{nombre}}"? Esta acción no se puede deshacer.',
      editarCategoriaAria: 'Editar categoría {{nombre}}',
      eliminarCategoriaAria: 'Eliminar categoría {{nombre}}',
      presupuestoLabel: 'Presupuesto',
      errorCategoriaConGastos:
        'No puedes eliminar una categoría que tiene gastos registrados. Elimina primero sus gastos.',
      gastosTitulo: 'Gastos del viaje',
      nuevoGasto: '+ Nuevo gasto',
      cargandoGastos: 'Cargando gastos...',
      errorCargarGastos: 'Error al cargar los gastos: ',
      sinGastos: 'Aún no hay gastos para este viaje.',
      errorEliminarGasto: 'No se pudo eliminar el gasto. Intenta de nuevo.',
      confirmarEliminarGasto: '¿Eliminar el gasto "{{descripcion}}"? Esta acción no se puede deshacer.',
      editarGastoAria: 'Editar gasto {{descripcion}}',
      eliminarGastoAria: 'Eliminar gasto {{descripcion}}',
      gastoSinDescripcion: 'Gasto',
      gastoSinCategoria: 'Sin categoría',
      sinPresupuestoDefinido: 'Sin presupuesto definido',
      ejecutadoDePresupuesto: '{{ejecutado}} de {{presupuesto}}',
      otrosGastosPrefijo: 'Otros gastos en otra moneda: ',
      gastosSinCategoriaTitulo: 'Gastos sin categoría',
      gastosSinCategoriaNota:
        'Estos gastos quedaron sin categoría (por ejemplo, porque se eliminó la categoría a la que pertenecían).',
      verResumen: 'Ver resumen',
    },
    resumen: {
      titulo: 'Resumen del viaje',
      volverAria: 'Volver al detalle del viaje',
      cargando: 'Cargando resumen...',
      errorCargar: 'No se pudo cargar el resumen. Intenta de nuevo.',
      sinGastos: 'Aún no has registrado gastos en este viaje.',
      totalesTitulo: 'Total gastado',
      listaTitulo: 'Todos los gastos',
    },
    categoriaFormulario: {
      nuevoTitulo: 'Nueva categoría',
      editarTitulo: 'Editar categoría',
      nombreLabel: 'Nombre',
      nombrePlaceholder: 'Ej: Actividades',
      emojiLabel: 'Emoji',
      presupuestoLabel: 'Presupuesto',
      monedaLabel: 'Moneda',
      errorNombreVacio: 'Ingresa un nombre para la categoría',
      errorEmojiVacio: 'Elige un emoji',
      errorPresupuestoInvalido: 'El presupuesto no puede ser negativo',
      errorGuardar: 'No se pudo guardar la categoría. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarCategoria: 'Guardar categoría',
      cerrarAria: 'Cerrar',
    },
    gastoFormulario: {
      nuevoTitulo: 'Nuevo gasto',
      editarTitulo: 'Editar gasto',
      categoriaLabel: 'Categoría',
      sinCategoriasDisponibles: 'Crea primero una categoría para poder registrar gastos.',
      fechaLabel: 'Fecha',
      montoLabel: 'Monto',
      monedaLabel: 'Moneda',
      descripcionLabel: 'Descripción (opcional)',
      descripcionPlaceholder: 'Ej: Taxi al aeropuerto',
      errorCategoriaVacia: 'Selecciona una categoría',
      errorFechaVacia: 'Ingresa una fecha',
      errorMontoInvalido: 'Ingresa un monto mayor a 0',
      errorGuardar: 'No se pudo guardar el gasto. Intenta de nuevo.',
      guardando: 'Guardando...',
      guardarCambios: 'Guardar cambios',
      guardarGasto: 'Guardar gasto',
      cerrarAria: 'Cerrar',
    },
  },

  calculadoraCredito: {
    volverAria: 'Volver',
    titulo: 'Cuota de crédito',
    subtitulo: 'Sistema de amortización francés (cuota fija)',
    montoLabel: 'Monto del crédito',
    tasaLabel: 'Tasa de interés (% E.A. — Efectivo Anual)',
    plazoLabel: 'Plazo',
    plazoMeses: { uno: '{{count}} mes', otro: '{{count}} meses' },
    plazoAnios: { uno: '{{count}} año', otro: '{{count}} años' },
    plazoVivienda: 'vivienda',
    errorMontoVacio: 'Ingresa el monto del crédito',
    errorTasaVacia: 'Ingresa la tasa de interés (% E.A.)',
    errorTasaExcesiva: 'Ingresa una tasa razonable (hasta 300% E.A.)',
    errorCalculo: 'No se pudo calcular con estos datos. Revisa el monto, la tasa y el plazo.',
    cuotaMensualLabel: 'Cuota mensual',
    totalAPagar: {
      uno: 'Total a pagar ({{count}} cuota)',
      otro: 'Total a pagar ({{count}} cuotas)',
    },
    totalInteresesLabel: 'Total de intereses',
    tasaMensualLabel: 'Tasa mensual equivalente',
    notaEducativa:
      'Cálculo estimado con fines educativos. Los valores reales de tu banco pueden variar por seguros, comisiones u otros cargos. Consulta las condiciones exactas con tu entidad financiera.',
  },

  calculadoraCdt: {
    volverAria: 'Volver',
    titulo: 'CDT vs. cuenta de alto rendimiento',
    subtitulo: 'Compara dónde rinde más tu plata',
    montoLabel: 'Monto a invertir',
    plazoLabel: 'Plazo (meses)',
    plazoPlaceholder: 'Ej: 6',
    tasaCdtLabel: 'Tasa CDT (% E.A.)',
    tasaCuentaLabel: 'Tasa cuenta (% E.A.)',
    frecuenciaLabel: 'Frecuencia de liquidación (cuenta de alto rendimiento)',
    frecuenciaDiaria: 'Diaria',
    frecuenciaMensual: 'Mensual',
    errorMontoVacio: 'Ingresa el monto a invertir',
    errorPlazoVacio: 'Ingresa el plazo en meses',
    errorTasasVacias: 'Ingresa las dos tasas de interés (% E.A.)',
    errorTasasExcesivas: 'Ingresa tasas razonables (hasta 100% E.A.)',
    errorCalculo: 'No se pudo calcular con estos datos. Revisa el monto, las tasas y el plazo.',
    cdtBadge: 'CDT',
    cuentaAltoRendimientoLabel: 'Cuenta alto rendimiento',
    ganadorCuenta: 'La cuenta de alto rendimiento',
    ganadorCdt: 'El CDT',
    comparacion: '{{ganador}} rinde más, por {{monto}} al final del plazo',
    empate: 'Ambas opciones rinden prácticamente igual',
    notaFrecuencia:
      '¿Diaria o mensual: cuál rinde más? Cuando dos productos anuncian la misma tasa efectiva anual (E.A.), en realidad rinden prácticamente igual sin importar si liquidan los intereses cada día o cada mes -- la E.A. ya lleva "incorporado" el efecto de la capitalización, por eso se llama "efectiva". Lo que sí es cierto es la idea general: entre más seguido te liquiden los intereses, más rápido empiezan esos intereses a generar sus propios intereses (interés compuesto). Verás una ventaja real de la liquidación diaria cuando las dos opciones parten de una tasa distinta a esa frecuencia (no de la misma E.A.), o en el mundo real, por pequeñas diferencias en cómo cada entidad cuenta los días.',
    notaSupuestos:
      'Supuesto de este cálculo: el CDT paga los intereses al vencimiento con su tasa E.A. aplicada sobre el plazo en años. La cuenta de alto rendimiento liquida intereses con la frecuencia que elijas arriba, así que su tasa E.A. se convierte a la tasa equivalente por periodo (diaria o mensual) y se capitaliza periodo a periodo, usando el promedio real de días por mes (365/12) para que el plazo en días y en meses representen exactamente el mismo tiempo. Cálculo estimado con fines educativos: los valores reales pueden variar por GMF, retención en la fuente u otras condiciones. Consulta con tu entidad financiera.',
  },

  calculadoraAhorro: {
    volverAria: 'Volver',
    titulo: 'Ahorro con interés compuesto',
    subtitulo: 'Proyecta cuánto acumularías ahorrando cada mes',
    aporteLabel: 'Aporte mensual',
    montoInicialLabel: 'Monto inicial (opcional)',
    plazoLabel: 'Plazo',
    plazoPlaceholderMeses: 'Ej: 24',
    plazoPlaceholderAnios: 'Ej: 5',
    unidadMesesLabel: 'Meses',
    unidadAniosLabel: 'Años',
    unidadMesesTexto: 'meses',
    unidadAniosTexto: 'años',
    tasaLabel: 'Tasa de rendimiento (% E.A.)',
    errorSinAporte: 'Ingresa un aporte mensual o un monto inicial',
    errorPlazoVacio: 'Ingresa el plazo en {{unidad}}',
    errorTasaVacia: 'Ingresa la tasa de rendimiento (% E.A.)',
    errorTasaExcesiva: 'Ingresa una tasa razonable (hasta 100% E.A.)',
    errorCalculo: 'No se pudo calcular con estos datos. Revisa el aporte, la tasa y el plazo.',
    totalAcumuladoLabel: 'Total acumulado',
    totalAportadoLabel: 'Total aportado por ti',
    interesesGanadosLabel: 'Intereses ganados',
    notaEducativa:
      'Asume que el aporte se hace al final de cada mes y que el rendimiento se capitaliza mensualmente a partir de la tasa E.A. ingresada. Cálculo estimado con fines educativos: los productos reales pueden tener condiciones distintas. Consulta las condiciones exactas con tu entidad financiera.',
  },

  login: {
    bienvenida: 'Bienvenido de nuevo',
    subtitulo: 'Inicia sesión para ver tus cuentas',
    correo: 'Correo',
    correoPlaceholder: 'tucorreo@ejemplo.com',
    contrasena: 'Contraseña',
    contrasenaPlaceholder: '••••••••',
    errorCorreoInvalido: 'Ingresa un correo válido',
    errorContrasenaCorta: 'La contraseña debe tener al menos 6 caracteres',
    entrando: 'Entrando...',
    entrar: 'Entrar',
    noTienesCuenta: '¿No tienes cuenta?',
    registrate: 'Regístrate',
    olvidasteContrasena: '¿Olvidaste tu contraseña?',
  },

  // Pantalla "Recuperar contraseña" (RecuperarContrasena.jsx): pide el
  // correo y llama a supabase.auth.resetPasswordForEmail. El mensaje que se
  // muestra tras enviar es el mismo exista o no una cuenta con ese correo
  // (Supabase no lo distingue en la respuesta, a propósito, para no revelar
  // qué correos están registrados).
  recuperar: {
    titulo: 'Recuperar contraseña',
    subtitulo: 'Te enviaremos un enlace para restablecerla',
    correo: 'Correo',
    correoPlaceholder: 'tucorreo@ejemplo.com',
    errorCorreoInvalido: 'Ingresa un correo válido',
    enviando: 'Enviando...',
    enviar: 'Enviar enlace de recuperación',
    mensajeEnviado:
      'Si el correo existe, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.',
    volverLogin: 'Volver a iniciar sesión',
  },

  // Pantalla "Establecer nueva contraseña" (EstablecerNuevaContrasena.jsx):
  // se muestra sola, fuera de PantallaAuth, cuando AuthContext detecta que
  // el usuario volvió desde el enlace de recuperación (App.jsx).
  restablecer: {
    titulo: 'Establecer nueva contraseña',
    subtitulo: 'Elige una contraseña nueva para tu cuenta',
    contrasenaNueva: 'Nueva contraseña',
    contrasenaNuevaPlaceholder: 'Mínimo 10 caracteres',
    confirmarContrasena: 'Confirmar contraseña',
    confirmarContrasenaPlaceholder: '••••••••',
    errorContrasenaCorta: 'La contraseña debe tener al menos 10 caracteres',
    errorContrasenasNoCoinciden: 'Las contraseñas no coinciden',
    guardando: 'Guardando...',
    guardar: 'Guardar nueva contraseña',
    mensajeExito: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.',
    irALogin: 'Ir a iniciar sesión',
    errorEnlaceExpirado: 'Este enlace de recuperación venció o ya no es válido. Solicita uno nuevo.',
    volverLogin: 'Volver a iniciar sesión',

    // Paso de 2FA (PasoCodigoMfa.jsx) intercalado ANTES del formulario de
    // contraseña cuando la cuenta tiene verificación en dos pasos activa
    // (ver EstablecerNuevaContrasena.jsx: Supabase exige AAL2 para cambiar
    // la contraseña, y el enlace de recuperación solo deja AAL1).
    mfaSubtitulo: 'Antes de cambiar tu contraseña, confirma tu identidad con el código de tu app autenticadora',
    mfaVerificarYContinuar: 'Verificar y continuar',
    mfaAyudaTexto:
      'Si perdiste el acceso a tu app autenticadora y a tu método de respaldo, no podrás completar este paso tú mismo. Contacta a soporte para recuperar el acceso a tu cuenta.',
  },

  // Claves de traducirErrorAuth (erroresAuth.js). Ese util detecta el error
  // de Supabase con regex sobre el texto en inglés que devuelve su API (eso
  // no cambia con el idioma), y solo decide CUÁL clave corresponde -- el
  // texto final lo arma Login.jsx/Registro.jsx con t(clave).
  auth: {
    errorCredenciales: 'Correo o contraseña incorrectos',
    errorEmailNoConfirmado: 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
    errorYaRegistrado: 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.',
    errorPasswordCorta: 'La contraseña debe tener al menos 10 caracteres',
    errorEmailInvalido: 'El correo no tiene un formato válido',
    errorLimiteIntentos: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    errorSesionExpirada: 'Tu sesión de recuperación expiró. Solicita un nuevo enlace.',
    errorGenerico: 'Ocurrió un error. Inténtalo de nuevo.',
  },

  // PantallaConsentimiento.jsx (el "gate" de consentimiento, App.jsx): se
  // muestra en vez de la app cuando el usuario autenticado no tiene fila
  // vigente de alguno de los 3 tipos en "consentimientos" -- cuentas viejas
  // (de antes de los checkboxes) o una versión de documento que ya cambió.
  // Los textos de los 3 checkboxes reutilizan registro.consentimiento* (ver
  // ese comentario) en vez de duplicarse acá.
  consentimiento: {
    titulo: 'Actualizamos nuestros documentos legales',
    subtitulo:
      'Para seguir usando Seed, necesitamos que aceptes nuestros documentos actualizados.',
    aceptarYContinuar: 'Aceptar y continuar',
    guardando: 'Guardando...',
    errorGuardar: 'No se pudo guardar tu aceptación. Intenta de nuevo.',
  },

  perfil: {
    titulo: 'Perfil',
    subtitulo: 'Tu cuenta',
    sesionIniciadaComo: 'Sesión iniciada como',
    moneda: 'Moneda',
    monedaNota: 'Cambiar la moneda solo cambia cómo se muestran tus montos; no los convierte.',
    monedaConfirmacion:
      'Cambiar de moneda solo cambia el símbolo y el formato con que se muestran tus montos — no convierte los valores. Por ejemplo, si tenías 1.000.000, seguirás viendo 1.000.000 en la nueva moneda, no su equivalente convertido. ¿Deseas continuar?',
    monedaError: 'No se pudo cambiar la moneda. Intenta de nuevo.',
    cerrarSesion: 'Cerrar sesión',
    cerrandoSesion: 'Cerrando sesión...',
    calculadoras: 'Calculadoras',
    calcCuotaTitulo: 'Cuota de crédito',
    calcCuotaDescripcion: 'Calcula tu cuota mensual (sistema francés)',
    calcCdtTitulo: 'CDT vs. cuenta de alto rendimiento',
    calcCdtDescripcion: 'Compara dónde rinde más tu plata',
    calcAhorroTitulo: 'Ahorro con interés compuesto',
    calcAhorroDescripcion: 'Proyecta tus ahorros mensuales',
    ayudaTitulo: 'Ayuda',
    guiaTitulo: 'Guía de uso',
    guiaDescripcion: 'Cómo funciona cada parte de la app',
    seguridadTitulo: 'Seguridad',
    seguridadItemTitulo: 'Verificación en dos pasos',
    legalTitulo: 'Legal',
    politicaTitulo: 'Política de privacidad',
    politicaDescripcion: 'Cómo tratamos tus datos personales',
    terminosTitulo: 'Términos y condiciones',
    terminosDescripcion: 'Reglas de uso de Seed',
    zonaPeligroTitulo: 'Zona de peligro',
    eliminarCuentaTitulo: 'Eliminar cuenta',
    eliminarCuentaDescripcion: 'Borra tu cuenta y todos tus datos de forma permanente',
  },

  // Pantalla "Eliminar cuenta" (EliminarCuenta.jsx), accesible desde Perfil ->
  // Zona de peligro. Reautentica con la contraseña actual
  // (supabase.auth.signInWithPassword) y, solo si es correcta, invoca la
  // Edge Function "eliminar-cuenta" que borra al usuario del lado del
  // servidor (con permisos de administrador) -- ver supabase/functions/
  // eliminar-cuenta/index.ts. errorContrasena reutiliza traducirErrorAuth
  // (erroresAuth.js), igual que Login.jsx, porque signInWithPassword
  // devuelve el mismo tipo de error ahí.
  eliminarCuenta: {
    volverAria: 'Volver',
    titulo: 'Eliminar cuenta',
    subtitulo: 'Esta acción no se puede deshacer',
    advertenciaTitulo: 'Vas a borrar tu cuenta permanentemente',
    advertenciaTexto:
      'Al confirmar, se eliminará tu cuenta de Seed y TODOS tus datos, sin posibilidad de recuperarlos:',
    listaDatos: [
      'Cuentas, movimientos e ingresos/gastos registrados',
      'Gastos fijos y categorías',
      'Metas de ahorro y fondo de emergencia',
      'Viajes, categorías y gastos de viaje',
      'Tu perfil, preferencias y verificación en dos pasos',
    ],
    advertenciaFinal: 'No hay forma de deshacer esta acción ni de recuperar tu información después.',
    contrasenaLabel: 'Confirma tu contraseña para continuar',
    contrasenaPlaceholder: 'Tu contraseña actual',
    botonEliminar: 'Eliminar mi cuenta permanentemente',
    eliminando: 'Eliminando cuenta...',
    cancelar: 'Cancelar',
    errorEliminar: 'No pudimos eliminar tu cuenta. Verifica tu conexión e intenta de nuevo.',
    despedidaTitulo: 'Cuenta eliminada',
    despedidaTexto: 'Tu cuenta ha sido eliminada. Gracias por usar Seed.',
    despedidaBoton: 'Volver al inicio',
    saliendo: 'Saliendo...',
  },

  // Pantalla "Seguridad" (SeguridadPerfil.jsx), accesible desde Perfil:
  // activar/desactivar la verificación en dos pasos (2FA/TOTP) usando el MFA
  // nativo de Supabase (supabase.auth.mfa). Las claves errorXxx las usa
  // erroresMfa.js para traducir los mensajes que devuelve esa API.
  seguridad: {
    volverAria: 'Volver',
    titulo: 'Seguridad',
    subtitulo: 'Protege el acceso a tu cuenta',
    cargando: 'Cargando...',
    estadoLabel: 'Verificación en dos pasos',
    estadoActivo: 'Activada',
    estadoInactivo: 'Desactivada',
    activarBoton: 'Activar verificación en dos pasos',
    activando: 'Preparando...',
    avisoRespaldoTitulo: 'Actívalo con cuidado',
    avisoRespaldoTexto:
      'Si pierdes el acceso a tu app autenticadora (por ejemplo, cambias de teléfono) y no tienes un método de respaldo, no podrás desactivar la verificación en dos pasos tú mismo, y necesitarás contactar a soporte para recuperar el acceso a tu cuenta. Guarda el código secreto en un lugar seguro antes de continuar.',
    qrInstrucciones:
      'Escanea este código QR con tu app autenticadora (Google Authenticator, Authy, o similar). Si no puedes escanearlo, ingresa el código secreto manualmente.',
    qrTituloPrincipal: 'Configura tu app autenticadora',
    qrTituloRespaldo: 'Configura tu método de respaldo',
    qrAlt: 'Código QR para configurar la verificación en dos pasos',
    secretoLabel: 'Código secreto (si no puedes escanear)',
    codigoLabel: 'Código de 6 dígitos',
    codigoPlaceholder: '123456',
    verificarYActivar: 'Verificar y activar',
    verificarYAgregar: 'Verificar y agregar',
    verificando: 'Verificando...',
    cancelar: 'Cancelar',
    cancelando: 'Cancelando...',
    reautenticarTitulo: 'Confirma tu identidad',
    reautenticarTexto:
      'Para hacer este cambio necesitamos confirmar tu identidad de nuevo. Ingresa el código de cualquiera de tus métodos activos.',
    verificarYContinuar: 'Verificar y continuar',
    errorCodigoInvalido: 'Ingresa el código de 6 dígitos que muestra tu app autenticadora',
    errorRequiereAal2: 'Necesitamos confirmar tu identidad de nuevo antes de hacer este cambio.',
    errorLimiteIntentos: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    errorFactorDuplicado: 'Ya hay una verificación en dos pasos en proceso. Intenta de nuevo.',
    errorGenerico: 'Ocurrió un error. Inténtalo de nuevo.',

    // Fase 3, parte A: varios factores TOTP por usuario (uno "principal" y,
    // opcionalmente, uno o más "de respaldo"). factoresMfa.js asigna el
    // nombre técnico al inscribir y estas claves lo traducen para mostrarlo.
    metodosTitulo: 'Tus métodos',
    factorPrincipal: 'Principal',
    factorRespaldo: 'Respaldo',
    factorRespaldoNumerado: 'Respaldo {{numero}}',
    agregadoEl: 'Agregado el {{fecha}}',
    eliminarFactorAria: 'Eliminar el método {{nombre}}',
    confirmarEliminarFactor:
      '¿Eliminar el método "{{nombre}}"? Ya no podrás usarlo para verificar tu identidad.',
    confirmarEliminarUltimo:
      'Este es tu único método de verificación en dos pasos. Al eliminarlo, el 2FA quedará desactivado y tu cuenta se protegerá solo con tu contraseña. ¿Deseas continuar?',
    sugerenciaRespaldoTitulo: 'Agrega un método de respaldo',
    sugerenciaRespaldoTexto:
      'Si pierdes el acceso a tu app autenticadora sin un respaldo configurado en otro dispositivo, no podrás entrar a tu cuenta tú mismo. Te toma un minuto agregar uno.',
    sugerenciaDescartarAria: 'Descartar esta sugerencia',
    agregarRespaldoBoton: 'Agregar método de respaldo',
    agregarOtroBoton: '+ Agregar otro método',

    // TarjetaPromoMfa.jsx: tarjeta descartable en Inicio que invita a
    // activar el 2FA (solo a quien todavía no lo tiene activo).
    promoTitulo: 'Protege tu cuenta con verificación en dos pasos',
    promoTexto:
      'Además de tu contraseña, te pedimos un código de tu app autenticadora al iniciar sesión. Toma un minuto activarlo.',
    promoBoton: 'Activar verificación en dos pasos',
    promoDescartarAria: 'Descartar, no mostrar de nuevo',

    // VerificarMfa.jsx (login con código, Fase 2): eligeMetodoLabel solo se
    // muestra cuando el usuario tiene más de un factor verificado.
    eligeMetodoLabel: '¿Con cuál método vas a verificar?',

    // Pantalla VerificarMfa.jsx: se muestra tras correo+contraseña cuando la
    // cuenta tiene 2FA activo (App.jsx la agrega entre "recuperación" y
    // "!sesion" en su cascada de decisión).
    verificarTitulo: 'Verificación en dos pasos',
    verificarSubtitulo: 'Ingresa el código de 6 dígitos de tu app autenticadora para continuar',
    verificarYEntrar: 'Verificar y entrar',
    usarOtraCuenta: 'Usar otra cuenta',
    saliendo: 'Saliendo...',
  },

  // "Chrome" de las pantallas de documentos legales (DocumentoLegal.jsx,
  // usado por PoliticaDatos.jsx y TerminosCondiciones.jsx). El TEXTO de los
  // documentos en sí vive en src/data/documentosLegales.js y por ahora se
  // muestra siempre en español (son documentos redactados para Colombia) --
  // estas claves solo cubren lo que sí sigue el idioma de la app: el botón
  // volver y la línea de versión/fecha.
  legal: {
    volverAria: 'Volver',
    metaLinea: 'Versión {{version}} · Última actualización: {{fecha}}',
    indiceTitulo: 'Contenido',
  },

  // Contenido de GuiaUso.jsx (Fase 1 de la guía de uso, accesible desde
  // Cuenta → Guía de uso). Es texto largo y va a seguir creciendo a medida que
  // la app sume funciones nuevas -- REVISAR Y ACTUALIZAR esta sección cada
  // vez que se agregue una función grande, para que la guía no quede
  // desactualizada. `completa.<seccion>.texto` puede tener varios párrafos
  // separados por '\n\n' (GuiaUso.jsx los muestra con "whitespace-pre-line").
  guia: {
    volverAria: 'Volver',
    titulo: 'Guía de uso',
    subtitulo: 'Cómo funciona cada parte de Seed',
    intro:
      'Esta es la guía completa de Seed. Toca cualquier sección para ver cómo funciona. Puedes volver aquí cuando quieras -- no hace falta memorizar nada.',
    // Tarjetas del carrusel de bienvenida (Fase 3, GuiaBienvenida.jsx): se
    // muestra SOLO la primera vez que un usuario nuevo entra a la app (ver
    // GuiaContext.jsx / perfiles.guia_vista). Máximo 4 tarjetas a propósito,
    // para no abrumar -- la última siempre apunta a esta guía completa.
    bienvenida: {
      saltar: 'Saltar',
      anterior: 'Atrás',
      siguiente: 'Siguiente',
      empezar: 'Empezar',
      tarjeta1Titulo: '¡Bienvenido a Seed! 👋',
      tarjeta1Texto:
        'Tu app para llevar el control de tus finanzas personales, sin complicarte. Te mostramos en unos segundos lo esencial para empezar.',
      tarjeta2Titulo: 'Registra tus movimientos',
      tarjeta2Texto:
        'Anota tus ingresos y gastos con el botón "+" de Inicio. También puedes registrar traslados entre tus propias cuentas, sin que afecten tus estadísticas.',
      tarjeta3Titulo: 'Cuida tu fondo de emergencia',
      tarjeta3Texto:
        'En la pestaña Fondo ves cuántos meses de gastos tienes cubiertos, y puedes crear metas de ahorro para tus próximos objetivos.',
      tarjeta4Titulo: 'La guía completa te espera',
      tarjeta4Texto:
        'En la pestaña Cuenta encontrarás la Guía de uso completa, con el detalle de cada función de la app -- vuelve ahí cuando la necesites.',
    },
    // Textos de los íconos de ayuda "?" (Fase 2, AyudaContextual.jsx): 1-2
    // frases breves junto a funciones puntuales, a diferencia de
    // "completa" (de abajo), que es la explicación larga por tema. Cada
    // clave trae también su "...Aria" (aria-label del botón "?": describe
    // QUÉ explica, ya que un "?" solo no dice nada a un lector de pantalla).
    ayuda: {
      movimientoTipos:
        'Ingreso es dinero que entra, gasto es dinero que sale, y traslado es mover dinero entre dos cuentas tuyas sin que cuente como ingreso ni gasto.',
      movimientoTiposAria: 'Ayuda: diferencia entre ingreso, gasto y traslado',
      gastoFijoPagado:
        'Al marcarlo como pagado eliges de qué cuenta salió el dinero: la app crea un movimiento real, descuenta el saldo de esa cuenta y lo deja registrado en tu historial.',
      gastoFijoPagadoAria: 'Ayuda: qué pasa al marcar un gasto fijo como pagado',
      fondoEmergenciaCalculo:
        'Se calcula sumando el saldo de tus cuentas marcadas como ahorro y dividiéndolo entre tu gasto mensual promedio: el resultado son los meses que podrías sostenerte sin ingresos.',
      fondoEmergenciaCalculoAria: 'Ayuda: cómo se calcula el fondo de emergencia',
      cuentaEsAhorro:
        'Marca esta opción si la cuenta es de ahorro o inversión: su saldo se sumará automáticamente a tu fondo de emergencia.',
      cuentaEsAhorroAria: 'Ayuda: qué significa marcar una cuenta como parte del fondo de emergencia',
      presupuestoOpcional:
        'Es opcional: si lo dejas vacío, la categoría no tiene tope y solo se muestra cuánto has gastado en ella.',
      presupuestoOpcionalAria: 'Ayuda: el tope mensual de una categoría es opcional',
      // Fase 3: se amplían los tooltips al resto de funciones clave de la app.
      gastosVariables:
        'Son tus gastos del día a día (mercado, transporte, ocio...). Se agrupan automáticamente por categoría, para que veas de un vistazo en qué se te va la plata cada mes.',
      gastosVariablesAria: 'Ayuda: qué son los gastos variables y cómo se agrupan',
      categoriaSistema:
        'Esta categoría la crea la app automáticamente para tus gastos fijos pagados. No se puede editar ni eliminar, para que siempre tengas un lugar consistente donde verlos.',
      categoriaSistemaAria: 'Ayuda: qué es la categoría de sistema Gastos fijos',
      categoriaDescripcion:
        'Es un texto corto opcional que se muestra debajo del nombre de la categoría, útil para recordar qué tipo de gastos van ahí (por ejemplo, "café, snacks, propinas...").',
      categoriaDescripcionAria: 'Ayuda: para qué sirve la descripción de una categoría',
      metaFecha:
        'Es el mes y año en el que quieres alcanzar esta meta. La app usa esa fecha para calcular cuánto te falta y proyectar si vas a lograrlo a tiempo.',
      metaFechaAria: 'Ayuda: para qué sirve la fecha objetivo de una meta',
      metaProyeccion:
        'Compara cuánto necesitas ahorrar al mes para llegar a la meta con tu capacidad de ahorro actual (tus ingresos promedio menos tus gastos promedio), y te dice si vas bien o si necesitas ajustar algo.',
      metaProyeccionAria: 'Ayuda: qué significa la proyección de una meta',
      quincena:
        '1ª quincena son los días 1 al 15 del mes, y 2ª quincena del 16 al último día. Los gastos fijos siempre se muestran por mes completo, sin importar qué quincena elijas.',
      quincenaAria: 'Ayuda: qué es la 1ª y 2ª quincena',
      traslados:
        'Un traslado mueve dinero entre dos cuentas tuyas (por ejemplo, de ahorros a tu cuenta de gastos). No cuenta como ingreso ni como gasto, y se excluye de tus estadísticas de Resumen.',
      trasladosAria: 'Ayuda: qué es un traslado y cómo afecta tus estadísticas',
      resumenTotales:
        'Ingresos y gastos totales del periodo que tienes seleccionado, con los gastos separados en fijos y variables, y tu balance final (ingresos menos gastos).',
      resumenTotalesAria: 'Ayuda: qué muestran los totales del Resumen',
      resumenGrafico:
        'Compara tus ingresos y gastos mes a mes durante todo el año, para que veas de un vistazo en qué meses gastaste más o ganaste menos.',
      resumenGraficoAria: 'Ayuda: qué muestra el gráfico mensual',
      resumenDesglose:
        'Muestra en qué categorías se te fue el dinero durante el periodo, de mayor a menor, con el porcentaje que representa cada una sobre el total gastado.',
      resumenDesgloseAria: 'Ayuda: qué muestra el desglose por categoría',
      viajeEspacioAparte:
        'Los viajes son un espacio aparte para presupuestar: los gastos que registres aquí NO afectan tus cuentas ni movimientos reales, son solo para planear.',
      viajeEspacioAparteAria: 'Ayuda: cómo se relacionan los viajes con tus cuentas reales',
      viajeCategoriaPresupuesto:
        'Cada categoría de un viaje tiene su propio presupuesto y su propia moneda (por ejemplo, hospedaje en USD y comida en COP), independiente de la moneda de tu perfil.',
      viajeCategoriaPresupuestoAria: 'Ayuda: cómo funciona el presupuesto por categoría de un viaje',
      viajeGastoMoneda:
        'Puedes registrar cada gasto en la moneda del país que estés visitando; no tiene que coincidir con la moneda de tu perfil. El resumen del viaje agrupa los totales por cada moneda que uses.',
      viajeGastoMonedaAria: 'Ayuda: cómo funcionan los gastos en distintas monedas',
      viajeDashboard:
        'La barra de cada categoría compara cuánto has gastado contra su presupuesto: se ve tranquila mientras vas bien, y se pone de alerta a medida que te acercas o te pasas del tope.',
      viajeDashboardAria: 'Ayuda: cómo leer el presupuesto ejecutado de cada categoría',
      multiMoneda:
        'La moneda solo cambia el símbolo y el formato con que se muestran tus montos en toda la app. No convierte los valores: si tenías 1.000.000, seguirás viendo 1.000.000 en la nueva moneda.',
      multiMonedaAria: 'Ayuda: qué hace la moneda de tu perfil',
      calcCuota:
        'Calcula tu cuota mensual fija de un préstamo (sistema francés) a partir del monto, la tasa de interés (E.A.) y el plazo. No mueve dinero real, es solo para simular.',
      calcCuotaAria: 'Ayuda: qué calcula esta calculadora',
      calcCdt:
        'Compara cuánto rinde tu plata en un CDT (que paga los intereses al final) contra una cuenta de alto rendimiento (que los liquida diaria o mensualmente), para el mismo monto y plazo.',
      calcCdtAria: 'Ayuda: qué calcula esta calculadora',
      calcAhorroInteres:
        'Proyecta cuánto acumularías ahorrando un monto fijo cada mes (más un monto inicial opcional) a una tasa de interés compuesto dada.',
      calcAhorroInteresAria: 'Ayuda: qué calcula esta calculadora',
    },
    completa: {
      movimientos: {
        titulo: 'Movimientos',
        texto:
          'Un movimiento es cualquier entrada o salida de dinero: un ingreso (tu sueldo, por ejemplo), un gasto (una compra) o un traslado (mover plata entre dos cuentas tuyas, como pasar de tu cuenta de ahorros a la de gastos).\n\nToca "+ Registrar movimiento" en Inicio para agregar uno: elige el tipo, el monto, la cuenta (y la categoría, si es un gasto). Para editar o eliminar un movimiento ya registrado, tócalo en la lista de Inicio.',
      },
      cuentas: {
        titulo: 'Cuentas',
        texto:
          'Las cuentas representan dónde tienes tu dinero: una cuenta bancaria, efectivo, una billetera digital, una inversión, etc. Cada movimiento que registras entra o sale de alguna cuenta, así que su saldo se actualiza solo.\n\nPuedes marcar una cuenta como parte de tu fondo de emergencia (por ejemplo, tus ahorros o una inversión de bajo riesgo) -- así su saldo cuenta automáticamente para calcular cuántos meses de gastos tienes cubiertos.',
      },
      categorias: {
        titulo: 'Categorías',
        texto:
          'Las categorías clasifican tus gastos (Mercado, Transporte, Ocio...) para que el Resumen te muestre en qué se te va la plata. Puedes crear las tuyas, elegir emoji y color, y ponerles un tope mensual opcional si quieres vigilar de cerca alguna.\n\nHay una categoría especial, "Gastos fijos", que crea la app automáticamente: se usa para los gastos fijos que marcas como pagados y no se puede editar ni eliminar, para que siempre tengas un lugar consistente donde verlos.',
      },
      gastosFijos: {
        titulo: 'Gastos fijos',
        texto:
          'Los gastos fijos son los que se repiten cada mes con un monto más o menos constante: arriendo, servicios, suscripciones. Los creas una sola vez, con su nombre y monto esperado.\n\nCada mes los marcas como "pagado" desde la pantalla de Gastos fijos, eliges de qué cuenta salió el dinero, y la app crea automáticamente un movimiento real: el saldo de esa cuenta baja y el gasto queda en tu historial, sin que tengas que registrarlo dos veces.',
      },
      gastosVariables: {
        titulo: 'Gastos variables',
        texto:
          'Son los gastos del día a día que no tienen un monto fijo: mercado, transporte, ocio. Se registran como cualquier movimiento de tipo "gasto", eligiendo la categoría que corresponda.\n\nSi le pusiste un tope mensual a una categoría, la app te muestra cuánto llevas gastado frente a ese tope, para ayudarte a no pasarte.',
      },
      fondoEmergencia: {
        titulo: 'Fondo de emergencia',
        texto:
          'Tu fondo de emergencia es el colchón para imprevistos: cuántos meses podrías sostenerte si dejaras de recibir ingresos. La app lo calcula sola, sumando el saldo de las cuentas que marcaste como "ahorro" y comparándolo con tu gasto mensual promedio.\n\nDefine cuántos meses quieres como meta (lo recomendado son entre 3 y 6) y verás tu progreso con un anillo visual: entre más completo, mejor cubierto estás.',
      },
      metas: {
        titulo: 'Metas de ahorro',
        texto:
          'Además del fondo de emergencia, puedes crear metas de ahorro para objetivos concretos (un viaje, un computador nuevo...): ponles un nombre, un monto y una fecha objetivo.\n\nLa app proyecta, según tu capacidad de ahorro actual, si vas a alcanzar la meta a tiempo, si vas sobrado, o si necesitas ajustar el monto, la fecha o cuánto ahorras al mes.',
      },
      periodo: {
        titulo: 'Filtro por mes y quincena',
        texto:
          'En Inicio puedes filtrar tus movimientos por mes, y dentro de cada mes, por quincena (1ª, 2ª, o el mes completo) -- útil si te pagan quincenal y quieres ver solo lo que ha pasado desde tu último pago.\n\nEste filtro también controla qué periodo ves en el Resumen.',
      },
      resumen: {
        titulo: 'Resumen',
        texto:
          'Resumen te muestra el panorama completo de un periodo: total de ingresos, gastos (separados en fijos y variables) y tu balance. También un gráfico con la evolución mes a mes del año, y un desglose de en qué categorías se te fue el dinero, ordenado de mayor a menor.',
      },
      viajes: {
        titulo: 'Planifica tus viajes',
        texto:
          'Un espacio aparte para presupuestar un viaje sin mezclar esos números con tus cuentas y movimientos reales. Creas un viaje, le agregas categorías con su presupuesto (hospedaje, comida, transporte...) y vas registrando los gastos a medida que ocurren.\n\nCada gasto puede quedar en la moneda del país que estés visitando (no tiene que ser la misma moneda de tu perfil), y el resumen del viaje te muestra el total gastado agrupado por cada moneda que usaste.',
      },
      calculadoras: {
        titulo: 'Calculadoras',
        texto:
          'Tres herramientas educativas para planear antes de decidir, en Cuenta:\n\n• Cuota de crédito: calcula tu cuota mensual de un préstamo (sistema francés) según monto, tasa y plazo.\n• CDT vs. cuenta de alto rendimiento: compara cuál te rinde más para una misma plata e igual tiempo.\n• Ahorro con interés compuesto: proyecta cuánto acumularías ahorrando cada mes a una tasa dada.\n\nNo mueven dinero real ni se guardan: son solo para simular.',
      },
      preferencias: {
        titulo: 'Moneda e idioma',
        texto:
          'Eliges tu moneda (COP, USD o EUR) y tu idioma (español o inglés) al registrarte. La moneda define cómo se muestran tus montos en toda la app -- no convierte tus números, solo cambia el formato.\n\nPuedes cambiar la moneda cuando quieras desde Cuenta → Perfil. El idioma, en cambio, se elige una sola vez al crear la cuenta.',
      },
    },
  },

  registro: {
    titulo: 'Crea tu cuenta',
    subtitulo: 'Empieza a llevar el control de tu saldo',
    correo: 'Correo',
    correoPlaceholder: 'tucorreo@ejemplo.com',
    contrasena: 'Contraseña',
    contrasenaPlaceholder: 'Mínimo 10 caracteres',
    confirmarContrasena: 'Confirmar contraseña',
    confirmarContrasenaPlaceholder: '••••••••',
    monedaTitulo: 'Moneda de tu cuenta',
    monedaNota:
      'Todos tus montos se mostrarán en esta moneda. Podrás cambiarla después desde Perfil.',
    idiomaTitulo: 'Idioma de la app',
    idiomaNota: 'Elige con cuidado: no podrás cambiarlo después.',
    errorCorreoInvalido: 'Ingresa un correo válido',
    errorContrasenaCorta: 'La contraseña debe tener al menos 10 caracteres',
    errorContrasenasNoCoinciden: 'Las contraseñas no coinciden',
    // Consentimientos exigidos por la Ley 1581 de 2012 (ver
    // sql/supabase_consentimientos.sql). "...Pre" es el texto antes del
    // enlace y "...Link" el nombre del documento en sí -- Registro.jsx los
    // junta con un <button> clicable en medio de la frase.
    consentimientoPoliticaPre: 'He leído y acepto la',
    consentimientoPoliticaLink: 'Política de Tratamiento de Datos Personales',
    consentimientoTerminosPre: 'He leído y acepto los',
    consentimientoTerminosLink: 'Términos y Condiciones',
    consentimientoMayorEdad: 'Declaro que soy mayor de 18 años.',
    errorConsentimientoFaltante:
      'Debes aceptar la política, los términos y confirmar tu mayoría de edad para continuar.',
    mensajeCuentaCreada:
      'Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.',
    creandoCuenta: 'Creando cuenta...',
    crearCuenta: 'Crear cuenta',
    yaTienesCuenta: '¿Ya tienes cuenta?',
    iniciaSesion: 'Inicia sesión',
  },
}
