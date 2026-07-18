export type Group = {
  id: number;
  careerCode: string; // e.g., IDGS
  plan: string; // 'nuevo-modelo' | 'plan-normal'
  cuatrimestre: number; // e.g., 10
  groupNumber: number; // e.g., 1
  name: string; // computed, e.g., IDGS10-1
  is_active?: boolean;
};

export type FormRole = "docente" | "tutor";

export type FormId =
  | "planeacion"
  | "instrumento-30-normal"
  | "instrumento-40-nuevo"
  | "instrumento-60-nuevo"
  | "instrumento-70-normal"
  | "lista-concentrada"
  | "asesoria"
  | "portafolio-digital"
  | "acta-final"
  | "carga-academica"
  | "reporte-bajas"
  | "concentrado-asesorias"
  | "acta-asistencia-grupal"
  | "ficha-tecnica"
  | "remedial"
  | "carta-presentacion"
  | "carta-aceptacion"
  | "carta-terminacion"
  | "estadias"
  | "tutorias";

export function getBackendFormCode(formId: FormId): string {
  return formId;
}

export function getFormIdsForBackendCode(formCode: string): FormId[] {
  return [formCode.replace(/_/g, "-") as FormId];
}

export type FormAccessRule = {
  roles: FormRole[];
  dueAt: string | null;
};

export type FormAccessConfig = Record<FormId, FormAccessRule>;

export type FormConfig = {
  docenteFields: string[];
  tutorFields: string[];
  formAccess: FormAccessConfig;
};

const GROUPS_KEY = "app:groups:v1";
const FORM_CONFIG_KEY = "app:formConfig:v1";

const DEFAULT_FORM_ACCESS: FormAccessConfig = {
  planeacion: { roles: ["docente"], dueAt: null },
  "instrumento-30-normal": { roles: ["docente"], dueAt: null },
  "instrumento-40-nuevo": { roles: ["docente"], dueAt: null },
  "instrumento-60-nuevo": { roles: ["docente"], dueAt: null },
  "instrumento-70-normal": { roles: ["docente"], dueAt: null },
  "lista-concentrada": { roles: ["docente"], dueAt: null },
  remedial: { roles: ["docente"], dueAt: null },
  asesoria: { roles: ["docente"], dueAt: null },
  "portafolio-digital": { roles: ["docente"], dueAt: null },
  "acta-final": { roles: ["docente"], dueAt: null },
  "carga-academica": { roles: ["docente", "tutor"], dueAt: null },
  "reporte-bajas": { roles: ["docente", "tutor"], dueAt: null },
  "concentrado-asesorias": { roles: ["docente", "tutor"], dueAt: null },
  "acta-asistencia-grupal": { roles: ["docente", "tutor"], dueAt: null },
  "ficha-tecnica": { roles: ["docente", "tutor"], dueAt: null },
  "carta-presentacion": { roles: ["docente", "tutor"], dueAt: null },
  "carta-aceptacion": { roles: ["docente", "tutor"], dueAt: null },
  "carta-terminacion": { roles: ["docente", "tutor"], dueAt: null },
  estadias: { roles: ["docente"], dueAt: null },
  tutorias: { roles: ["tutor"], dueAt: null },
};

const DEFAULT_FORM_CONFIG: FormConfig = {
  docenteFields: ["Materia", "Parcial", "Grupo"],
  tutorFields: ["Materia", "Tema", "Grupo"],
  formAccess: DEFAULT_FORM_ACCESS,
};

const cloneDefaultFormAccess = (): FormAccessConfig => ({
  planeacion: { ...DEFAULT_FORM_ACCESS["planeacion"] },
  "instrumento-30-normal": { ...DEFAULT_FORM_ACCESS["instrumento-30-normal"] },
  "instrumento-40-nuevo": { ...DEFAULT_FORM_ACCESS["instrumento-40-nuevo"] },
  "instrumento-60-nuevo": { ...DEFAULT_FORM_ACCESS["instrumento-60-nuevo"] },
  "instrumento-70-normal": { ...DEFAULT_FORM_ACCESS["instrumento-70-normal"] },
  "lista-concentrada": { ...DEFAULT_FORM_ACCESS["lista-concentrada"] },
  remedial: { ...DEFAULT_FORM_ACCESS["remedial"] },
  asesoria: { ...DEFAULT_FORM_ACCESS.asesoria },
  "portafolio-digital": { ...DEFAULT_FORM_ACCESS["portafolio-digital"] },
  "acta-final": { ...DEFAULT_FORM_ACCESS["acta-final"] },
  "carga-academica": { ...DEFAULT_FORM_ACCESS["carga-academica"] },
  "reporte-bajas": { ...DEFAULT_FORM_ACCESS["reporte-bajas"] },
  "concentrado-asesorias": { ...DEFAULT_FORM_ACCESS["concentrado-asesorias"] },
  "acta-asistencia-grupal": {
    ...DEFAULT_FORM_ACCESS["acta-asistencia-grupal"],
  },
  "ficha-tecnica": { ...DEFAULT_FORM_ACCESS["ficha-tecnica"] },
  "carta-presentacion": { ...DEFAULT_FORM_ACCESS["carta-presentacion"] },
  "carta-aceptacion": { ...DEFAULT_FORM_ACCESS["carta-aceptacion"] },
  "carta-terminacion": { ...DEFAULT_FORM_ACCESS["carta-terminacion"] },
  estadias: { ...DEFAULT_FORM_ACCESS.estadias },
  tutorias: { ...DEFAULT_FORM_ACCESS.tutorias },
});

