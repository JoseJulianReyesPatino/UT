export type Group = {
  id: number;
  careerCode: string; // e.g., IDGS
  plan: string; // 'nuevo-modelo' | 'plan-normal'
  cuatrimestre: number; // e.g., 10
  groupNumber: number; // e.g., 1
  name: string; // computed, e.g., IDGS10-1
};

export type FormConfig = {
  docenteFields: string[];
  tutorFields: string[];
};

const GROUPS_KEY = "app:groups:v1";
const FORM_CONFIG_KEY = "app:formConfig:v1";

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
  if (!raw) return { docenteFields: ["Materia", "Parcial", "Grupo"], tutorFields: ["Materia", "Tema", "Grupo"] };
  return JSON.parse(raw) as FormConfig;
}

export function saveFormConfig(cfg: FormConfig) {
  localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(cfg));
}

export function addFieldFor(role: "docente" | "tutor", field: string) {
  const cfg = getFormConfig();
  if (role === "docente") cfg.docenteFields = [field, ...cfg.docenteFields];
  else cfg.tutorFields = [field, ...cfg.tutorFields];
  saveFormConfig(cfg);
}

export function removeFieldFor(role: "docente" | "tutor", field: string) {
  const cfg = getFormConfig();
  if (role === "docente") cfg.docenteFields = cfg.docenteFields.filter((f) => f !== field);
  else cfg.tutorFields = cfg.tutorFields.filter((f) => f !== field);
  saveFormConfig(cfg);
}
