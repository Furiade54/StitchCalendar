export const EVENT_TYPES = {
  APPOINTMENT: 'cita',
  BIRTHDAY: 'cumpleaños',
  REMINDER: 'recordatorio',
  MEETING: 'reunión'
};

export const EVENT_STATUS = {
  SCHEDULED: 'programado',
  IN_PROGRESS: 'en curso',
  COMPLETED: 'completado',
  OVERDUE: 'vencido',
  CANCELLED: 'cancelado'
};

export const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const AVAILABLE_ICONS = [
  'event',            // Cita / General
  'cake',             // Cumpleaños
  'notifications',    // Recordatorio
  'groups',           // Reunión
  'celebration',      // Evento social / Fiesta
  'work',             // Trabajo
  'medical_services', // Médico
  'family_restroom',  // Familiar
  'person',           // Personal
  'flight',           // Viaje
  'assignment',       // Trámite / Tarea
  'school',           // Educación
  'pets',             // Mascotas
  'fitness_center',   // Deporte
  'more_horiz',       // Otro
  'restaurant',       // Comida
  'shopping_cart',    // Compras
  'directions_car',   // Transporte
  'home',             // Casa
  'payments'          // Pagos
];

export const AVAILABLE_COLORS = [
  { name: 'Púrpura', class: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Rosa', class: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { name: 'Naranja', class: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Índigo', class: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { name: 'Azul', class: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Verde', class: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Rojo', class: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  { name: 'Verde Azulado', class: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
];
