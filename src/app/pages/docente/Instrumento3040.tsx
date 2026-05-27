import { InstrumentoFormPage } from "./InstrumentoFormPage";

export default function Instrumento3040Page() {
  return (
    <InstrumentoFormPage
      title="Instrumento 30%"
      subtitle="Captura y envía el instrumento de evaluación 30% del Plan Normal."
      formTitle="Formulario Instrumento 30%"
      percentageLabel="30%"
      planLabel="Plan Normal"
      plan="plan-normal"
      fileInputId="instrumento-30-upload"
      successMessage="Instrumento 30% enviado correctamente"
    />
  );
}