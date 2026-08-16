import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import App from './App';

// ============================================================
// IMPORTACIONES - VERSIÓN CORREGIDA
// ============================================================

// ✅ Login - con .then() por si no exporta default
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));

// ✅ Dashboard - export default
const DocenteDashboard = React.lazy(() => import('./pages/docente/DocenteDashboard'));

// ✅ AdminDashboard - con .then() para pasar props
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));

// ✅ DocumentHistory - ya tiene .then()
const DocumentHistory = React.lazy(() => import('./pages/docente/DocumentHistory').then(m => ({ default: m.DocumentHistory })));

// ✅ Messages - ya tiene .then()
const Messages = React.lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));

// ✅ Profile - ya tiene .then()
const Profile = React.lazy(() => import('./pages/docente/Profile').then(m => ({ default: m.Profile })));

// ✅ Admin pages
const DocenteManagement = React.lazy(() => import('./pages/admin/DocenteManagement'));
const Tutores = React.lazy(() => import('./pages/admin/Tutores'));
const CiclosEscolares = React.lazy(() => import('./pages/admin/CiclosEscolares'));
const DocumentReview = React.lazy(() => import('./pages/admin/DocumentReview'));
const Configuration = React.lazy(() => import('./pages/admin/Configuration'));
const EstadiasAdmin = React.lazy(() => import('./pages/admin/Estadias'));
const CalendarioAdmin = React.lazy(() => import('./pages/admin/Calendario'));

// ✅ Supervisor pages
const SupervisorPlaneacion = React.lazy(() => import('./pages/supervisor/SupervisorPlaneacion'));
const SupervisorInstrumentos = React.lazy(() => import('./pages/supervisor/SupervisorInstrumentos'));
const SupervisorDocPage = React.lazy(() => import('./pages/supervisor/SupervisorDocPage'));

// ✅ Docente form pages
const PlaneacionPage = React.lazy(() => import('./pages/docente/Planeacion'));
const Instrumento30Page = React.lazy(() => import('./pages/docente/Instrumento30'));
const Instrumento40Page = React.lazy(() => import('./pages/docente/Instrumento40'));
const Instrumento60Page = React.lazy(() => import('./pages/docente/Instrumento60'));
const Instrumento70Page = React.lazy(() => import('./pages/docente/Instrumento70'));
const RemedialPage = React.lazy(() => import('./pages/docente/Remedial'));
const ListaConcentradaPage = React.lazy(() => import('./pages/docente/ListaConcentrada'));
const AsesoriaPage = React.lazy(() => import('./pages/docente/Asesoria'));
const PortafolioDigitalPage = React.lazy(() => import('./pages/docente/PortafolioDigital'));
const ActaFinalPage = React.lazy(() => import('./pages/docente/ActaFinal'));
const EstadiasPage = React.lazy(() => import('./pages/docente/Estadias'));
const TutoriasPage = React.lazy(() => import('./pages/docente/Tutorias'));

// ============================================================
// FIN DE IMPORTACIONES
// ============================================================

const LoadingFallback = () => (
  <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
  </div>
);

// ============================================================
// PageWrapper - MANEJO CORRECTO DE PROPS
// ============================================================

const PageWrapper = ({ 
  children, 
  onNavigate = () => {},  // ← Función por defecto para evitar errores
  layoutStyle = 'default'
}: { 
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
  layoutStyle?: string;
}) => (
  <Suspense fallback={<LoadingFallback />}>
    <ProtectedRoute>
      {React.isValidElement(children) 
        ? React.cloneElement(children, { onNavigate, layoutStyle })
        : children}
    </ProtectedRoute>
  </Suspense>
);

// ============================================================
// NAVEGACIÓN - Función que maneja la navegación
// ============================================================

