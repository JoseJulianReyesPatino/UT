export type DocRecord = {
  id: number;
  title: string;
  submitted_at?: string | null;
  created_at?: string | null;
  materia?: string | null;
  grupo?: string | null;
  group_code?: string | null;
  parcial?: string | null;
  uploaded_by_name?: string | null;
  form_title?: string | null;
  carrera_label?: string | null;
  cuatrimestre?: string | number | null;
};

export const getParcialNum = (parcial?: string | null): string => {
  if (!parcial) return "";
  const m = parcial.match(/\b([123])\b/);
  return m ? m[1] : "";
};

export const formatSentFecha = (fecha?: string | null): string => {
  if (!fecha) return "";
  try {
    const normalized = fecha.includes(" ") && !fecha.includes("T") ? fecha.replace(" ", "T") : fecha;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return fecha;
    const datePart = date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    return `${datePart} ${timePart}`;
  } catch { return fecha; }
};
