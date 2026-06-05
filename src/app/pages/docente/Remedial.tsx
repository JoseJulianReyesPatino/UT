import { InstrumentoFormPage } from "./InstrumentoFormPage";

export default function RemedialPage() {
  return (
    <InstrumentoFormPage
      title="Remedial"
      subtitle="Captura y envía el instrumento de evaluación para Remedial."
      formTitle="Formulario Remedial"
      percentageLabel=""
      planLabel=""
      plan=""
      allowPlanSelection
      fileInputId="remedial-upload"
      successMessage="Remedial enviado correctamente"
    />
  );
}
