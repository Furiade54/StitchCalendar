# Monthly Calendar View App

Una aplicación de calendario mensual moderna y reactiva construida con **React**, **Vite** y **Tailwind CSS**.

Esta aplicación sigue buenas prácticas de arquitectura (presentación vs datos) y está integrada con **Supabase** (PostgreSQL y Storage), con diseño de políticas **Row Level Security (RLS)**.

## 🚀 Características

*   **Diseño Moderno**: Interfaz limpia y minimalista inspirada en aplicaciones móviles de alta calidad.
*   **Modo Oscuro/Claro**: Soporte nativo para temas claros y oscuros (basado en preferencias del sistema o configuración manual).
*   **Arquitectura Modular**: Componentes UI reutilizables y aislados.
*   **Enrutamiento**: Navegación completa entre vistas usando React Router.
*   **Capa de Datos con Supabase**: Persistencia real de eventos, tipos, perfiles, notificaciones y compartidos.
*   **Hooks Personalizados**: Lógica de obtención de datos encapsulada en hooks de React.
*   **Loading States**: Indicadores visuales de carga (esqueletos) para mejorar la experiencia de usuario.
*   **Autenticación Base**: Inicio de sesión y registro sobre la tabla `profiles` (sesión local), con preparación para migrar a Supabase Auth.

## 🛠️ Stack Tecnológico

*   **Frontend**: React 19
*   **Routing**: React Router Dom v7
*   **Build Tool**: Vite
*   **Estilos**: Tailwind CSS v4
*   **Iconos**: Material Symbols Outlined (Google Fonts)
*   **Validación de Tipos**: PropTypes
*   **Backend as a Service**: Supabase (PostgreSQL, Storage) vía `@supabase/supabase-js` v2

## 📂 Estructura del Proyecto

El proyecto sigue una estructura escalable:

```
src/
├── components/        # Componentes UI reutilizables
│   ├── Calendar.jsx       # Grid del calendario
│   ├── CalendarDay.jsx    # Celda individual del día
│   ├── Schedule.jsx       # Lista de eventos
│   ├── ScheduleItem.jsx   # Tarjeta de evento individual
│   ├── LoginScreen.jsx    # Pantalla de autenticación
│   └── ...
├── pages/             # Páginas (Vistas completas)
│   ├── CalendarPage.jsx   # Vista principal del calendario
│   └── EventPage.jsx      # Vista de detalle y edición de eventos
├── hooks/             # Custom Hooks para lógica de negocio
│   ├── useCalendar.js     # Lógica para obtener datos del calendario
│   ├── useSchedule.js     # Lógica para obtener eventos
│   └── useTheme.js        # Gestión de tema claro/oscuro
├── lib/
│   └── supabase.js        # Cliente de Supabase inicializado
├── services/          # Capa de servicio para comunicación con la BD
│   ├── dataService.js     # Acceso a eventos, tipos, notificaciones, familias (Supabase)
│   ├── authService.js     # Sesión local y flujo de usuario en `profiles`
│   └── storageService.js  # Subidas y borrados en Supabase Storage
├── context/           # Contextos de React
│   ├── AuthContext.jsx    # Estado global de autenticación
│   └── FeedbackContext.jsx# Alertas y notificaciones UX
└── ...
```

## 🔧 Configuración y Ejecución

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```

3.  **Construir para producción**:
    ```bash
    npm run build
    ```

## � Integración con Supabase

La app usa Supabase para almacenamiento de datos (PostgreSQL) y archivos (Storage). Configura un archivo `.env` en la raíz con:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
# Opcional (bucket para storage; por defecto: StitchCalendar)
VITE_SUPABASE_STORAGE_BUCKET=StitchCalendar
```

Puntos clave:

*   **Datos**: `services/dataService.js` realiza `select/insert/update/delete` contra tablas como `events`, `event_types`, `profiles`, `notifications` y `event_shares`.
*   **Storage**: `services/storageService.js` sube/borra archivos en el bucket configurado.
*   **Autenticación**: `services/authService.js` gestiona sesión local basada en la tabla `profiles`. Se puede migrar a Supabase Auth sin romper la UI.
*   **RLS**: El diseño contempla políticas por usuario (p.ej., `events.user_id`) para asegurar acceso por propietario y compartidos.

Con esta integración, la UI permanece desacoplada gracias a los hooks y la capa de servicios, permitiendo evolucionar el flujo de autenticación y las políticas RLS sin cambios grandes en componentes.
