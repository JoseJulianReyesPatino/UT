import React from "react";
import {
  History,
  Upload,
  Eye,
  Pencil,
  Undo2,
  Key,
  HelpCircle,
  CheckCircle2,
  Send,
  Download,
  Search,
  Filter,
  StickyNote,
  Clock2,
  RefreshCw,
  FileText,
} from "lucide-react";
import { type TourStep } from "../components/tour/TourOverlay";

function Ic({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-300">
      <Icon className="inline-block h-3.5 w-3.5 flex-shrink-0" />
      {" "}{label}
    </span>
  );
}

const allDocenteSteps: TourStep[] = [
  // ── INICIO ──────────────────────────────────────────────────────────────────
  {
    target: "nav-dashboard",
    view: "dashboard",
    title: "¡Bienvenido al panel docente!",
    content:
      "Este es tu menú de navegación. Desde aquí accedes a todos los formularios y secciones del sistema. Te daremos un recorrido completo para que conozcas cada apartado y cómo usarlo.",
    placement: "right",
  },
  {
    target: "docente-dashboard-stats",
    view: "dashboard",
    title: "Tu resumen de actividad",
    content:
      "Estas tres tarjetas te muestran el estado general de tus documentos: cuántos tienes pendientes de revisión, cuántos ya fueron aprobados y cuántos fueron devueltos con comentarios. Haz clic en cualquiera para ir directamente a tu historial filtrado por ese estado.",
    placement: "bottom",
  },
  {
    target: "docente-dashboard-recent",
    view: "dashboard",
    title: "Documentos recientes",
    content: (
      <>
        Muestra los últimos archivos que enviaste al administrador. Cada fila indica el nombre del documento, el formulario al que pertenece y su estado actual:{" "}
        <Ic icon={CheckCircle2} label="Revisado" />,{" "}
        pendiente, devuelto o reenviado.
        Usa el botón <Ic icon={Eye} label="Ver" /> para abrir el PDF directamente desde aquí.
      </>
    ),
    placement: "top",
  },
  {
    target: "docente-dashboard-upcoming",
    view: "dashboard",
    title: "Próximas fechas límite",
    content:
      "El sistema calcula automáticamente cuánto tiempo falta para que venza cada formulario activo. Los más urgentes aparecen primero. Cuando un formulario no tiene fecha límite el administrador lo mantiene abierto indefinidamente.",
    placement: "top",
  },
  {
    target: "docente-dashboard-carreras",
    view: "dashboard",
    title: "Carreras de la institución",
    content:
      "Panel informativo que muestra los logotipos de las carreras que ofrece la universidad. Cambia de imagen instantáneamente al alternar entre modo claro y oscuro.",
    placement: "top",
  },

  // ── PLANEACIÓN ───────────────────────────────────────────────────────────────
  {
    target: "nav-planeacion",
    view: "planeacion",
    title: "Planeación didáctica",
    content:
      "Aquí subes tu planeación de clase en formato PDF. La fecha recomendada de entrega es 3 días después de la aplicación de cada parcial. El formulario solo acepta archivos PDF de hasta 15 MB.",
    placement: "right",
  },
  {
    target: "docente-history-btn",
    view: "planeacion",
    title: "Botón de Historial",
    content: (
      <>
        El botón <Ic icon={History} label="Historial" /> abre un panel lateral con todos los envíos que has hecho en este formulario. Desde ahí puedes revisar el estado de cada envío, ver el PDF que subiste, editar los datos si el envío sigue pendiente, o reenviar el documento si el administrador lo devolvió con un comentario.
      </>
    ),
    placement: "bottom",
  },
  {
    target: "docente-historial-panel",
    view: "planeacion:open-historial",
    title: "Dentro del Historial",
    content: (
      <>
        Cada tarjeta del historial representa un envío. Desde aquí puedes:{" "}
        <Ic icon={Eye} label="Ver el PDF" /> que subiste,{" "}
        <Ic icon={Pencil} label="Editar los datos" /> si el envío aún está pendiente de revisión, y{" "}
        <Ic icon={Undo2} label="Reenviar" /> el documento cuando el administrador lo haya devuelto con un comentario de corrección.
      </>
    ),
    placement: "left",
  },

  // ── PLANEACIÓN — FORMULARIO ───────────────────────────────────────────────
  {
    target: "docente-form-plan",
    view: "planeacion:form-plan",
    title: "Selector de Plan educativo",
    content:
      "Lo primero que debes elegir es el plan al que pertenece tu grupo. «Plan Nuevo Modelo» aplica para programas TSU e Ingeniería del nuevo currículo. «Plan Normal» aplica para las Ingenierías del plan anterior. Esta selección determina qué carreras y cuatrimestres estarán disponibles en los campos siguientes.",
    placement: "bottom",
  },
  {
    target: "docente-form-fields",
    view: "planeacion",
    title: "Datos académicos",
    content:
      "Completa los cinco campos en orden: Carrera (se habilita al elegir el plan), Cuatrimestre (se habilita al elegir la carrera), Materia (se habilita al elegir el cuatrimestre), Parcial (Primero, Segundo o Tercero) y Grupo (los grupos disponibles los crea el administrador). Cada campo depende del anterior, así que ve llenándolos de arriba hacia abajo.",
    placement: "top",
  },
  {
    target: "docente-form-upload",
    view: "planeacion",
    title: "Carga de archivos PDF",
    content: (
      <>
        Arrastra uno o varios archivos PDF al área punteada, o haz clic en el botón <Ic icon={Upload} label="Selecciona tus archivos" /> para abrirlos desde tu equipo. Puedes subir hasta 3 archivos por envío con un límite de 15 MB por archivo. Una vez cargados puedes reemplazar o eliminar cada archivo individualmente antes de enviar.
      </>
    ),
    placement: "top",
  },
  {
    target: "docente-form-nota",
    view: "planeacion",
    title: "Nota para administración",
    content:
      "Campo opcional donde puedes escribirle un mensaje al administrador relacionado con este envío. Por ejemplo, si reenvías después de una corrección puedes explicar qué cambios hiciste. El administrador verá esta nota al revisar tu documento.",
    placement: "top",
  },
  {
    target: "docente-form-submit",
    view: "planeacion",
    title: "Enviar planeación",
    content: (
      <>
        El botón <Ic icon={Send} label="Enviar planeación" /> se activa solo cuando todos los campos obligatorios están completos y hay al menos un PDF cargado. Si estás editando un envío anterior, el botón cambia a «Actualizar planeación». El botón «Limpiar» borra el formulario sin enviar nada.
      </>
    ),
    placement: "top",
  },

  // ── INSTRUMENTO 30/40 ────────────────────────────────────────────────────────
  {
    target: "nav-instrumento-30-normal",
    view: "instrumento-30-normal",
    title: "Instrumento 30% — Plan Normal",
    content:
      "Aquí subes el instrumento de evaluación que vale el 30% de la calificación del parcial, correspondiente al Plan Normal (Ingenierías). El proceso es idéntico al de Planeación: elige el plan, carrera, cuatrimestre, materia, parcial y grupo, adjunta el PDF y envía. También tienes disponible el botón Historial para revisar tus envíos anteriores.",
    placement: "right",
  },
  {
    target: "nav-instrumento-40-nuevo",
    view: "instrumento-40-nuevo",
    title: "Instrumento 40% — Nuevo Modelo",
    content:
      "Instrumento de evaluación con ponderación del 40% para el Plan Nuevo Modelo (TSU e Ingeniería). Funciona igual que el formulario de Planeación. Recuerda que el formulario solo estará disponible durante el período que configure el administrador.",
    placement: "right",
  },

  // ── INSTRUMENTO 60/70 ────────────────────────────────────────────────────────
  {
    target: "nav-instrumento-60-nuevo",
    view: "instrumento-60-nuevo",
    title: "Instrumento 60% — Nuevo Modelo",
    content:
      "Instrumento de evaluación del 60% para el Plan Nuevo Modelo. Se sube cuando el administrador habilite el acceso para este período. El historial de este formulario es independiente del resto de instrumentos.",
    placement: "right",
  },
  {
    target: "nav-instrumento-70-normal",
    view: "instrumento-70-normal",
    title: "Instrumento 70% — Plan Normal",
    content:
      "Instrumento de evaluación del 70% para el Plan Normal (Ingenierías). Mismo proceso de carga de PDF con los mismos campos de datos académicos. Puedes consultar envíos anteriores desde el botón Historial.",
    placement: "right",
  },

  // ── REMEDIAL ─────────────────────────────────────────────────────────────────
  {
    target: "nav-remedial",
    view: "remedial",
    title: "Remedial",
    content:
      "Aquí subes el instrumento de evaluación del examen remedial de tus alumnos. Este formulario tiene su propio historial independiente. Solo está disponible cuando el administrador lo habilite para el período de exámenes remediales del cuatrimestre.",
    placement: "right",
  },

  // ── LISTA CONCENTRADA ─────────────────────────────────────────────────────────
  {
    target: "nav-lista-concentrada",
    view: "lista-concentrada",
    title: "Lista concentrada",
    content:
      "Aquí entregas la lista concentrada de calificaciones de tu grupo. Es el documento oficial con el resumen de notas por parcial. Se llena al término de cada parcial y se sube en PDF. El historial guarda todos tus envíos anteriores de este formulario.",
    placement: "right",
  },

  // ── ASESORÍA ──────────────────────────────────────────────────────────────────
  {
    target: "nav-asesoria",
    view: "asesoria",
    title: "Asesoría académica",
    content:
      "En esta sección registras las asesorías académicas que brindas a tus alumnos fuera del horario de clase. Sube el documento en PDF con la evidencia: lista de asistencia, temas tratados y firmas de los alumnos. Puedes subir hasta 3 archivos por entrega.",
    placement: "right",
  },

  // ── PORTAFOLIO ────────────────────────────────────────────────────────────────
  {
    target: "nav-portafolio",
    view: "portafolio",
    title: "Portafolio digital final",
    content:
      "El portafolio digital es el compendio de evidencias de tu práctica docente al cierre del cuatrimestre. Incluye tus instrumentos de evaluación, listas de asistencia, planeaciones y demás documentos probatorios. Sube el archivo PDF cuando el administrador habilite el acceso al finalizar el cuatrimestre.",
    placement: "right",
  },

  // ── ACTA FINAL ────────────────────────────────────────────────────────────────
  {
    target: "nav-acta-final",
    view: "acta-final",
    title: "Acta final",
    content:
      "Envía aquí el acta oficial de calificaciones finales del cuatrimestre. Este documento debe haberse capturado previamente en el sistema institucional. El PDF que subas debe incluir la firma del docente y el sello correspondiente.",
    placement: "right",
  },

  // ── ESTADÍAS ─────────────────────────────────────────────────────────────────
  {
    target: "nav-estadias",
    view: "estadias",
    title: "Estadías",
    content:
      "Si eres asesor de estadías, en esta sección gestionas toda la documentación del proceso: carta de presentación del alumno, carta de aceptación de la empresa, reportes de seguimiento y documentos de cierre. Cada tipo de documento tiene su propio apartado dentro del formulario.",
    placement: "right",
  },

  // ── TUTORÍAS ──────────────────────────────────────────────────────────────────
  {
    target: "nav-tutorias",
    view: "tutorias",
    title: "Tutorías",
    content:
      "Esta sección aparece únicamente si tu cuenta tiene el rol de tutor asignado. Aquí subes los documentos de tutoría del cuatrimestre: carga académica, bajas, concentrados de asistencia, actas de tutoría y demás reportes que solicite la coordinación.",
    placement: "right",
  },

  // ── MENSAJES ─────────────────────────────────────────────────────────────────
  {
    target: "nav-mensajes",
    view: "mensajes",
    title: "Mensajería interna",
    content:
      "Sistema de comunicación directa con el administrador. Recibirás notificaciones aquí cuando el administrador devuelva un documento con comentarios o cuando necesite aclaraciones sobre algún envío. El ícono de mensajes en el menú muestra una burbuja roja cuando tienes mensajes sin leer.",
    placement: "right",
  },
  {
    target: "docente-messages-search",
    view: "mensajes",
    title: "Buscar en la conversación",
    content:
      "Como docente o tutor, tu único contacto dentro del sistema es el Administrador. Usa este campo para localizar cualquier mensaje específico dentro de esa conversación: escribe una palabra o frase y el chat filtra los resultados en tiempo real.",
    placement: "right",
  },
  {
    target: "docente-messages-composer",
    view: "mensajes",
    title: "Redactar un mensaje",
    content: (
      <>
        Escribe tu mensaje en el campo de texto y presiona Enter o el botón <Ic icon={Send} label="Enviar" /> para enviarlo. También puedes adjuntar archivos PDF o imágenes usando el botón «Adjuntar archivo» si necesitas compartir algún documento de referencia. Puedes responder a un mensaje específico manteniendo el hilo de la conversación.
      </>
    ),
    placement: "top",
  },

  // ── HISTORIAL ────────────────────────────────────────────────────────────────
  {
    target: "nav-historial",
    view: "historial",
    title: "Historial de PDFs",
    content: (
      <>
        Vista global y centralizada de <strong>todos</strong> los documentos que has enviado en el
        sistema, sin importar el formulario al que pertenezcan. Aquí puedes consultar el estado de
        cada envío, abrir o descargar cualquier PDF y leer los comentarios del administrador cuando
        un documento haya sido devuelto para corrección. Los documentos se ordenan del más reciente
        al más antiguo.
      </>
    ),
    placement: "right",
  },
  {
    target: "historial-filters",
    view: "historial",
    title: "Búsqueda y filtros",
    content: (
      <>
        Tres herramientas para encontrar exactamente lo que necesitas:
        <ul className="mt-2 space-y-1.5">
          <li>
            <Ic icon={Search} label="Buscar" />
            {" "}— escribe el nombre del archivo o el nombre de la materia para filtrar en tiempo real.
          </li>
          <li>
            <Ic icon={FileText} label="Apartado" />
            {" "}— desplegable para mostrar solo documentos de un formulario específico: Planeación, Instrumento 30 %, Lista Concentrada, etc.
          </li>
          <li>
            <Ic icon={Filter} label="Estado" />
            {" "}— filtra por estado: Todos, Revisados, Pendientes, Devueltos o Reenviados. El filtro se guarda para la próxima vez que entres.
          </li>
        </ul>
      </>
    ),
    placement: "bottom",
  },
  {
    target: "historial-list",
    view: "historial",
    title: "Tus documentos enviados",
    content: (
      <>
        Cada tarjeta representa un envío. Esto es lo que puedes ver y hacer en cada una:
        <ul className="mt-2 space-y-1.5">
          <li>
            <strong>Estado del documento</strong>:{" "}
            <Ic icon={Clock2} label="Pendiente" />{" "}en revisión ·{" "}
            <Ic icon={CheckCircle2} label="Revisado" />{" "}aprobado ·{" "}
            <Ic icon={Undo2} label="Devuelto" />{" "}con comentarios ·{" "}
            <Ic icon={RefreshCw} label="Reenviado" />{" "}ya corregido y enviado de nuevo.
          </li>
          <li>
            <strong>Etiquetas de metadatos</strong>: carrera, plan educativo, materia, grupo y parcial al que pertenece el documento.
          </li>
          <li>
            <Ic icon={StickyNote} label="Motivo" />
            {" "}— aparece solo en documentos devueltos o reenviados; al hacer clic muestra el comentario exacto que dejó el administrador explicando qué debes corregir.
          </li>
          <li>
            <Ic icon={Eye} label="Ver" />
            {" "}— abre el PDF directamente en pantalla dentro del sistema, sin necesidad de descargarlo.
          </li>
          <li>
            <Ic icon={Download} label="Descargar" />
            {" "}— guarda una copia del archivo PDF en tu dispositivo. Cuando el envío tiene varios archivos, cada uno tiene su propio botón de descarga.
          </li>
        </ul>
      </>
    ),
    placement: "top",
  },

  // ── MI PERFIL ─────────────────────────────────────────────────────────────────
  {
    target: "nav-perfil",
    view: "perfil",
    title: "Mi Perfil",
    content:
      "Aquí gestionas toda la información de tu cuenta: foto de perfil, nombre, y contraseña de acceso. También puedes ver las estadísticas de tu actividad en el sistema.",
    placement: "right",
  },
  {
    target: "perfil-info-card",
    view: "perfil",
    title: "Información personal",
    content: (
      <>
        Haz clic en tu foto o en el botón <Ic icon={Upload} label="Cambiar Foto" /> para subir una imagen desde tu equipo (JPG, PNG o WEBP, máximo 8 MB). Debajo puedes editar tu nombre y apellidos. El correo electrónico y el rol son asignados por el administrador y no pueden modificarse desde aquí. Cuando termines de editar, presiona «Guardar Cambios» para que los datos queden actualizados en todo el sistema.
      </>
    ),
    placement: "right",
  },
  {
    target: "perfil-account-card",
    view: "perfil",
    title: "Información de cuenta",
    content:
      "Muestra la fecha en que tu cuenta fue creada en el sistema. Este dato es de solo lectura y lo asigna el administrador al registrarte.",
    placement: "left",
  },
  {
    target: "perfil-security-card",
    view: "perfil",
    title: "Seguridad — Cambiar contraseña",
    content: (
      <>
        Usa el botón <Ic icon={Key} label="Cambiar Contraseña" /> para actualizar tu contraseña de acceso. Necesitarás ingresar tu contraseña actual y la nueva dos veces para confirmarla. La nueva contraseña debe tener al menos 8 caracteres.
      </>
    ),
    placement: "left",
  },
  {
    target: "perfil-stats-card",
    view: "perfil",
    title: "Estadísticas de actividad — ¡listo!",
    content: (
      <>
        Resumen de tu actividad en el sistema: total de documentos enviados, cuántos han sido revisados y aprobados, cuántos siguen en revisión y cuántos fueron devueltos. Ya conoces todas las secciones del sistema. Puedes repetir este tutorial en cualquier momento usando el botón <Ic icon={HelpCircle} label="Tutorial" /> que aparece en la esquina inferior derecha de la pantalla.
      </>
    ),
    placement: "top",
  },
];

/**
 * Devuelve los pasos del tour docente filtrando tutorías si el usuario no es
 * docente con etiqueta de tutor (solo tutor → el apartado no es novedoso para él).
 */
export function getDocenteTourSteps(showTutorias: boolean): TourStep[] {
  if (showTutorias) return allDocenteSteps;
  return allDocenteSteps.filter((s) => s.target !== "nav-tutorias");
}
