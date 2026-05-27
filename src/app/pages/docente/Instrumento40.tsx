import { InstrumentoFormPage } from "./InstrumentoFormPage";

export default function Instrumento40Page() {
  return (
    <InstrumentoFormPage
      title="Instrumento 40%"
      subtitle="Captura y envía el instrumento de evaluación 40% del Plan Nuevo Modelo."
      formTitle="Formulario Instrumento 40%"
      percentageLabel="40%"
      planLabel="Plan Nuevo Modelo"
      plan="nuevo-modelo"
      fileInputId="instrumento-40-upload"
      successMessage="Instrumento 40% enviado correctamente"
    />
  );
}
