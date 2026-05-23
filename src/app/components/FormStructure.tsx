import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { planNuevoModelo, planNormal, carrieras, cuatrimestresLabels, Plan, Cuatrimestre } from "../data/curricula";

export interface PlanSelectProps {
  plan: Plan | "";
  onPlanChange: (plan: Plan) => void;
  onCarreraReset?: () => void;
}

export interface CarreraSelectProps {
  plan: Plan | "";
  carrera: string;
  onCarreraChange: (carrera: string) => void;
}

export interface CuatrimestreSelectProps {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  onCuatrimestreChange: (cuatrimestre: Cuatrimestre) => void;
}

export interface MateriaSelectProps {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  materia: string;
  onMateriaChange: (materia: string) => void;
}

/**
 * Plan selector with hamburger menu
 */
export const PlanMenuSelector: React.FC<PlanSelectProps & { sheetOpen: boolean; onSheetOpenChange: (open: boolean) => void }> = ({
  plan,
  onPlanChange,
  onCarreraReset,
  sheetOpen,
  onSheetOpenChange,
}) => {
  return (
    <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Seleccionar Plan</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-6">
          <Button
            variant={plan === "nuevo-modelo" ? "success" : "outline"}
            className="w-full justify-start"
            onClick={() => {
              onPlanChange("nuevo-modelo");
              onCarreraReset?.();
              onSheetOpenChange(false);
            }}
          >
            Plan Nuevo Modelo
          </Button>
          <Button
            variant={plan === "plan-normal" ? "success" : "outline"}
            className="w-full justify-start"
            onClick={() => {
              onPlanChange("plan-normal");
              onCarreraReset?.();
              onSheetOpenChange(false);
            }}
          >
            Plan Normal
          </Button>
        </div>
        {plan && (
          <div className="mt-6 p-3 bg-emerald-50 rounded-lg text-sm">
            <p className="font-medium">Plan seleccionado:</p>
            <p>{plan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * Carrera selector that updates based on plan
 */
export const CarreraSelector: React.FC<CarreraSelectProps> = ({ plan, carrera, onCarreraChange }) => {
  const carrerasDisponibles = useMemo(() => {
    if (!plan) return [];

    if (plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: "TSU",
      }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: "Ingeniería",
      }));
      return [...tsu, ...ing];
    } else {
      return carrieras["plan-normal"].ingenieria.map((c) => ({
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: "Plan Normal",
      }));
    }
  }, [plan]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Carrera *</label>
      <Select value={carrera} onValueChange={onCarreraChange} disabled={!plan}>
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
  );
};

/**
 * Cuatrimestre selector that updates based on carrera
 */
export const CuatrimestreSelector: React.FC<CuatrimestreSelectProps> = ({
  plan,
  carrera,
  cuatrimestre,
  onCuatrimestreChange,
}) => {
  const cuatrimestresDisponibles = useMemo(() => {
    if (!carrera || !plan) return [];

    const planData = plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carreraData = planData[carrera];

    if (!carreraData) return [];
    return Object.keys(carreraData.cuatrimestres);
  }, [carrera, plan]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cuatrimestre *</label>
      <Select value={cuatrimestre} onValueChange={(value) => onCuatrimestreChange(value as Cuatrimestre)} disabled={!carrera}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona el cuatrimestre" />
        </SelectTrigger>
        <SelectContent>
          {cuatrimestresDisponibles.map((cuatri) => (
            <SelectItem key={cuatri} value={cuatri}>
              {cuatrimestresLabels[cuatri]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

/**
 * Materia selector that updates based on carrera and cuatrimestre
 */
export const MateriaSelector: React.FC<MateriaSelectProps> = ({
  plan,
  carrera,
  cuatrimestre,
  materia,
  onMateriaChange,
}) => {
  const materiasDisponibles = useMemo(() => {
    if (!carrera || !cuatrimestre || !plan) return [];

    const planData = plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carreraData = planData[carrera];

    if (!carreraData) return [];
    return carreraData.cuatrimestres[cuatrimestre as Cuatrimestre] || [];
  }, [carrera, cuatrimestre, plan]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Materia *</label>
      <Select value={materia} onValueChange={onMateriaChange} disabled={!cuatrimestre}>
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
  );
};