const handleNavigate = (view: string) => {
  // Esta función se pasa a los componentes que necesitan navegar
  // Como ahora usamos React Router, aquí podemos mapear vistas a rutas
  const routeMap: Record<string, string> = {
    'dashboard': '/',
    'historial': '/docente/historial',
    'mensajes': '/mensajes',
    'perfil': '/docente/perfil',
    'planeacion': '/docente/planeacion',
    'docentes': '/admin/docentes',
    'tutores': '/admin/tutores',
    'ciclos': '/admin/ciclos',
    'documentos': '/admin/documentos',
    'configuracion': '/admin/configuracion',
  };
  
  // Usar window.location para navegar (funciona con React Router)
  const route = routeMap[view] || '/';
  window.location.href = route;
};

// ============================================================
// ROUTER CONFIGURATION
// ============================================================

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: (
      <ErrorBoundary>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">404 - Página no encontrada</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">La página que buscas no existe.</p>
          <a href="/" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Volver al inicio
          </a>
        </div>
      </ErrorBoundary>
    ),
    children: [
      // Página de inicio
      {
        index: true,
        element: <PageWrapper><DocenteDashboard /></PageWrapper>,
      },
      // Login (público)
      {
        path: 'login',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Login />
          </Suspense>
        ),
      },
      // Dashboard
      {
        path: 'dashboard',
        element: <PageWrapper><DocenteDashboard /></PageWrapper>,
      },

      // === RUTAS DE ADMINISTRADOR ===
      {
        path: 'admin',
        children: [
          { 
            index: true, 
            element: <PageWrapper onNavigate={handleNavigate}><AdminDashboard /></PageWrapper> 
          },
          { 
            path: 'docentes', 
            element: <PageWrapper><DocenteManagement /></PageWrapper> 
          },
          { 
            path: 'tutores', 
            element: <PageWrapper><Tutores /></PageWrapper> 
          },
          { 
            path: 'ciclos', 
            element: <PageWrapper><CiclosEscolares /></PageWrapper> 
          },
          { 
            path: 'documentos', 
            element: <PageWrapper><DocumentReview /></PageWrapper> 
          },
          { 
            path: 'remediales', 
            element: <PageWrapper><DocumentReview initialSection="pendientes" initialForm="Remedial" /></PageWrapper> 
          },
          { 
            path: 'documentos-revisados', 
            element: <PageWrapper><DocumentReview initialSection="revisados" /></PageWrapper> 
          },
          { 
            path: 'documentos-revisados-hoy', 
            element: <PageWrapper><DocumentReview initialSection="hoy" /></PageWrapper> 
          },
          { 
            path: 'estadias', 
            element: <PageWrapper><EstadiasAdmin /></PageWrapper> 
          },
          { 
            path: 'calendario', 
            element: <PageWrapper><CalendarioAdmin /></PageWrapper> 
          },
          { 
            path: 'configuracion', 
            element: <PageWrapper><Configuration /></PageWrapper> 
          },
          { 
            path: 'configuracion-cuenta', 
            element: <PageWrapper><Configuration initialTab="cuenta" /></PageWrapper> 
          },
        ],
      },

      // === RUTAS DE DOCENTE ===
      {
        path: 'docente',
        children: [
          { 
            path: 'historial', 
            element: <PageWrapper><DocumentHistory /></PageWrapper> 
          },
          { 
            path: 'perfil', 
            element: <PageWrapper><Profile /></PageWrapper> 
          },
          { 
            path: 'planeacion', 
            element: <PageWrapper><PlaneacionPage /></PageWrapper> 
          },
          { 
            path: 'instrumento-30-normal', 
            element: <PageWrapper><Instrumento30Page /></PageWrapper> 
          },
          { 
            path: 'instrumento-40-nuevo', 
            element: <PageWrapper><Instrumento40Page /></PageWrapper> 
          },
          { 
            path: 'instrumento-60-nuevo', 
            element: <PageWrapper><Instrumento60Page /></PageWrapper> 
          },
          { 
            path: 'instrumento-70-normal', 
            element: <PageWrapper><Instrumento70Page /></PageWrapper> 
          },
          { 
            path: 'remedial', 
            element: <PageWrapper><RemedialPage /></PageWrapper> 
          },
          { 
            path: 'lista-concentrada', 
            element: <PageWrapper><ListaConcentradaPage /></PageWrapper> 
          },
          { 
            path: 'asesoria', 
            element: <PageWrapper><AsesoriaPage /></PageWrapper> 
          },
          { 
            path: 'portafolio', 
            element: <PageWrapper><PortafolioDigitalPage /></PageWrapper> 
          },
          { 
            path: 'acta-final', 
            element: <PageWrapper><ActaFinalPage /></PageWrapper> 
          },
          { 
            path: 'estadias', 
            element: <PageWrapper><EstadiasPage /></PageWrapper> 
          },
          { 
            path: 'tutorias', 
            element: <PageWrapper><TutoriasPage /></PageWrapper> 
          },
          { 
            path: 'tutorias-carga-academica', 
            element: <PageWrapper><TutoriasPage initialType="carga-academica" /></PageWrapper> 
          },
          { 
            path: 'tutorias-reporte-bajas', 
            element: <PageWrapper><TutoriasPage initialType="reporte-bajas" /></PageWrapper> 
          },
          { 
            path: 'tutorias-concentrado-asesorias', 
            element: <PageWrapper><TutoriasPage initialType="concentrado-asesorias" /></PageWrapper> 
          },
          { 
            path: 'tutorias-acta-asistencia-grupal', 
            element: <PageWrapper><TutoriasPage initialType="acta-asistencia-grupal" /></PageWrapper> 
          },
          { 
            path: 'tutorias-ficha-tecnica', 
            element: <PageWrapper><TutoriasPage initialType="ficha-tecnica" /></PageWrapper> 
          },
        ],
      },

      // === RUTAS DE SUPERVISOR ===
      {
        path: 'supervisor',
        children: [
          { 
            path: 'planeacion', 
            element: <PageWrapper><SupervisorPlaneacion /></PageWrapper> 
          },
          { 
            path: 'instrumentos', 
            element: <PageWrapper><SupervisorInstrumentos /></PageWrapper> 
          },
          { 
            path: 'remedial', 
            element: <PageWrapper><SupervisorDocPage title="Remedial" formCode="remedial" /></PageWrapper> 
          },
          { 
            path: 'lista-concentrada', 
            element: <PageWrapper><SupervisorDocPage title="Lista Concentrada" formCode="lista-concentrada" /></PageWrapper> 
          },
          { 
            path: 'asesoria', 
            element: <PageWrapper><SupervisorDocPage title="Asesoría" formCode="asesoria" /></PageWrapper> 
          },
          { 
            path: 'portafolio', 
            element: <PageWrapper><SupervisorDocPage title="Portafolio Digital Final" formCode="portafolio-digital" hideColumns={['parcial']} /></PageWrapper> 
          },
          { 
            path: 'acta-final', 
            element: <PageWrapper><SupervisorDocPage title="Acta Final" formCode="acta-final" hideColumns={['parcial']} /></PageWrapper> 
          },
          { 
            path: 'estadias', 
            element: <PageWrapper><SupervisorDocPage title="Estadías" hideColumns={['materia', 'parcial']} formCodes={[{ code: "estadias", label: "Estadías" }, { code: "carta-presentacion", label: "Carta de Presentación" }, { code: "carta-aceptacion", label: "Carta de Aceptación" }, { code: "carta-terminacion", label: "Carta de Terminación" }]} /></PageWrapper> 
          },
          { 
            path: 'tutorias', 
            element: <PageWrapper><SupervisorDocPage title="Tutorías" hideColumns={['materia', 'carrera', 'grupo', 'parcial']} formCodes={[{ code: "carga-academica", label: "Carga Académica" }, { code: "reporte-bajas", label: "Reporte de Bajas" }, { code: "concentrado-asesorias", label: "Concentrado de Asesorías" }, { code: "acta-asistencia-grupal", label: "Acta de Asistencia Grupal" }, { code: "ficha-tecnica", label: "Ficha Técnica" }]} /></PageWrapper> 
          },
        ],
      },

      // Mensajes (compartido entre roles)
      {
        path: 'mensajes',
        element: <PageWrapper><Messages /></PageWrapper>,
      },

      // Catch-all: redirigir a dashboard
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}