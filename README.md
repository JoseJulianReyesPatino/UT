# Sistema de Gestión Académica Universitaria

Sistema web moderno y profesional para la gestión académica universitaria, diseñado para docentes y administradores.

## Características Principales

### Para Docentes
- **Dashboard intuitivo** con resumen de actividad
- **Formularios inteligentes** para subir documentos (paso a paso)
- **Historial completo** de documentos enviados
- **Sistema de mensajes** para comunicación con administradores
- **Gestión de documentos** por:
  - Planeación
  - Instrumentos de evaluación (30/40% y 60/70%)
  - Listas concentradas
  - Asesoría
  - Portafolio Digital
  - Actas finales
  - Estadías y Tutorías

### Para Administradores
- **Panel de control** con métricas en tiempo real
- **Gestión de docentes** (crear, editar, desactivar usuarios)
- **Revisión de documentos** con sistema de aprobación/rechazo
- **Filtros avanzados** por carrera, materia, cuatrimestre, parcial
- **Ciclos escolares** para organización temporal
- **Configuración del sistema**
- **Reportes y estadísticas**

## Diseño UX/UI

### Identidad Visual
- **Colores**: Negro profundo, blanco limpio, grises suaves, verde institucional (#16a34a)
- **Estilo**: Minimalista, espacios amplios, diseño limpio
- **Inspiración**: Notion, Linear, Stripe Dashboard, Google Classroom

### Componentes
- Sidebar moderna y colapsable
- Tarjetas (cards) elegantes
- Formularios inteligentes y progresivos
- Sistema de badges para estados
- Modales suaves
- Notificaciones toast
- Tabs modernas
- Dropdowns avanzados

## Credenciales de Prueba

### Docente
- **Email**: `docente@universidad.edu`
- **Contraseña**: cualquier texto

### Administrador
- **Email**: `admin@universidad.edu`
- **Contraseña**: cualquier texto

## Tecnologías

- **React 18** + **TypeScript**
- **Tailwind CSS v4** para estilos
- **Radix UI** para componentes accesibles
- **Lucide React** para iconografía
- **Sonner** para notificaciones
- **Motion** para animaciones suaves

## Estructura del Proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── ui/            # Componentes UI base
│   │   ├── Sidebar.tsx    # Navegación principal
│   │   ├── SmartDocumentForm.tsx
│   │   ├── EmptyState.tsx
│   │   └── StatsCard.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── DocenteDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── DocumentHistory.tsx
│   │   ├── DocumentReview.tsx
│   │   ├── Messages.tsx
│   │   ├── DocenteManagement.tsx
│   │   ├── CiclosEscolares.tsx
│   │   └── Configuration.tsx
│   └── App.tsx
├── lib/
│   └── utils.ts
└── styles/
    └── theme.css
```

## Características Destacadas

### Formularios Inteligentes
Los formularios se adaptan dinámicamente según las selecciones del usuario:
1. Selección de tipo (TSU/Ingeniería) y plan
2. Selección de carrera y cuatrimestre
3. Materia, parcial y grupo
4. Subida de archivo PDF con vista previa

### Sistema de Notificaciones
- Confirmaciones de acciones
- Alertas de errores
- Notificaciones de éxito
- Diseño moderno y no intrusivo

### Navegación Intuitiva
- Sidebar con iconos claros
- Estados activos visuales
- Menús específicos por rol
- Breadcrumbs contextuales

### Gestión de Estados
- Estados vacíos elegantes
- Skeletons para carga
- Feedback visual inmediato
- Validaciones en tiempo real

## Responsive Design

El sistema está optimizado para:
- **Desktop** (1920px+)
- **Laptop** (1280px - 1920px)
- **Tablet** (768px - 1280px)

## Accesibilidad

- Alto contraste para legibilidad
- Tipografía clara y cómoda
- Navegación por teclado
- Componentes ARIA-compliant
- Diseño amigable para todos los usuarios

## Próximas Mejoras

- [ ] Visor de PDFs integrado
- [ ] Exportación de reportes
- [ ] Gráficas y estadísticas avanzadas
- [ ] Sistema de permisos granular
- [ ] Notificaciones push
- [ ] Calendario académico integrado
- [ ] Firma digital de documentos

---

**Desarrollado con atención al detalle para una experiencia premium**
