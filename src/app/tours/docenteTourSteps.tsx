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
import galloApuntarDerecha from "../../assets/gallos_tour/gallo_apuntar_derecha.png";
import galloApuntarIzquierda from "../../assets/gallos_tour/gallo_apuntar_izquierda.png";
import galloApuntarArriba from "../../assets/gallos_tour/gallo_apuntar_arriba.png";
import galloExplicacion from "../../assets/gallos_tour/gallo_explicacion.png";
import galloExplicacion2 from "../../assets/gallos_tour/gallo_explicacion_2.png";
import galloGracias from "../../assets/gallos_tour/gallo_gracias.png";
import galloCafe from "../../assets/gallos_tour/gallo_cafe.png";

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
    title: "Bienvenido al panel docente",
    content: (
      <>
        Este es tu <strong>menú de navegación</strong>. Desde aquí accedes a todos los formularios 
        y secciones del sistema. Te guiaremos paso a paso para que conozcas cada apartado.
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  // ── Saludo y fecha ──
  {
    target: "docente-dashboard-saludo",
    view: "dashboard",
    title: "Tu espacio personal",
    content: (
      <>
        Aquí encuentras un <strong>saludo personalizado</strong> con tu nombre y la fecha actual. 
        El sistema te recibe cada vez que ingresas.
      </>
    ),
    placement: "bottom",
    image: galloExplicacion,
  },
  // ── Carrusel ──
  {
    target: "docente-dashboard-carrusel",
    view: "dashboard",
    title: "Carrusel informativo",
    content: (
      <>
        Este carrusel muestra información relevante de la universidad. 
        Las primeras dos imágenes son <strong>enlaces interactivos</strong>:
        <ul className="mt-2 space-y-1">
          <li className="text-xs">📄 <strong>Manual de Usuario del Docente</strong> — Guía completa del sistema</li>
          <li className="text-xs">📄 <strong>Nomenclatura</strong> — Documento de referencia académica</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion2,
  },
  // ── Minimizar carrusel ──
  {
    target: "docente-dashboard-carrusel-minimizar",
    view: "dashboard",
    title: "Minimizar el carrusel",
    content: (
      <>
        Si el carrusel ocupa demasiado espacio, puedes reducirlo con el botón 
        <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
            <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Minimizar
        </span>
        ubicado en la esquina superior derecha.
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },
  // ── ESTADÍSTICAS ──────────────────────────────────────────────────────────
  {
    target: "docente-dashboard-stats",
    view: "dashboard",
    title: "Resumen de actividad",
    content: (
      <>
        Estas tres tarjetas muestran el estado general de tus documentos:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" /> <strong>Pendientes</strong> — esperando revisión</li>
          <li className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> <strong>Aprobados</strong> — ya revisados</li>
          <li className="text-xs"><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5" /> <strong>En revisión</strong> — proceso actual</li>
        </ul>
        Haz clic en cualquier tarjeta para ir al historial filtrado.
      </>
    ),
    placement: "bottom",
    image: galloExplicacion,
  },
  {
    target: "docente-dashboard-recent",
    view: "dashboard",
    title: "Documentos recientes",
    content: (
      <>
        Últimos archivos enviados al administrador. Cada fila muestra:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><strong>Nombre</strong> del documento y formulario asociado</li>
          <li className="text-xs"><strong>Estado</strong>:{" "}
            <Ic icon={CheckCircle2} label="Revisado" />,{" "}
            <Ic icon={Clock2} label="Pendiente" />,{" "}
            <Ic icon={Undo2} label="Devuelto" /> o{" "}
            <Ic icon={RefreshCw} label="Reenviado" />
          </li>
          <li className="text-xs">Botón <Ic icon={Eye} label="Ver" /> para previsualizar el PDF</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion2,
  },
  {
    target: "docente-dashboard-upcoming",
    view: "dashboard",
    title: "Próximas fechas límite",
    content: (
      <>
        El sistema calcula automáticamente el tiempo restante para cada formulario activo.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Los <strong>más urgentes</strong> aparecen primero</li>
          <li className="text-xs">Sin fecha límite = el administrador lo mantiene abierto</li>
          <li className="text-xs">Colores: <span className="text-red-600">urgente</span>, <span className="text-amber-600">próximo</span>, <span className="text-emerald-600">con tiempo</span></li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },
  // ── CARRERAS ──────────────────────────────────────────────────────────────
  {
    target: "docente-dashboard-carreras",
    view: "dashboard",
    title: "Carreras de la institución",
    content: (
      <>
        Panel informativo con los <strong>logotipos de las carreras</strong> que ofrece la universidad.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Cambia automáticamente al alternar entre <strong>modo claro y oscuro</strong></li>
          <li className="text-xs">Slider infinito con rotación automática</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloCafe,
  },

  // ── PASOS DE LA TOOLBAR ──
  {
    target: "toolbar-toggle",
    view: "dashboard",
    title: "Barra de herramientas",
    content: (
      <>
        En la esquina inferior derecha tienes la <strong>barra de herramientas</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Botón <strong>⬆️</strong> para expandir y ver todas las opciones</li>
          <li className="text-xs">Personaliza: <strong>tema de color</strong>, <strong>diseño</strong> y <strong>fondo</strong></li>
          <li className="text-xs">Alterna entre <strong>modo claro y oscuro</strong> con el botón correspondiente</li>
        </ul>
      </>
    ),
    placement: "top-left",
    image: galloExplicacion,
  },
  {
    target: "toolbar-theme-toggle",
    view: "dashboard",
    title: "Modo claro y oscuro",
    content: (
      <>
        El botón 
        <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
          🌙 / ☀️
        </span>
        cambia la apariencia de todo el sistema entre <strong>modo claro</strong> y <strong>modo oscuro</strong>.
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Útil para reducir la fatiga visual al trabajar en entornos con poca luz.
        </p>
      </>
    ),
    placement: "top-left",
    image: galloExplicacion,
  },
  {
    target: "toolbar-themes",
    view: "dashboard",
    title: "Temas de color",
    content: (
      <>
        Con el botón <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">🎨 Tema de color</span> 
        puedes cambiar los <strong>colores principales</strong> de la interfaz.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Opciones: Esmeralda, Océano, Violeta, Rosa, Ámbar, Índigo, Rojo, Naranja, Cian, Lima, Teal, Fucsia, Blanco, Negro y Gris</li>
          <li className="text-xs">El tema se <strong>guarda automáticamente</strong> en tu cuenta</li>
        </ul>
      </>
    ),
    placement: "top-left",
    image: galloExplicacion2,
  },
  {
    target: "toolbar-layout",
    view: "dashboard",
    title: "Diseño del sistema",
    content: (
      <>
        El botón <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">📐 Diseño</span> 
        cambia la estructura visual del sistema:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><strong>Clásico</strong> — Tarjetas con sombras y bordes redondeados</li>
          <li className="text-xs"><strong>Empresarial</strong> — Estilo formal, rectángulos sin sombras</li>
        </ul>
      </>
    ),
    placement: "top-left",
    image: galloExplicacion,
  },
  {
    target: "toolbar-background",
    view: "dashboard",
    title: "Fondo de pantalla",
    content: (
      <>
        El botón <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">🖼️ Fondo</span> 
        abre un panel para personalizar el fondo:
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Seleccionar entre <strong>fondos predefinidos</strong></li>
          <li className="text-xs">Subir tu <strong>propia imagen</strong></li>
          <li className="text-xs">Ajustar <strong>transparencia</strong> y <strong>desenfoque</strong> de los paneles</li>
          <li className="text-xs">Oscurecer el fondo para mejorar la legibilidad</li>
        </ul>
      </>
    ),
    placement: "top-left",
    image: galloExplicacion2,
  },

  // ── CONTINÚA CON PLANEACIÓN ───────────────────────────────────────────────
  {
    target: "nav-planeacion",
    view: "planeacion",
    title: "Planeación didáctica",
    content: (
      <>
        Sube tu <strong>planeación de clase</strong> en formato PDF.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Entrega recomendada: <strong>3 días después</strong> de cada parcial</li>
          <li className="text-xs">Solo archivos <strong>PDF de hasta 15 MB</strong></li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  {
    target: "docente-history-btn",
    view: "planeacion",
    title: "Historial de envíos",
    content: (
      <>
        El botón <Ic icon={History} label="Historial" /> abre un panel con todos tus envíos.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Revisa el <strong>estado</strong> de cada envío</li>
          <li className="text-xs"><Ic icon={Eye} label="Ver el PDF" /> que subiste</li>
          <li className="text-xs"><Ic icon={Pencil} label="Editar" /> si el envío está pendiente</li>
          <li className="text-xs"><Ic icon={Undo2} label="Reenviar" /> cuando el administrador lo devuelva</li>
        </ul>
      </>
    ),
    placement: "bottom",
    image: galloApuntarArriba,
  },
  {
    target: "docente-historial-panel",
    view: "planeacion:open-historial",
    title: "Panel de historial",
    content: (
      <>
        Cada tarjeta representa un envío. Acciones disponibles:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><Ic icon={Eye} label="Ver el PDF" /> — previsualización</li>
          <li className="text-xs"><Ic icon={Pencil} label="Editar" /> — solo si está pendiente</li>
          <li className="text-xs"><Ic icon={Undo2} label="Reenviar" /> — cuando fue devuelto con comentarios</li>
        </ul>
      </>
    ),
    placement: "left",
    image: galloApuntarIzquierda,
  },

  // ── PLANEACIÓN — FORMULARIO ───────────────────────────────────────────────
  {
    target: "docente-form-plan",
    view: "planeacion:form-plan",
    title: "Selector de plan educativo",
    content: (
      <>
        Elige el <strong>plan</strong> de tu grupo:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><strong>Nuevo Modelo</strong> — TSU e Ingeniería del nuevo currículo</li>
          <li className="text-xs"><strong>Plan Normal</strong> — Ingenierías del plan anterior</li>
        </ul>
        Esta selección determina las carreras y cuatrimestres disponibles.
      </>
    ),
    placement: "bottom",
    image: galloExplicacion2,
  },
  {
    target: "docente-form-fields",
    view: "planeacion",
    title: "Datos académicos",
    content: (
      <>
        Completa los campos en orden secuencial:
        <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
          <li><strong>Carrera</strong> — se habilita al elegir el plan</li>
          <li><strong>Cuatrimestre</strong> — se habilita al elegir la carrera</li>
          <li><strong>Materia</strong> — se habilita al elegir el cuatrimestre</li>
          <li><strong>Parcial</strong> — Primero, Segundo o Tercero</li>
          <li><strong>Grupo</strong> — los grupos los crea el administrador</li>
        </ol>
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },
  {
    target: "docente-form-upload",
    view: "planeacion",
    title: "Carga de archivos",
    content: (
      <>
        Arrastra archivos PDF o haz clic en el botón 
        <Ic icon={Upload} label="Selecciona tus archivos" />.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Máximo <strong>3 archivos</strong> por envío</li>
          <li className="text-xs">Límite de <strong>15 MB</strong> por archivo</li>
          <li className="text-xs">Puedes reemplazar o eliminar archivos individualmente</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion2,
  },
  {
    target: "docente-form-nota",
    view: "planeacion",
    title: "Nota para administración",
    content: (
      <>
        Campo <strong>opcional</strong> para comunicarte con el administrador.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Útil para explicar correcciones al reenviar</li>
          <li className="text-xs">El administrador verá la nota al revisar el documento</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },
  {
    target: "docente-form-submit",
    view: "planeacion",
    title: "Enviar planeación",
    content: (
      <>
        El botón <Ic icon={Send} label="Enviar planeación" /> se activa cuando:
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Todos los campos obligatorios están completos</li>
          <li className="text-xs">Hay al menos un archivo PDF cargado</li>
        </ul>
        <p className="mt-1 text-xs text-slate-500">
          En edición, cambia a <strong>«Actualizar planeación»</strong>. 
          El botón <strong>«Limpiar»</strong> reinicia el formulario.
        </p>
      </>
    ),
    placement: "top",
    image: galloApuntarArriba,
  },

  // ── INSTRUMENTO 30/40 ────────────────────────────────────────────────────────
  {
    target: "nav-instrumento-30-normal",
    view: "instrumento-30-normal",
    title: "Instrumento 30% — Plan Normal",
    content: (
      <>
        <strong>Instrumento de evaluación del 30%</strong> para Plan Normal.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Proceso <strong>idéntico</strong> al de Planeación</li>
          <li className="text-xs">Mismos campos: plan, carrera, cuatrimestre, materia, parcial y grupo</li>
          <li className="text-xs">Botón <Ic icon={History} label="Historial" /> disponible</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  {
    target: "nav-instrumento-40-nuevo",
    view: "instrumento-40-nuevo",
    title: "Instrumento 40% — Nuevo Modelo",
    content: (
      <>
        <strong>Instrumento del 40%</strong> para Plan Nuevo Modelo (TSU e Ingeniería).
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Mismo flujo que Planeación</li>
          <li className="text-xs">Disponible según período configurado por el administrador</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── INSTRUMENTO 60/70 ────────────────────────────────────────────────────────
  {
    target: "nav-instrumento-60-nuevo",
    view: "instrumento-60-nuevo",
    title: "Instrumento 60% — Nuevo Modelo",
    content: (
      <>
        <strong>Instrumento del 60%</strong> para Plan Nuevo Modelo.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Disponible cuando el administrador lo habilite</li>
          <li className="text-xs">Historial independiente de otros instrumentos</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  {
    target: "nav-instrumento-70-normal",
    view: "instrumento-70-normal",
    title: "Instrumento 70% — Plan Normal",
    content: (
      <>
        <strong>Instrumento del 70%</strong> para Plan Normal.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Mismo proceso de carga de PDF</li>
          <li className="text-xs">Mismos campos de datos académicos</li>
          <li className="text-xs">Historial disponible con <Ic icon={History} label="Historial" /></li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── REMEDIAL ─────────────────────────────────────────────────────────────────
  {
    target: "nav-remedial",
    view: "remedial",
    title: "Remedial",
    content: (
      <>
        <strong>Instrumento de evaluación del examen remedial</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Historial independiente</li>
          <li className="text-xs">Disponible según período habilitado por el administrador</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── LISTA CONCENTRADA ─────────────────────────────────────────────────────────
  {
    target: "nav-lista-concentrada",
    view: "lista-concentrada",
    title: "Lista concentrada",
    content: (
      <>
        <strong>Lista concentrada de calificaciones</strong> del grupo.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Documento oficial con resumen de notas por parcial</li>
          <li className="text-xs">Se sube al término de cada parcial en formato PDF</li>
          <li className="text-xs">Historial completo de envíos anteriores</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── ASESORÍA ──────────────────────────────────────────────────────────────────
  {
    target: "nav-asesoria",
    view: "asesoria",
    title: "Asesoría académica",
    content: (
      <>
        Registro de <strong>asesorías académicas</strong> fuera del horario de clase.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Sube el documento PDF con la evidencia</li>
          <li className="text-xs">Hasta <strong>3 archivos</strong> por entrega</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── PORTAFOLIO ────────────────────────────────────────────────────────────────
  {
    target: "nav-portafolio",
    view: "portafolio",
    title: "Portafolio digital final",
    content: (
      <>
        <strong>Compendio de evidencias</strong> docentes al cierre del cuatrimestre.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Incluye instrumentos, listas y planeaciones</li>
          <li className="text-xs">Disponible al finalizar el cuatrimestre</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── ACTA FINAL ────────────────────────────────────────────────────────────────
  {
    target: "nav-acta-final",
    view: "acta-final",
    title: "Acta final",
    content: (
      <>
        <strong>Acta oficial de calificaciones finales</strong> del cuatrimestre.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Documento capturado previamente en el sistema institucional</li>
          <li className="text-xs">PDF debe incluir firma del docente y sello</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── ESTADÍAS ─────────────────────────────────────────────────────────────────
  {
    target: "nav-estadias",
    view: "estadias",
    title: "Estadías",
    content: (
      <>
        Gestión documental para <strong>asesores de estadías</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Carta de presentación del alumno</li>
          <li className="text-xs">Carta de aceptación de la empresa</li>
          <li className="text-xs">Reportes de seguimiento y documentos de cierre</li>
        </ul>
        Cada tipo tiene su propio apartado.
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── TUTORÍAS ──────────────────────────────────────────────────────────────────
  {
    target: "nav-tutorias",
    view: "tutorias",
    title: "Tutorías",
    content: (
      <>
        Sección disponible para usuarios con <strong>rol de tutor</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Carga académica</li>
          <li className="text-xs">Reporte de bajas</li>
          <li className="text-xs">Concentrados de asistencia</li>
          <li className="text-xs">Actas de tutoría</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },

  // ── MENSAJES ─────────────────────────────────────────────────────────────────
  {
    target: "nav-mensajes",
    view: "mensajes",
    title: "Mensajería interna",
    content: (
      <>
        Comunicación directa con el <strong>administrador</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Notificaciones cuando se devuelve un documento</li>
          <li className="text-xs">Indicador <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" /> en el menú cuando hay mensajes sin leer</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloCafe,
  },
  {
    target: "docente-messages-search",
    view: "mensajes",
    title: "Búsqueda en conversación",
    content: (
      <>
        Como docente, tu único contacto es el <strong>Administrador</strong>.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Busca mensajes específicos por palabra clave</li>
          <li className="text-xs">Filtro en tiempo real mientras escribes</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarIzquierda,
  },
  {
    target: "docente-messages-composer",
    view: "mensajes",
    title: "Redactar mensaje",
    content: (
      <>
        Escribe tu mensaje y presiona <strong>Enter</strong> o el botón 
        <Ic icon={Send} label="Enviar" />.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Adjunta archivos PDF o imágenes</li>
          <li className="text-xs">Responde a mensajes específicos manteniendo el hilo</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },

  // ── HISTORIAL ────────────────────────────────────────────────────────────────
  {
    target: "nav-historial",
    view: "historial",
    title: "Historial de PDFs",
    content: (
      <>
        Vista <strong>global y centralizada</strong> de todos tus documentos.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Consulta el estado de cada envío</li>
          <li className="text-xs">Abre o descarga cualquier PDF</li>
          <li className="text-xs">Lee comentarios del administrador en documentos devueltos</li>
          <li className="text-xs">Ordenados del más reciente al más antiguo</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  {
    target: "historial-filters",
    view: "historial",
    title: "Búsqueda y filtros",
    content: (
      <>
        Tres herramientas para encontrar lo que necesitas:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><Ic icon={Search} label="Buscar" /> — por nombre del archivo o materia</li>
          <li className="text-xs"><Ic icon={FileText} label="Apartado" /> — filtrar por formulario específico</li>
          <li className="text-xs"><Ic icon={Filter} label="Estado" /> — Todos, Revisados, Pendientes, Devueltos o Reenviados</li>
        </ul>
        Los filtros se guardan para tu próxima visita.
      </>
    ),
    placement: "bottom",
    image: galloExplicacion2,
  },
  {
    target: "historial-list",
    view: "historial",
    title: "Lista de documentos",
    content: (
      <>
        Cada tarjeta representa un envío. Información disponible:
        <ul className="mt-2 space-y-1">
          <li className="text-xs"><strong>Estado</strong>:{" "}
            <Ic icon={Clock2} label="Pendiente" /> ·{" "}
            <Ic icon={CheckCircle2} label="Revisado" /> ·{" "}
            <Ic icon={Undo2} label="Devuelto" /> ·{" "}
            <Ic icon={RefreshCw} label="Reenviado" />
          </li>
          <li className="text-xs"><strong>Metadatos</strong>: carrera, plan, materia, grupo y parcial</li>
          <li className="text-xs"><Ic icon={StickyNote} label="Motivo" /> — comentario del administrador en documentos devueltos</li>
          <li className="text-xs"><Ic icon={Eye} label="Ver" /> — previsualización del PDF</li>
          <li className="text-xs"><Ic icon={Download} label="Descargar" /> — copia local del archivo</li>
        </ul>
      </>
    ),
    placement: "top",
    image: galloExplicacion,
  },

  // ── MI PERFIL ─────────────────────────────────────────────────────────────────
  {
    target: "nav-perfil",
    view: "perfil",
    title: "Mi Perfil",
    content: (
      <>
        Gestiona toda tu información personal:
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Foto de perfil</li>
          <li className="text-xs">Nombre</li>
          <li className="text-xs">Contraseña de acceso</li>
          <li className="text-xs">Estadísticas de actividad</li>
        </ul>
      </>
    ),
    placement: "right",
    image: galloApuntarDerecha,
  },
  {
    target: "perfil-info-card",
    view: "perfil",
    title: "Información personal",
    content: (
      <>
        <ul className="space-y-1">
          <li className="text-xs">Haz clic en la foto o en <Ic icon={Upload} label="Cambiar Foto" /> para subir una imagen</li>
          <li className="text-xs">Formatos: <strong>JPG, PNG o WEBP</strong>, máximo 8 MB</li>
          <li className="text-xs">Edita tu <strong>nombre y apellidos</strong></li>
          <li className="text-xs">Correo y rol asignados por el administrador (no editables)</li>
        </ul>
        <p className="mt-1 text-xs">Presiona <strong>«Guardar Cambios»</strong> al finalizar.</p>
      </>
    ),
    placement: "right",
    image: galloExplicacion,
  },
  {
    target: "perfil-account-card",
    view: "perfil",
    title: "Información de cuenta",
    content: (
      <>
        Muestra la <strong>fecha de creación</strong> de tu cuenta.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Dato de solo lectura</li>
          <li className="text-xs">Asignado por el administrador al registrarte</li>
        </ul>
      </>
    ),
    placement: "left",
    image: galloApuntarIzquierda,
  },
  {
    target: "perfil-security-card",
    view: "perfil",
    title: "Cambiar contraseña",
    content: (
      <>
        Usa el botón <Ic icon={Key} label="Cambiar Contraseña" /> para actualizar tu acceso.
        <ul className="mt-2 space-y-1">
          <li className="text-xs">Ingresa tu <strong>contraseña actual</strong></li>
          <li className="text-xs">Nueva contraseña <strong>dos veces</strong> para confirmar</li>
          <li className="text-xs">Mínimo <strong>8 caracteres</strong> con mayúsculas, minúsculas, números y caracteres especiales</li>
        </ul>
      </>
    ),
    placement: "left",
    image: galloApuntarIzquierda,
  },

  // ── FINAL ──────────────────────────────────────────────────────────────────
  {
    target: "perfil-stats-card",
    view: "perfil",
    title: "Has completado el recorrido",
    content: (
      <>
        <p className="mb-2">Conoces todas las secciones del sistema. Puedes repetir este tutorial en cualquier momento usando el botón 
          <HelpCircle className="inline h-4 w-4 mx-1 align-middle text-emerald-500" /> 
          en la barra de herramientas.
        </p>
        <p className="font-medium text-emerald-600 dark:text-emerald-400">
          ¡Gracias por completar la guía! Esperamos que el sistema sea de gran ayuda para tu labor docente.
        </p>
      </>
    ),
    placement: "top",
    image: galloGracias,
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