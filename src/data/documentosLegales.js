import VERSIONES_LEGALES from '../constants/versionesLegales'

// Contenido íntegro de los documentos legales de Seed (Política de
// Tratamiento de Datos Personales y Términos y Condiciones), en español --
// son documentos redactados para Colombia (Ley 1581 de 2012) y por ahora se
// muestran en ese idioma sin importar el idioma de la app (ver nota en
// PoliticaDatos.jsx / TerminosCondiciones.jsx). Cada campo `[POR DEFINIR: ...]`
// es un borrador legal pendiente de completar (dato del responsable, fecha de
// publicación, etc.) -- se deja tal cual a propósito, no se debe "adivinar".
//
// Estructura pensada para que actualizar el texto sea editar esta lista, no
// tocar ningún componente: cada documento es { titulo, version,
// ultimaActualizacion, secciones }, y cada sección es { titulo, bloques },
// más un campo opcional `destacado` ('contacto' | 'derechos') que es pura
// metadata de presentación -- le dice a DocumentoLegal.jsx que muestre esa
// sección en una tarjeta resaltada (datos de contacto del responsable,
// Derechos del Titular). No afecta el texto ni se muestra tal cual.
// Cada bloque es uno de:
//   { tipo: 'parrafo', texto }       -- un párrafo normal
//   { tipo: 'subtitulo', texto }     -- un subtítulo dentro de la sección
//   { tipo: 'lista', items }         -- lista con viñetas
//   { tipo: 'listaOrdenada', items } -- lista numerada
// DocumentoLegal.jsx (el componente que renderiza ambos documentos) sabe
// dibujar estos cuatro tipos; agregar una sección nueva o reordenar las
// existentes no requiere cambios ahí.

