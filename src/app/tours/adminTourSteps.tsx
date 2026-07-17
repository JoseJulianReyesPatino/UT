import React from "react";
import {
  Eye,
  Check,
  MessageCircleMore,
  MessageSquare,
  Undo2,
  Pencil,
  Key,
  UserX,
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

export const adminTourSteps: TourStep[] = [
  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  {
    target: "nav-dashboard",
    view: "dashboard",
    title: "¡Bienvenido al panel de administración!",
    content:
      "Este es el menú principal. Desde aquí navegas a todas las secciones del sistema. Te daremos un recorrido completo para que conozcas cada apartado.",
    placement: "right",
  },
  {
    target: "admin-dashboard-stats",
    view: "dashboard",
    title: "Resumen general",
    content:
      "Estas tarjetas muestran de un vistazo el total de docentes registrados y el estado de los documentos: pendientes, revisados y revisados hoy. Haz clic en cualquiera para ir directamente a esa sección.",
    placement: "bottom",
  },
  {
    target: "admin-dashboard-pending",
    view: "dashboard",
    title: "Documentos pendientes de revisión",
    content:
      "Aquí aparecen los documentos más recientes que esperan tu aprobación. Puedes abrirlos directamente para revisarlos, marcarlos como revisados o devolverlos al docente con un comentario.",
    placement: "top",
  },
  {
    target: "admin-dashboard-activity",
    view: "dashboard",
    title: "Actividad reciente",
    content:
      "Registro de las últimas acciones en el sistema: aprobaciones, devoluciones y envíos. Te permite dar seguimiento a lo que ha ocurrido en el día.",
    placement: "top",
  },

  // ── GESTIÓN DE USUARIOS ──────────────────────────────────────────────────────
  {
    target: "nav-docentes",
    view: "docentes",
    title: "Gestión de usuarios",
    content:
      "En esta sección administras todos los usuarios del sistema: docentes, tutores y supervisores.",
    placement: "right",
  },
  {
    target: "admin-docentes-new-btn",
    view: "docentes",
    title: "Crear un nuevo usuario",
    content:
      "Usa este botón para registrar un nuevo usuario. Podrás asignarle uno o varios roles simultáneamente: Docente, Tutor y/o Supervisor. El sistema genera automáticamente una contraseña temporal.",
    placement: "bottom",
  },
  {
    target: "admin-docentes-filters",
    view: "docentes",
    title: "Filtros y búsqueda",
    content:
      "Filtra la lista por rol (docente, tutor, supervisor) y por estado (activo/inactivo). El buscador te permite encontrar usuarios por nombre o correo electrónico en tiempo real.",
    placement: "bottom",
  },
  {
    target: "admin-docentes-user-card",
    view: "docentes",
    title: "Tarjeta de usuario",
    content: (
      <>
        Cada fila muestra los datos del usuario y tres acciones:{" "}
        <Ic icon={Pencil} label="Editar datos" />,{" "}
        <Ic icon={Key} label="Restablecer contraseña" />, y{" "}
        <Ic icon={UserX} label="Activar / desactivar acceso" />.
      </>
    ),
    placement: "top",
  },

  // ── DOCUMENTOS ───────────────────────────────────────────────────────────────
  {
    target: "nav-documentos",
    view: "documentos",
    title: "Revisión de documentos",
    content:
      "Centro principal para revisar todos los documentos que los docentes han enviado al sistema.",
    placement: "right",
  },
  {
    target: "admin-docreview-tabs",
    view: "documentos",
    title: "Pestañas de estado",
    content:
      "Organiza los documentos por su estado: Todos, Pendientes (sin revisar), Devueltos (con comentarios), Reenviados (corregidos por el docente), Revisados, y Revisados hoy.",
    placement: "bottom",
  },
  {
    target: "admin-docreview-filters",
    view: "documentos",
    title: "Filtros avanzados",
    content:
      "Refina la búsqueda por plan educativo, carrera, cuatrimestre, materia, grupo, docente, parcial y tipo de apartado. Puedes combinar varios filtros a la vez.",
    placement: "bottom",
  },
  {
    target: "admin-docreview-actions",
    view: "documentos",
    title: "Acciones sobre cada documento",
    content: (
      <>
        Por cada documento tienes:{" "}
        <Ic icon={Eye} label="Ver el PDF" />,{" "}
        <Ic icon={Check} label="Marcar como revisado" />,{" "}
        <Ic icon={MessageCircleMore} label="Ver nota del docente" />,{" "}
        <Ic icon={MessageSquare} label="Enviar por mensajes" />, y{" "}
        <Ic icon={Undo2} label="Devolver con comentario" />.
      </>
    ),
    placement: "top",
  },

  // ── ESTADÍAS ─────────────────────────────────────────────────────────────────
  {
    target: "nav-estadias-admin",
    view: "estadias-admin",
    title: "Estadías",
    content:
      "Revisión de documentos del proceso de estadías: cartas de presentación, cartas de aceptación, actas finales y documentos relacionados.",
    placement: "right",
  },
  {
    target: "admin-estadias-tabs",
    view: "estadias-admin",
    title: "Pestañas de estadías",
    content:
      "Igual que en documentos, puedes filtrar por estado. La pestaña 'Reenviados' muestra documentos que el docente corrigió después de que los devolviste.",
    placement: "bottom",
  },
  {
    target: "admin-estadias-filters",
    view: "estadias-admin",
    title: "Filtros de estadías",
    content:
      "Esta sección incluye filtros específicos: Plan, Carrera, Cuatrimestre, Grupo, Docente, Apartado (tipo de documento) y Estado de devolución.",
    placement: "bottom",
  },

  // ── TUTORES ───────────────────────────────────────────────────────────────────
  {
    target: "nav-tutores",
    view: "tutores",
    title: "Documentos de tutores",
    content:
      "Revisión de los documentos que los tutores envían al sistema: carga académica, bajas, concentrados, actas y demás registros de tutoría.",
    placement: "right",
  },
  {
    target: "admin-tutores-tabs",
    view: "tutores",
    title: "Pestañas de tutores",
    content:
      "Filtra los documentos por estado. Funciona igual que la sección de documentos de docentes: pendientes, devueltos, reenviados y revisados.",
    placement: "bottom",
  },
  {
    target: "admin-tutores-filters",
    view: "tutores",
    title: "Filtros de tutores",
    content:
      "Busca por nombre de tutor, tipo de apartado o estado de devolución para localizar rápidamente el documento que necesitas revisar.",
    placement: "bottom",
  },

  // ── CICLOS ESCOLARES ──────────────────────────────────────────────────────────
  {
    target: "nav-ciclos",
    view: "ciclos",
    title: "Ciclos escolares",
    content:
      "Administra los períodos académicos del sistema. Los documentos están organizados por ciclo para facilitar el seguimiento histórico.",
    placement: "right",
  },
  {
    target: "admin-ciclos-new-btn",
    view: "ciclos",
    title: "Crear un nuevo ciclo",
    content:
      "Con este botón registras un nuevo período escolar indicando el año, mes de inicio y fin, y las fechas exactas. El nombre se genera automáticamente.",
    placement: "bottom",
  },
  {
    target: "admin-ciclos-list",
    view: "ciclos",
    title: "Lista de ciclos",
    content:
      "Cada tarjeta representa un ciclo con su estado (Activo / Cerrado) y el total de documentos. Haz clic en la tarjeta para ver sus documentos, o usa los botones para editarlo, activarlo/cerrarlo o eliminarlo.",
    placement: "bottom",
  },

  // ── MENSAJES ──────────────────────────────────────────────────────────────────
  {
    target: "nav-mensajes",
    view: "mensajes",
    title: "Mensajería interna",
    content:
      "Sistema de comunicación directa entre el administrador y los docentes/tutores del sistema.",
    placement: "right",
  },
  {
    target: "admin-messages-new-conv-btn",
    view: "mensajes",
    title: "Iniciar una conversación",
    content:
      "Como administrador puedes iniciar nuevos chats con cualquier docente o tutor del sistema. Los docentes solo pueden responderte, no iniciar chats nuevos.",
    placement: "bottom",
  },
  {
    target: "admin-messages-search",
    view: "mensajes",
    title: "Buscar conversaciones",
    content:
      "Filtra la lista de chats por nombre del contacto o por el contenido del último mensaje para encontrar rápidamente una conversación.",
    placement: "right",
  },
  {
    target: "admin-messages-composer",
    view: "mensajes",
    title: "Redactar un mensaje",
    content:
      "Escribe tu mensaje aquí. Puedes adjuntar archivos con el botón 'Adjuntar archivo', responder a un mensaje específico, y enviar con Enter o con el botón verde.",
    placement: "top",
  },

  // ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
  {
    target: "nav-configuracion",
    view: "configuracion",
    title: "Configuración del sistema",
    content:
      "Aquí controlas el comportamiento global del sistema: qué formularios están activos, cuándo vencen, los grupos disponibles, los permisos de supervisores y tu cuenta personal.",
    placement: "right",
  },
  {
    target: "admin-config-nav",
    view: "configuracion",
    title: "Secciones de configuración",
    content:
      "Cuatro secciones: Formularios, Grupos, Supervisores y Cuenta. Haz clic en cualquiera para acceder a ella.",
    placement: "right",
  },
  {
    target: "admin-config-formularios",
    view: "configuracion:formularios",
    title: "Control de formularios",
    content:
      "Para cada formulario defines su modo de acceso: abierto sin límite, con fecha de vencimiento (día y hora exactos), o cerrado. También configuras qué roles pueden verlo: Docente, Tutor, o ambos.",
    placement: "right",
  },
  {
    target: "admin-config-grupos-btns",
    view: "configuracion:grupos",
    title: "Gestión de grupos",
    content:
      "'Crear grupo' agrega un grupo individual. 'Creación rápida' te permite crear varios grupos en lote para toda una carrera, indicando cuántos grupos hay por cuatrimestre.",
    placement: "bottom",
  },
  {
    target: "admin-config-supervisores",
    view: "configuracion:supervisores",
    title: "Permisos de supervisores",
    content:
      "Asigna a cada supervisor las secciones del sistema a las que puede acceder. Usa 'Dar todo' o 'Quitar todo' para gestionar el acceso completo. Los cambios se guardan de forma individual por supervisor.",
    placement: "right",
  },
  {
    target: "admin-config-cuenta",
    view: "configuracion:cuenta",
    title: "Tu cuenta — ¡listo!",
    content:
      "Aquí actualizas tu foto de perfil, nombre, apellidos, teléfono y contraseña. Ya conoces todas las secciones del sistema. Puedes repetir este tutorial usando el botón ❓ en la esquina inferior derecha.",
    placement: "right",
  },
];