// NUEVA FUNCIÓN: Obtener configuración por defecto sin localStorage
export function getDefaultFormConfig(): FormConfig {
  return {
    docenteFields: [...DEFAULT_FORM_CONFIG.docenteFields],
    tutorFields: [...DEFAULT_FORM_CONFIG.tutorFields],
    formAccess: cloneDefaultFormAccess(),
  };
}

const normalizeFormConfig = (
  partial?: Partial<FormConfig> | null,
): FormConfig => ({
  docenteFields: partial?.docenteFields?.length
    ? partial.docenteFields
    : DEFAULT_FORM_CONFIG.docenteFields,
  tutorFields: partial?.tutorFields?.length
    ? partial.tutorFields
    : DEFAULT_FORM_CONFIG.tutorFields,
  formAccess: {
    ...cloneDefaultFormAccess(),
    ...(partial?.formAccess ?? {}),
  },
});

const enforceTutoriasRoles = (cfg: FormConfig): FormConfig => ({
  ...cfg,
  formAccess: {
    ...cfg.formAccess,
    tutorias: { ...cfg.formAccess.tutorias, roles: ["tutor"] },
    "carga-academica": {
      ...cfg.formAccess["carga-academica"],
      roles: ["tutor"],
    },
    "reporte-bajas": { ...cfg.formAccess["reporte-bajas"], roles: ["tutor"] },
    "concentrado-asesorias": {
      ...cfg.formAccess["concentrado-asesorias"],
      roles: ["tutor"],
    },
    "acta-asistencia-grupal": {
      ...cfg.formAccess["acta-asistencia-grupal"],
      roles: ["tutor"],
    },
    "ficha-tecnica": { ...cfg.formAccess["ficha-tecnica"], roles: ["tutor"] },
  },
});

export function getGroups(): Group[] {
  const raw = localStorage.getItem(GROUPS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Group[];
}

export function saveGroups(groups: Group[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function addGroup(partial: Omit<Group, "id" | "name">) {
  const groups = getGroups();
  const id = Date.now();
  const name = `${partial.careerCode}${partial.cuatrimestre}-${partial.groupNumber}`;
  const g: Group = { id, name, ...partial };
  const next = [g, ...groups];
  saveGroups(next);
  return g;
}

export function removeGroup(id: number) {
  const groups = getGroups().filter((g) => g.id !== id);
  saveGroups(groups);
}

export function getFormConfig(): FormConfig {
  const raw = localStorage.getItem(FORM_CONFIG_KEY);
  if (!raw) return enforceTutoriasRoles(normalizeFormConfig(null));

  try {
    return enforceTutoriasRoles(
      normalizeFormConfig(JSON.parse(raw) as Partial<FormConfig>),
    );
  } catch {
    return enforceTutoriasRoles(normalizeFormConfig(null));
  }
}

export function saveFormConfig(cfg: FormConfig) {
  localStorage.setItem(
    FORM_CONFIG_KEY,
    JSON.stringify(enforceTutoriasRoles(cfg)),
  );
}

export function getFormAccessRule(formId: FormId): FormAccessRule {
  return getFormConfig().formAccess[formId] ?? cloneDefaultFormAccess()[formId];
}

export function setFormAccessRule(formId: FormId, rule: FormAccessRule) {
  const cfg = getFormConfig();
  cfg.formAccess[formId] = rule;
  saveFormConfig(cfg);
}

export function isFormRoleAllowed(formId: FormId, role: FormRole) {
  return getFormAccessRule(formId).roles.includes(role);
}

export function isFormExpired(formId: FormId) {
  const dueAt = getFormAccessRule(formId).dueAt;
  if (!dueAt) return false;
  const deadline = new Date(dueAt);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}

export function addFieldFor(role: "docente" | "tutor", field: string) {
  const cfg = getFormConfig();
  if (role === "docente") cfg.docenteFields = [field, ...cfg.docenteFields];
  else cfg.tutorFields = [field, ...cfg.tutorFields];
  saveFormConfig(cfg);
}

export function removeFieldFor(role: "docente" | "tutor", field: string) {
  const cfg = getFormConfig();
  if (role === "docente")
    cfg.docenteFields = cfg.docenteFields.filter((f) => f !== field);
  else cfg.tutorFields = cfg.tutorFields.filter((f) => f !== field);
  saveFormConfig(cfg);
}