export type LayoutStyleId = "default" | "formal";

export interface LayoutStyleDef {
  id: LayoutStyleId;
  label: string;
  description: string;
}

export const LAYOUT_STYLES: LayoutStyleDef[] = [
  { id: "default", label: "Clásico",      description: "Predeterminado" },
  { id: "formal",  label: "Empresarial",  description: "Formal y ordenado" },
];

const FORMAL_CSS = `
/* ══ DISEÑO EMPRESARIAL ══ */

/* -- Cards: rectangulares, sin sombra -- */
[data-layout-style="formal"] [data-slot="card"] {
  border-radius: 0.25rem !important;
  box-shadow: none !important;
  border: 1px solid var(--border) !important;
  background: var(--card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-layout-style="formal"] [data-slot="card"]:hover {
  box-shadow: none !important;
  transform: none !important;
}

/* -- Barra de acento del dashboard -- */
[data-layout-style="formal"] [data-component="stats-accent-bar"] {
  display: none !important;
}

/* -- Banners de páginas: encabezado plano con línea inferior --
   Se conserva el padding original (p-5) para que el título y botones
   no queden pegados a los bordes.
   Se usa var(--card) para que en modo claro sea blanco y en modo oscuro
   sea el color de card, evitando que se vea la imagen de fondo a través. */
[data-layout-style="formal"] [data-component="page-banner"] {
  background: var(--card) !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  box-shadow: none !important;
}
[data-layout-style="formal"] [data-component="page-banner"] > .absolute {
  display: none !important;
}
[data-layout-style="formal"] [data-component="page-banner"] h1 {
  font-size: 1.125rem !important;
  line-height: 1.75rem !important;
}

/* -- Tab bars: estilo subrayado en lugar de píldoras -- */
[data-layout-style="formal"] [data-component="page-tabs"] {
  background: var(--card) !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  box-shadow: none !important;
  padding: 0 !important;
  gap: 0 !important;
  overflow: visible !important;
}
[data-layout-style="formal"] [data-component="page-tabs"] [role="tab"] {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0.625rem 1rem !important;
  margin: 0 !important;
  border: none !important;
}
[data-layout-style="formal"] [data-component="page-tabs"] [role="tab"][data-state="active"] {
  background: transparent !important;
  box-shadow: none !important;
  border-bottom: 2px solid currentColor !important;
  margin-bottom: -1px !important;
}

/* -- Aplana TODOS los contenedores y elementos redondeados --
   Excluye rounded-full (avatares, badges de conteo) */
[data-layout-style="formal"] .rounded-lg,
[data-layout-style="formal"] .rounded-xl,
[data-layout-style="formal"] .rounded-2xl,
[data-layout-style="formal"] .rounded-3xl {
  border-radius: 0.25rem !important;
}
/* Valores arbitrarios como rounded-[28px], rounded-[22px], rounded-[1.35rem] */
[data-layout-style="formal"] [class*="rounded-["] {
  border-radius: 0.25rem !important;
}

/* -- Botones rectangulares -- */
[data-layout-style="formal"] button {
  border-radius: 0.25rem !important;
}

/* -- Inputs y Textareas cuadrados -- */
[data-layout-style="formal"] input,
[data-layout-style="formal"] textarea {
  border-radius: 0.25rem !important;
}

/* -- Selects, Comboboxes y Popovers rectangulares -- */
[data-layout-style="formal"] [role="combobox"],
[data-layout-style="formal"] [data-slot="select-trigger"],
[data-layout-style="formal"] [data-slot="select-content"],
[data-layout-style="formal"] [data-slot="popover-content"],
[data-layout-style="formal"] [data-slot="command"],
[data-layout-style="formal"] [data-slot="dialog-content"] {
  border-radius: 0.25rem !important;
}

/* -- Lista de usuarios (Gestión Usuarios) -- */
[data-layout-style="formal"] [data-component="user-list"] {
  border: 1px solid var(--border) !important;
  border-radius: 0.25rem !important;
  overflow: hidden !important;
}
[data-layout-style="formal"] [data-component="user-list"] [data-component="user-row"] {
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  background: var(--card) !important;
  padding: 0.625rem 1rem !important;
}
[data-layout-style="formal"] [data-component="user-list"] [data-component="user-row"]:last-child {
  border-bottom: none !important;
}

/* -- Lista de ciclos escolares -- */
[data-layout-style="formal"] [data-component="cycle-list"] {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  border: 1px solid var(--border) !important;
  border-radius: 0.25rem !important;
  overflow: hidden !important;
}
[data-layout-style="formal"] [data-component="cycle-list"] [data-slot="card"] {
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  border-radius: 0 !important;
}
[data-layout-style="formal"] [data-component="cycle-list"] [data-slot="card"]:last-child {
  border-bottom: none !important;
}
[data-layout-style="formal"] [data-component="cycle-list"] .bg-gradient-to-r {
  display: none !important;
}
`;

export function applyLayoutStyle(styleId: LayoutStyleId): void {
  document.documentElement.dataset.layoutStyle = styleId;

  const elemId = "utslrc-layout-style";
  let el = document.getElementById(elemId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = elemId;
    document.head.appendChild(el);
  }

  el.textContent = styleId === "formal" ? FORMAL_CSS : "";
}