export const POLITICA_DATOS = {
  titulo: 'Política de Tratamiento de Datos Personales — Seed',
  version: VERSIONES_LEGALES.POLITICA_DATOS,
  ultimaActualizacion: '[POR DEFINIR: fecha de publicación]',
  secciones: [
    {
      titulo: '1. Identificación del Responsable del Tratamiento',
      // Metadatos de presentación (no son texto legal): marcan esta sección
      // para que DocumentoLegal.jsx la muestre en una tarjeta destacada --
      // ver la nota de diseño al inicio de este archivo.
      destacado: 'contacto',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'De conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013, el responsable del tratamiento de sus datos personales es:',
        },
        {
          tipo: 'lista',
          items: [
            'Responsable: [POR DEFINIR: nombre completo o razón social]',
            'Identificación: [POR DEFINIR: cédula o NIT]',
            'Domicilio: [POR DEFINIR: ciudad, país]',
            'Dirección: [POR DEFINIR: dirección física o de notificación]',
            'Correo electrónico: [POR DEFINIR: correo de contacto para datos]',
            'Teléfono: [POR DEFINIR: teléfono de contacto]',
          ],
        },
        { tipo: 'parrafo', texto: 'En adelante, "Seed", "nosotros" o "la aplicación".' },
      ],
    },
    {
      titulo: '2. Definiciones',
      bloques: [
        { tipo: 'parrafo', texto: 'Conforme al artículo 3 de la Ley 1581 de 2012:' },
        {
          tipo: 'lista',
          items: [
            'Titular: persona natural cuyos datos personales son objeto de tratamiento (usted, como usuario de Seed).',
            'Dato personal: cualquier información vinculada o que pueda asociarse a una persona natural determinada o determinable.',
            'Tratamiento: cualquier operación sobre datos personales, como recolección, almacenamiento, uso, circulación o supresión.',
            'Autorización: consentimiento previo, expreso e informado del titular para tratar sus datos.',
            'Responsable del Tratamiento: quien decide sobre el tratamiento de los datos (Seed).',
            'Encargado del Tratamiento: quien trata los datos por cuenta del Responsable (por ejemplo, nuestros proveedores tecnológicos).',
          ],
        },
      ],
    },
    {
      titulo: '3. Datos que recolectamos',
      bloques: [
        { tipo: 'parrafo', texto: 'Seed recolecta y trata los siguientes datos personales:' },
        { tipo: 'subtitulo', texto: 'Datos de registro y cuenta:' },
        {
          tipo: 'lista',
          items: [
            'Correo electrónico.',
            'Contraseña (almacenada de forma cifrada; nunca en texto plano).',
            'Idioma y moneda de preferencia.',
            'Confirmación de mayoría de edad.',
          ],
        },
        { tipo: 'subtitulo', texto: 'Datos financieros que usted ingresa voluntariamente:' },
        {
          tipo: 'lista',
          items: [
            'Información sobre sus cuentas, ingresos, gastos, movimientos, metas de ahorro, gastos fijos y variables, fondo de emergencia y planificación de viajes.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Importante: estos datos financieros son registrados por usted, para su propio uso y control personal. Seed no accede a sus cuentas bancarias reales ni recolecta información de tarjetas o credenciales bancarias.',
        },
        { tipo: 'subtitulo', texto: 'Datos técnicos:' },
        {
          tipo: 'lista',
          items: [
            'Datos de autenticación y seguridad (incluida la configuración de verificación en dos pasos, si la activa).',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'No recolectamos datos sensibles (origen racial o étnico, orientación política, convicciones religiosas, datos de salud, vida sexual, datos biométricos, etc.).',
        },
      ],
    },
    {
      titulo: '4. Finalidades del Tratamiento',
      bloques: [
        { tipo: 'parrafo', texto: 'Sus datos personales serán tratados para las siguientes finalidades:' },
        {
          tipo: 'listaOrdenada',
          items: [
            'Crear, gestionar y mantener su cuenta de usuario.',
            'Permitirle registrar y gestionar su información financiera personal dentro de la aplicación.',
            'Autenticar su identidad y proteger la seguridad de su cuenta (incluida la verificación en dos pasos).',
            'Enviarle comunicaciones relacionadas con el servicio (recuperación de contraseña, confirmación de correo, avisos importantes).',
            'Prestar soporte al usuario y atender sus solicitudes.',
            'Mejorar y mantener el funcionamiento de la aplicación.',
            'Cumplir con obligaciones legales aplicables.',
          ],
        },
        {
          tipo: 'parrafo',
          texto: 'No usaremos sus datos para finalidades distintas a las aquí descritas sin obtener su autorización previa.',
        },
      ],
    },
    {
      titulo: '5. Derechos del Titular',
      destacado: 'derechos',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Como titular de sus datos personales, usted tiene derecho a (artículo 8, Ley 1581 de 2012):',
        },
        {
          tipo: 'lista',
          items: [
            'Conocer, actualizar y rectificar sus datos personales.',
            'Solicitar prueba de la autorización otorgada.',
            'Ser informado sobre el uso que se ha dado a sus datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.',
            'Revocar la autorización y/o solicitar la supresión de sus datos, cuando no exista un deber legal o contractual que lo impida.',
            'Acceder gratuitamente a sus datos personales.',
          ],
        },
      ],
    },
    {
      titulo: '6. Cómo ejercer sus derechos',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Puede ejercer sus derechos enviando una solicitud al correo electrónico: [POR DEFINIR: correo de contacto para datos]',
        },
        {
          tipo: 'parrafo',
          texto:
            'Su solicitud debe contener: su identificación, la descripción concreta de lo que solicita, y una dirección de contacto. Atenderemos:',
        },
        {
          tipo: 'lista',
          items: [
            'Consultas: en un plazo máximo de diez (10) días hábiles, prorrogable por cinco (5) días hábiles más.',
            'Reclamos: en un plazo máximo de quince (15) días hábiles, prorrogable por ocho (8) días hábiles más.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Adicionalmente, dentro de la aplicación usted puede actualizar varios de sus datos directamente, y puede eliminar su cuenta y sus datos asociados.',
        },
      ],
    },
    {
      titulo: '7. Autorización',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Al registrarse y marcar la casilla de aceptación, usted otorga su autorización previa, expresa e informada para que Seed trate sus datos personales conforme a esta Política. Esta autorización es requisito para poder usar la aplicación, dado que el tratamiento de los datos es necesario para prestar el servicio.',
        },
      ],
    },
    {
      titulo: '8. Seguridad de la información',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Adoptamos medidas técnicas y organizativas razonables para proteger sus datos, incluyendo cifrado de contraseñas, aislamiento de datos por usuario, conexiones seguras, y la opción de verificación en dos pasos. Ningún sistema es completamente infalible, pero trabajamos para proteger su información.',
        },
      ],
    },
    {
      titulo: '9. Encargados y proveedores',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Para prestar el servicio, utilizamos proveedores tecnológicos que actúan como Encargados del Tratamiento, incluyendo servicios de infraestructura y base de datos (por ejemplo, Supabase) y de alojamiento. Estos proveedores tratan los datos siguiendo nuestras instrucciones y estándares de seguridad. [POR DEFINIR: revisar con abogado la mención de proveedores y transferencias internacionales, ya que algunos servidores pueden estar fuera de Colombia.]',
        },
      ],
    },
    {
      titulo: '10. Conservación de los datos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Conservaremos sus datos mientras su cuenta esté activa o mientras sean necesarios para las finalidades descritas. Si usted elimina su cuenta o revoca su autorización, procederemos a suprimir sus datos, salvo que exista una obligación legal de conservarlos.',
        },
      ],
    },
    {
      titulo: '11. Mayoría de edad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Seed está dirigida exclusivamente a personas mayores de 18 años. No recolectamos intencionalmente datos de menores de edad. Al registrarse, usted declara ser mayor de 18 años.',
        },
      ],
    },
    {
      titulo: '12. Cambios en la Política',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Podremos actualizar esta Política. Los cambios sustanciales serán comunicados a través de la aplicación. La versión vigente siempre estará disponible dentro de Seed.',
        },
      ],
    },
    {
      titulo: '13. Vigencia',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Esta Política rige a partir de [POR DEFINIR: fecha] y se mantendrá vigente mientras Seed preste sus servicios.',
        },
      ],
    },
  ],
}

