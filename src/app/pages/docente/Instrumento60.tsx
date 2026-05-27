import { InstrumentoFormPage } from "./InstrumentoFormPage";

export default function Instrumento60Page() {
  return (
    <InstrumentoFormPage
      title="Instrumento 60%"
      subtitle="Captura y envía el instrumento de evaluación 60% del Plan Nuevo Modelo."
      formTitle="Formulario Instrumento 60%"
      percentageLabel="60%"
      planLabel="Plan Nuevo Modelo"
      plan="nuevo-modelo"
      fileInputId="instrumento-60-upload"
      successMessage="Instrumento 60% enviado correctamente"
    />
  );
}
