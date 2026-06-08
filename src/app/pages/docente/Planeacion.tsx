import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Upload, Menu } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { planNuevoModelo, planNormal, carrieras, cuatrimestresLabels, Plan, Cuatrimestre } from "../../data/curricula";
import { getCalendarFileUrl } from "../../lib/calendar";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { formatGroupCode } from "../../../lib/utils";

interface PlaneacionFormData {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  materia: string;
  grupo: string;
  archivos: File[];
  docente: string;
  autorizacion: boolean;
  nota: string;
}

const initialFormData: PlaneacionFormData = {
  plan: "",
  carrera: "",
  cuatrimestre: "",
  materia: "",
  grupo: "",
  archivos: [],
  docente: "",
  autorizacion: false,
  nota: "",
};

export default function PlaneacionPage() {
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PlaneacionFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number}>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const calendarioUrl = getCalendarFileUrl();

  // Obtener carreras disponibles según el plan
  const carrerasDisponibles = useMemo(() => {
    if (!formData.plan) return [];
    
    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "TSU" }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "Ingeniería" }));
      return [...tsu, ...ing];
    } else {
      return carrieras["plan-normal"].ingenieria.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "Plan Normal" }));
    }
  }, [formData.plan]);

  useEffect(() => {
    // load groups when carrera and cuatrimestre are selected
    const career = formData.carrera;
    const cuatri = formData.cuatrimestre;
    if (!career || !cuatri) {
      setGroupsOptions([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch('/groups', { query: { career_code: career, cuatrimestre: cuatri } });
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setGroupsOptions(data.map((g: any) => ({ id: Number(g.id), group_code: g.group_code, group_number: Number(g.group_number) })));
      } catch (err) {
        console.error('Could not load groups', err);
      }
    })();

    return () => { cancelled = true; };
  }, [formData.carrera, formData.cuatrimestre]);

  // reset grupo when carrera or cuatrimestre changes
  useEffect(() => {
    setFormData((c) => ({ ...c, grupo: '' }));
  }, [formData.carrera, formData.cuatrimestre]);

  useEffect(() => {
    // load historical documents for this user and this form (planeacion -> form_id = 1)
    let cancelled = false;
    void (async () => {
      try {
        if (!user) return;
        const res = await apiFetch('/documents', { query: { uploaded_by: user.id, form_id: 1, per_page: 50 } });
        if (cancelled) return;
        setHistory(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error('Could not load history', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Obtener cuatrimestres disponibles según carrera
  const cuatrimestresDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.plan) return [];
    
    const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = plan[formData.carrera];
    
    if (!carrera) return [];
    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera, formData.plan]);

  // Obtener materias disponibles según carrera y cuatrimestre
  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre || !formData.plan) return [];
    
    const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = plan[formData.carrera];
    
    if (!carrera) return [];
    return carrera.cuatrimestres[formData.cuatrimestre] || [];
  }, [formData.carrera, formData.cuatrimestre, formData.plan]);

  const isValid = useMemo(() => {
    const validarGrupoPattern = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    // if groupsOptions loaded, allow numeric id selection as valid
    const validarGrupo = groupsOptions.length > 0 ? formData.grupo !== '' : validarGrupoPattern;
    return (
      formData.plan &&
      formData.carrera &&
      formData.cuatrimestre &&
      formData.materia &&
      validarGrupo &&
      formData.archivos.length > 0 &&
      !!user &&
      formData.autorizacion
    );
  }, [formData, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = formData.archivos.length + newFiles.length;

    if (totalFiles > 3) {
      toast.error("Máximo 3 archivos permitidos");
      return;
    }

    for (let file of newFiles) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 2 MB`);
        return;
      }
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} debe ser un archivo PDF`);
        return;
      }
    }

    setFormData((current) => ({ ...current, archivos: [...current.archivos, ...newFiles] }));
  };

  const removeFile = (index: number) => {
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const getArchivosLabel = () => {
    if (formData.archivos.length === 0) return "Selecciona tus archivos PDF";
    const count = formData.archivos.length;
    const plural = count > 1 ? "s" : "";
    return `${count} archivo${plural} cargado${plural}`;
  };

  const getEspaciosLabel = () => {
    const espacios = 3 - formData.archivos.length;
    if (espacios === 0) return "Máximo alcanzado";
    const plural = espacios > 1 ? "s" : "";
    return `${espacios} espacio${plural} disponible${plural}`;
  };

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setIsSubmitting(true);
    try {
      if (formData.archivos.length === 0) {
        throw new Error('No hay archivos para subir');
      }

      // find carrera label
      const carreraEntry = carrerasDisponibles.find((c) => c.codigo === formData.carrera);
      const carreraLabel = carreraEntry ? carreraEntry.nombre : formData.carrera;

      for (const file of formData.archivos) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('form_id', '1');
        fd.append('title', `${formData.materia} - Planeación`);
        fd.append('apartado_label', 'Planeacion');
        if (formData.plan) fd.append('plan', formData.plan);
        fd.append('carrera_label', carreraLabel);
        if (formData.materia) fd.append('materia', formData.materia);
        if (formData.cuatrimestre) fd.append('parcial', String(formData.cuatrimestre));
        if (formData.grupo) {
          // if grupo is selected from groupsOptions, we expect group_code or numeric id; try to resolve id
          const sel = groupsOptions.find((g) => formatGroupCode(g.group_code) === formData.grupo || String(g.id) === formData.grupo);
          if (sel) fd.append('group_id', String(sel.id));
          else fd.append('group_id', formData.grupo);
        }

        await apiFetch('/documents', { method: 'POST', body: fd });
      }

      toast.success('Planeacion enviada correctamente', {
        description: 'Tu documento fue enviado para revision administrativa.',
      });
      resetForm();
      // refresh history
      if (user) {
        const res = await apiFetch('/documents', { query: { uploaded_by: user.id, form_id: 1, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'No fue posible subir la planeación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Planeación</h1>
          <p className="text-muted-foreground">Captura y envía la planeación de tu asignatura.</p>
        </div>

        {/* Menú de hamburguesa para seleccionar Plan */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Historial de archivos</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {history && history.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">Archivos subidos</p>
                  <ul className="space-y-2">
                    {history.map((h) => (
                      <li key={h.id} className="text-sm flex items-center justify-between">
                        <span>{h.title ?? h.file_path}</span>
                        <div className="flex items-center gap-2">
                          <button className="text-sm underline" onClick={async () => {
                            try {
                              const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
                              const url = `${API_BASE_URL.replace(/\/+$/, '')}/documents/${h.id}/file`;
                              const headers: Record<string,string> = {};
                              if (token) headers['Authorization'] = `Bearer ${token}`;
                              const res = await fetch(url, { method: 'GET', headers });
                              if (!res.ok) throw new Error(res.statusText);
                              const blob = await res.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              window.open(blobUrl, '_blank');
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                            } catch (e) {
                              toast.error('No fue posible descargar el archivo');
                            }
                          }}>Descargar</button>
                          <span className="text-xs text-muted-foreground">{new Date(h.submitted_at).toLocaleString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : formData.archivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay archivos cargados en esta sesión ni en el historial.</p>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">Archivos en esta sesión</p>
                  <ul className="space-y-2">
                    {formData.archivos.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="text-sm">{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-300 dark:border-emerald-300 rounded-md">
        <p className="text-sm font-medium text-black dark:text-white">Recordatorio: Se sube dentro de las primeras 2 semanas de iniciado el cuatrimestre.</p>
        <Button variant="outline" size="sm" onClick={() => window.open(calendarioUrl, "_blank")}>Calendario</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario de Planeación</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Plan selection inside form (moved from sheet) */}
          <div className="space-y-2">
            <Label>Plan *</Label>
            <div className="flex gap-2">
              <Button variant={formData.plan === "nuevo-modelo" ? "success" : "outline"} onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "" }))}>Plan Nuevo Modelo</Button>
              <Button variant={formData.plan === "plan-normal" ? "success" : "outline"} onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "" }))}>Plan Normal</Button>
            </div>
          </div>

          {/* Carrera */}
          <div className="space-y-2">
            <Label>Carrera *</Label>
            <Select
              value={formData.carrera}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  carrera: value,
                  cuatrimestre: "",
                  materia: "",
                }))
              }
              disabled={!formData.plan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la carrera" />
              </SelectTrigger>
              <SelectContent>
                {carrerasDisponibles.map((carrera) => (
                  <SelectItem key={carrera.codigo} value={carrera.codigo}>
                    {carrera.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cuatrimestre */}
          <div className="space-y-2">
            <Label>Cuatrimestre *</Label>
            <Select
              value={formData.cuatrimestre}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  cuatrimestre: value as Cuatrimestre,
                  materia: "",
                }))
              }
              disabled={!formData.carrera}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el cuatrimestre" />
              </SelectTrigger>
              <SelectContent>
                {cuatrimestresDisponibles.map((cuatri) => (
                  <SelectItem key={cuatri} value={cuatri}>
                    {cuatrimestresLabels[cuatri as keyof typeof cuatrimestresLabels]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Materia */}
          <div className="space-y-2">
            <Label>Materia *</Label>
            <Select
              value={formData.materia}
              onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))}
              disabled={!formData.cuatrimestre}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la materia" />
              </SelectTrigger>
              <SelectContent>
                {materiasDisponibles.map((materia, index) => (
                  <SelectItem key={`${materia.nombre}-${index}`} value={materia.nombre}>
                    {materia.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Grupo */}
            <div className="space-y-2 sm:col-span-1">
              <Label>Grupo *</Label>
              {groupsOptions.length > 0 ? (
                <Select value={formData.grupo} onValueChange={(v) => setFormData((c) => ({ ...c, grupo: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupsOptions.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{formatGroupCode(g.group_code)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.grupo}
                  onChange={(e) => setFormData((current) => ({ ...current, grupo: e.target.value.toUpperCase() }))}
                  placeholder="Ej. JTH-01"
                  maxLength={7}
                />
              )}
              <p className="text-xs text-muted-foreground">Formato: Ej. JTH-01 o selección automática</p>
            </div>
          </div>

          {/* Archivos */}
          <div className="space-y-2">
            <Label>Documentos (PDF) *</Label>
            <p className="text-sm text-muted-foreground">
              Adjuntar el documento en formato PDF, con un límite de 2 MB por archivo. En caso de ser necesario, se permite la carga simultánea de hasta tres archivos.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-success/50 transition-colors">
              <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                id="planeacion-pdf-upload"
                onChange={handleFileChange}
                disabled={formData.archivos.length >= 3}
              />
              <label htmlFor="planeacion-pdf-upload" className="cursor-pointer block space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">
                  {getArchivosLabel()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getEspaciosLabel()}
                </p>
              </label>
            </div>

            {formData.archivos.length > 0 && (
              <div className="space-y-2 pt-2">
                {formData.archivos.map((archivo, index) => (
                  <PdfPreview
                    key={`${archivo.name}-${archivo.size}-${index}`}
                    file={archivo}
                    title="Documento cargado"
                    onRemove={() => removeFile(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Nombre del docente (desde cuenta autenticada) */}
          <div className="space-y-2">
            <Label>Nombre del docente</Label>
            <div className=" rounded-md border border-border px-3 py-2 bg-background text-sm">
              {user ? `${user.firstNames ?? ''} ${user.lastNames ?? ''}`.trim() || user.name : 'Inicia sesión para continuar'}
            </div>
          </div>

          {/* Autorización */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">Declaración de autorización</p>
            <p>
              Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.
            </p>
          </div>

          {/* Nota (opcional) */}
          <div className="space-y-2">
            <Label>Nota para administración (opcional)</Label>
            <Textarea
              value={formData.nota}
              onChange={(e) => setFormData((current) => ({ ...current, nota: e.target.value }))}
              placeholder="Agrega una nota para revisión"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Limpiar
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar planeación"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}