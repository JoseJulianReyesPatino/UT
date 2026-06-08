import React from "react";
import { AlertCircle, Clock3, ShieldAlert } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { FormClosedState } from "./FormClosedState";
import { isFormExpired, isFormRoleAllowed, type FormId } from "../../lib/formConfig";

interface FormAccessGuardProps {
  formId: FormId;
  title: string;
  children: React.ReactNode;
}

const roleLabels = {
  docente: "Docente",
  tutor: "Tutor",
  administrador: "Administrador",
} as const;

export function FormAccessGuard(props: Readonly<FormAccessGuardProps>) {
  const { formId, title, children } = props;
  const { user } = useAuth();

  const hasRole = (role: "docente" | "tutor" | "administrador") => user?.role === role || user?.roles?.includes(role);

  if (!user || hasRole("administrador")) {
    return <>{children}</>;
  }

  const roleAllowed = (isFormRoleAllowed(formId, "docente") && hasRole("docente")) || (isFormRoleAllowed(formId, "tutor") && hasRole("tutor"));
  const expired = isFormExpired(formId);
  const configuredRoleLabels = ["docente", "tutor"]
    .filter((role) => isFormRoleAllowed(formId, role as "docente" | "tutor"))
    .map((role) => roleLabels[role as "docente" | "tutor"]);

  if (roleAllowed && !expired) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{title} no disponible</AlertTitle>
        <AlertDescription>
          {expired
            ? "El plazo asignado por el administrador ya venció."
            : "Tu rol no está autorizado para este formulario."}
        </AlertDescription>
      </Alert>

      <FormClosedState
        title={title}
        message={`Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos para ${title.toLowerCase()}.`}
      />

      <Card className="border-dashed border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
              Rol actual: {(user.roles?.length ?? 0) > 1 ? user.roles!.map((role) => roleLabels[role]).join(" y ") : roleLabels[user.role]}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
              Roles permitidos: {configuredRoleLabels.length > 0 ? configuredRoleLabels.join(" y ") : "Sin asignar"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos para este apartado.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