export const TERMINOS_CONDICIONES = {
  titulo: 'Términos y Condiciones de Uso — Seed',
  version: VERSIONES_LEGALES.TERMINOS,
  ultimaActualizacion: '[POR DEFINIR: fecha de publicación]',
  secciones: [
    {
      titulo: '1. Aceptación de los Términos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Al crear una cuenta y usar Seed (en adelante, "la aplicación" o "el servicio"), usted acepta estos Términos y Condiciones. Si no está de acuerdo, por favor no use la aplicación.',
        },
      ],
    },
    {
      titulo: '2. Descripción del servicio',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Seed es una aplicación de finanzas personales que le permite registrar y organizar su información financiera (ingresos, gastos, cuentas, metas de ahorro, fondo de emergencia, planificación de viajes, entre otros) con fines de control y educación financiera personal.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Seed es una herramienta de registro y organización personal. No es una entidad financiera, no maneja dinero real, no accede a sus cuentas bancarias, y no presta servicios de inversión, intermediación ni asesoría financiera profesional. La información y las calculadoras ofrecidas son de carácter informativo y educativo, y no constituyen asesoría financiera, contable, tributaria ni legal.',
        },
      ],
    },
    {
      titulo: '3. Requisitos de uso',
      bloques: [
        {
          tipo: 'lista',
          items: [
            'Debe ser mayor de 18 años.',
            'Debe proporcionar información veraz al registrarse.',
            'Es responsable de mantener la confidencialidad de su contraseña y de la actividad de su cuenta.',
            'Le recomendamos activar la verificación en dos pasos para mayor seguridad.',
          ],
        },
      ],
    },
    {
      titulo: '4. Uso aceptable',
      bloques: [
        { tipo: 'parrafo', texto: 'Usted se compromete a:' },
        {
          tipo: 'lista',
          items: [
            'Usar la aplicación conforme a la ley y a estos Términos.',
            'No intentar vulnerar la seguridad de la aplicación ni acceder a datos de otros usuarios.',
            'No usar la aplicación para fines ilícitos.',
          ],
        },
        {
          tipo: 'parrafo',
          texto: 'Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos Términos.',
        },
      ],
    },
    {
      titulo: '5. Cuenta y seguridad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Usted es responsable de la actividad que ocurra en su cuenta. Si detecta un uso no autorizado, debe notificarnos de inmediato a [POR DEFINIR: correo de contacto]. Adoptamos medidas de seguridad, pero usted también debe proteger sus credenciales.',
        },
      ],
    },
    {
      titulo: '6. Sus datos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'El tratamiento de sus datos personales se rige por nuestra Política de Tratamiento de Datos Personales, que usted acepta al registrarse. Sus registros financieros le pertenecen; puede exportarlos (cuando esté disponible), actualizarlos o eliminarlos.',
        },
      ],
    },
    {
      titulo: '7. Planes y pagos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            '[POR DEFINIR según el modelo de negocio: si Seed es gratuita, freemium o de suscripción. Si hay pagos, aquí deben describirse los planes, precios, renovaciones, cancelaciones y reembolsos. Los pagos, de existir, se procesarán a través de pasarelas de pago externas; Seed no almacena datos de tarjetas.]',
        },
      ],
    },
    {
      titulo: '8. Propiedad intelectual',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La aplicación Seed, su nombre, logo, diseño y código son propiedad de [POR DEFINIR: el Responsable] y están protegidos por las leyes de propiedad intelectual. Usted no adquiere derechos sobre la aplicación por usarla, salvo el derecho de uso conforme a estos Términos.',
        },
      ],
    },
    {
      titulo: '9. Limitación de responsabilidad',
      bloques: [
        { tipo: 'parrafo', texto: 'Seed se ofrece "tal cual". En la máxima medida permitida por la ley:' },
        {
          tipo: 'lista',
          items: [
            'No garantizamos que el servicio sea ininterrumpido o libre de errores.',
            'No somos responsables por decisiones financieras que usted tome con base en la información que registra u organiza en la aplicación. Las calculadoras y resúmenes son referenciales.',
            'No somos responsables por pérdidas derivadas del uso o imposibilidad de uso de la aplicación, en la medida permitida por la ley.',
          ],
        },
      ],
    },
    {
      titulo: '10. Disponibilidad y cambios',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Podemos modificar, suspender o descontinuar la aplicación (o parte de ella) en cualquier momento. Procuraremos avisar los cambios relevantes. También podemos actualizar estos Términos; los cambios sustanciales se comunicarán a través de la aplicación.',
        },
      ],
    },
    {
      titulo: '11. Terminación',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Usted puede dejar de usar la aplicación y eliminar su cuenta en cualquier momento. Podemos suspender o cancelar su cuenta si incumple estos Términos.',
        },
      ],
    },
    {
      titulo: '12. Ley aplicable y jurisdicción',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces y tribunales competentes de [POR DEFINIR: ciudad], Colombia.',
        },
      ],
    },
    {
      titulo: '13. Contacto',
      destacado: 'contacto',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Para cualquier duda sobre estos Términos, escríbanos a: [POR DEFINIR: correo de contacto].',
        },
      ],
    },
  ],
}
