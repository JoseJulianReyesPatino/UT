import React from "react";
import SupervisorDocPage from "./SupervisorDocPage";

interface SupervisorPlaneacionProps {
  layoutStyle?: string;
}

export default function SupervisorPlaneacion({ layoutStyle }: Readonly<SupervisorPlaneacionProps>) {
  return (
    <SupervisorDocPage
      title="Planeación"
      description="Documentos de planeación enviados por todos los docentes"
      formCode="planeacion"
      layoutStyle={layoutStyle}
    />
  );
}
