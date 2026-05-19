import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { getFormConfig, getGroups, addFieldFor, removeFieldFor, addGroup, removeGroup, Group } from "../../../lib/formConfig";

export function Configuration() {
  const [formConfig, setFormConfig] = useState(getFormConfig());
  const [groups, setGroups] = useState<Group[]>(getGroups());

  const [newField, setNewField] = useState("");
  const [newRole, setNewRole] = useState<"docente" | "tutor">("docente");

  const [careerCode, setCareerCode] = useState("");
  const [plan, setPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [cuatrimestre, setCuatrimestre] = useState(1);
  const [groupNumber, setGroupNumber] = useState(1);

  useEffect(() => {
    setFormConfig(getFormConfig());
    setGroups(getGroups());
  }, []);

  const handleAddField = () => {
    if (!newField.trim()) return;
    addFieldFor(newRole, newField.trim());
    setFormConfig(getFormConfig());
    setNewField("");
  };

  const handleRemoveField = (role: "docente" | "tutor", field: string) => {
    removeFieldFor(role, field);
    setFormConfig(getFormConfig());
  };

  const handleAddGroup = () => {
    if (!careerCode.trim()) return;
    addGroup({ careerCode: careerCode.toUpperCase(), plan, cuatrimestre: Number(cuatrimestre), groupNumber: Number(groupNumber) });
    setGroups(getGroups());
    // clear inputs
    setCareerCode("");
    setCuatrimestre(1);
    setGroupNumber(1);
  };

  const handleRemoveGroup = (id: number) => {
    removeGroup(id);
    setGroups(getGroups());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Configuración del Sistema</h1>
        <p className="text-muted-foreground">Ajustes globales y parámetros del sistema</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Generales</TabsTrigger>
          <TabsTrigger value="formularios">Formularios</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros Generales</CardTitle>
              <CardDescription>Configuración visible para administradores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Institución</Label>
                  <Input defaultValue="Instituto Tecnológico Ejemplo" />
                </div>
                <div className="space-y-2">
                  <Label>Correo de Soporte</Label>
                  <Input defaultValue="soporte@instituto.edu" />
                </div>
                <div className="space-y-2">
                  <Label>Modo de Operación</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Producción</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Desarrollo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Puerto del Servidor de Desarrollo</Label>
                  <Input defaultValue="5173" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" className="mr-2">Restablecer</Button>
                <Button variant="success">Guardar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formularios">
          <Card>
            <CardHeader>
              <CardTitle>Formularios</CardTitle>
              <CardDescription>Administra los campos que ven docentes y tutores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium">Campos para Docentes</h3>
                  <div className="mt-3 space-y-2">
                    {formConfig.docenteFields.map((f) => (
                      <div key={f} className="flex items-center justify-between gap-2">
                        <div className="text-sm">{f}</div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveField("docente", f)}>Eliminar</Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Campos para Tutores</h3>
                  <div className="mt-3 space-y-2">
                    {formConfig.tutorFields.map((f) => (
                      <div key={f} className="flex items-center justify-between gap-2">
                        <div className="text-sm">{f}</div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveField("tutor", f)}>Eliminar</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docente">Docente</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Nombre del campo" value={newField} onChange={(e) => setNewField(e.target.value)} />
                <Button onClick={handleAddField} variant="success">Agregar campo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos">
          <Card>
            <CardHeader>
              <CardTitle>Grupos</CardTitle>
              <CardDescription>Crear y administrar grupos que aparecerán en los formularios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Nomenclatura carrera (ej. IDGS)" value={careerCode} onChange={(e) => setCareerCode(e.target.value.toUpperCase())} />
                <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                    <SelectItem value="plan-normal">Plan Normal</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={1} placeholder="Cuatrimestre (ej. 10)" value={String(cuatrimestre)} onChange={(e) => setCuatrimestre(Number(e.target.value))} />
                <Input type="number" min={1} placeholder="Número de grupo (ej. 1)" value={String(groupNumber)} onChange={(e) => setGroupNumber(Number(e.target.value))} />
                <div className="flex items-center gap-2 md:col-span-2">
                  <div className="text-sm">Nombre generado: <strong className="ml-2">{careerCode ? `${careerCode}${cuatrimestre}-${groupNumber}` : "N/D"}</strong></div>
                </div>
                <Button onClick={handleAddGroup} variant="success">Crear grupo</Button>
              </div>

              <div className="mt-6 space-y-2">
                {groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay grupos creados.</div>
                ) : (
                  groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <div className="text-sm">{g.name} — {g.plan}</div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(g.id)}>Eliminar</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Configuration;
