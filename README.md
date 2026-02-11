# Monthly Calendar View App

Una aplicación de calendario mensual moderna y reactiva construida con **React**, **Vite** y **Tailwind CSS**.

Esta aplicación ha sido refactorizada para seguir las mejores prácticas de arquitectura de software, separando la lógica de presentación de la lógica de datos, y está preparada para una futura integración con **Supabase** y **Row Level Security (RLS)**.

## 🚀 Características

*   **Diseño Moderno**: Interfaz limpia y minimalista inspirada en aplicaciones móviles de alta calidad.
*   **Modo Oscuro/Claro**: Soporte nativo para temas claros y oscuros (basado en preferencias del sistema o configuración manual).
*   **Arquitectura Modular**: Componentes UI reutilizables y aislados.
*   **Enrutamiento**: Navegación completa entre vistas usando React Router.
*   **Capa de Datos Asíncrona**: Simulación de llamadas a API (preparada para backend real).
*   **Hooks Personalizados**: Lógica de obtención de datos encapsulada en hooks de React.
*   **Loading States**: Indicadores visuales de carga (esqueletos) para mejorar la experiencia de usuario.
*   **Autenticación Simulada**: Sistema de login multi-usuario preparado para Supabase Auth.

## 🛠️ Stack Tecnológico

*   **Frontend**: React 18
*   **Routing**: React Router Dom v6
*   **Build Tool**: Vite
*   **Estilos**: Tailwind CSS v4
*   **Iconos**: Material Symbols Outlined (Google Fonts)
*   **Validación de Tipos**: PropTypes

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
│   └── useAuth.js         # Hook de autenticación
├── services/          # Capa de servicio para comunicación con API
│   └── dataService.js     # Simula llamadas a BD (punto de integración para Supabase)
├── context/           # Contextos de React
│   └── AuthContext.jsx    # Estado global de autenticación
├── data/              # Datos estáticos y tipos
│   └── mockData.js        # Datos de prueba iniciales
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

## 🔮 Preparación para Supabase

La aplicación está diseñada para migrar fácilmente a Supabase u otro backend.

**Autenticación y Seguridad (Future-Proof):**

*   **LoginScreen**: Actualmente filtra usuarios inactivos en el cliente. En producción, esto se reemplaza por el flujo de autenticación de Supabase (OAuth/Email), donde los usuarios inactivos son bloqueados a nivel de servidor.
*   **DataService**: Las funciones reciben `userId` para simular filtrado. En el futuro, esto se manejará mediante **RLS (Row Level Security)** en PostgreSQL, donde `auth.uid()` determina automáticamente el acceso a los datos sin necesidad de pasar el ID explícitamente desde el cliente.

### Esquema de Base de Datos y RLS

Se han incluido archivos de migración SQL en la carpeta `supabase/migrations/` que definen la estructura de la base de datos y las políticas de seguridad:

1.  **`profiles`**: Tabla de usuarios con datos extendidos.
    *   *RLS*: Pública para lectura (encontrar colegas), pero solo editable por el propio usuario.
2.  **`events`**: Tabla de eventos del calendario.
    *   *RLS*: Estrictamente privada.
    *   `select`: Solo el dueño puede ver sus eventos (`auth.uid() = user_id`).
    *   `insert/update/delete`: Solo el dueño puede modificar sus eventos.

Esto asegura que incluso si un usuario malintencionado intenta acceder a la API, la base de datos rechazará cualquier petición que no corresponda a su usuario autenticado.

**Pasos para migrar:**

1.  Instalar el cliente de Supabase: `npm install @supabase/supabase-js`
2.  Configurar el cliente en un archivo `src/services/supabaseClient.js`.
3.  Modificar `src/services/dataService.js` para reemplazar la simulación (`setTimeout`) con llamadas reales:

    ```javascript
    // src/services/dataService.js (Ejemplo futuro)
    import { supabase } from './supabaseClient';

    export const dataService = {
      getSchedule: async (day) => {
        // userId no es necesario pasarlo, Supabase usa el token de sesión
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('day', day);
          
        if (error) throw error;
        return data;
      },
      // ...
    };
    ```

Los componentes (`Schedule.jsx`, `Calendar.jsx`) **NO** necesitarán cambios significativos, ya que consumen los datos a través de los hooks y el servicio, manteniendo la UI desacoplada del origen de datos.
