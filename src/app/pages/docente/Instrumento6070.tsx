import { InstrumentoFormPage } from "./InstrumentoFormPage";

export default function Instrumento6070Page() {
  return (
    <InstrumentoFormPage
      title="Instrumento 70%"
      subtitle="Captura y envía el instrumento de evaluación 70% del Plan Normal."
      formTitle="Formulario Instrumento 70%"
      percentageLabel="70%"
      planLabel="Plan Normal"
      plan="plan-normal"
      fileInputId="instrumento-70-upload"
      successMessage="Instrumento 70% enviado correctamente"
    />
  );
}
