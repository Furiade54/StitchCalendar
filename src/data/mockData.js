export const EVENT_TYPES = {
  APPOINTMENT: 'cita',
  BIRTHDAY: 'cumpleaños',
  REMINDER: 'recordatorio',
  MEETING: 'reunión'
};

// Initial dynamic event types data
export const DEFAULT_EVENT_TYPES = [
  {
    id: 'type_1',
    user_id: 'user_1',
    name: 'cita',
    label: 'Cita',
    icon: 'event',
    color_class: 'text-purple-600',
    icon_bg_class: 'bg-purple-100 dark:bg-purple-900/30',
    requires_end_time: true
  },
  {
    id: 'type_2',
    user_id: 'user_1',
    name: 'cumpleaños',
    label: 'Cumpleaños',
    icon: 'cake',
    color_class: 'text-pink-500',
    icon_bg_class: 'bg-pink-100 dark:bg-pink-900/30',
    requires_end_time: false
  },
  {
    id: 'type_3',
    user_id: 'user_1',
    name: 'recordatorio',
    label: 'Recordatorio',
    icon: 'notifications',
    color_class: 'text-orange-500',
    icon_bg_class: 'bg-orange-100 dark:bg-orange-900/30',
    requires_end_time: false
  },
  {
    id: 'type_4',
    user_id: 'user_1',
    name: 'reunión',
    label: 'Reunión',
    icon: 'groups',
    color_class: 'text-indigo-500',
    icon_bg_class: 'bg-indigo-100 dark:bg-indigo-900/30',
    requires_end_time: true
  }
];

export const EVENT_STATUS = {
  SCHEDULED: 'programado',
  IN_PROGRESS: 'en curso',
  COMPLETED: 'completado',
  OVERDUE: 'vencido',
  CANCELLED: 'cancelado'
};

export const USERS = [
  { 
    id: 'user_1', 
    full_name: 'Usuario Principal', 
    username: 'usuario_principal',
    email: 'me@example.com', 
    avatar_url: 'account_circle',
    status: 'active',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z',
    last_seen_at: new Date().toISOString(),
    password: 'password123'
  },
  { 
    id: 'user_2', 
    full_name: 'Colega de Trabajo', 
    username: 'colega_trabajo',
    email: 'work@example.com', 
    avatar_url: 'face',
    status: 'active',
    created_at: '2023-03-20T14:30:00Z',
    updated_at: '2023-03-20T14:30:00Z',
    last_seen_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    password: 'password123'
  },
  { 
    id: 'user_3', 
    full_name: 'Usuario Inactivo', 
    username: 'usuario_inactivo',
    email: 'inactive@example.com', 
    avatar_url: 'block',
    status: 'inactive',
    created_at: '2023-05-10T09:00:00Z',
    updated_at: '2023-05-10T09:00:00Z',
    last_seen_at: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
    password: 'password123'
  }
];

export const CURRENT_USER_ID = 'user_1';

export const SCHEDULE_DATA = [
  // User 2 Events
  {
    id: 201,
    user_id: 'user_2',
    day: 22,
    icon: 'code',
    title: 'Code Review',
    time: '11:00 AM - 12:00 PM',
    startDate: '2023-10-22T11:00:00',
    endDate: '2023-10-22T12:00:00',
    eventType: 'reunión',
    status: 'programado',
    isRecurring: false,
    colorClass: 'text-indigo-500',
    iconBgClass: 'bg-indigo-500/10',
  },
  {
    id: 202,
    user_id: 'user_2',
    day: 22,
    icon: 'lunch_dining',
    title: 'Team Lunch',
    time: '01:00 PM - 02:00 PM',
    startDate: '2023-10-22T13:00:00',
    endDate: '2023-10-22T14:00:00',
    eventType: 'cita',
    status: 'programado',
    isRecurring: false,
    colorClass: 'text-orange-500',
    iconBgClass: 'bg-orange-500/10',
  },
  
  // Day 3
  {
    id: 101,
    user_id: 'user_1',
    day: 3,
    icon: 'task_alt',
    title: 'Project Review',
    time: '09:00 AM - 10:00 AM',
    startDate: '2023-10-03T09:00:00',
    endDate: '2023-10-03T10:00:00',
    eventType: 'reunión',
    status: 'completado',
    isRecurring: false,
    notes: 'Review Q3 goals and roadmap.',
    colorClass: 'text-slate-500',
    iconBgClass: 'bg-slate-500/10',
  },
  // Day 10
  {
    id: 102,
    user_id: 'user_1',
    day: 10,
    icon: 'event',
    title: 'Team Meeting',
    time: '02:00 PM - 03:00 PM',
    startDate: '2023-10-10T14:00:00',
    endDate: '2023-10-10T15:00:00',
    eventType: 'reunión',
    status: 'programado',
    isRecurring: true,
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    colorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
  },
  // Day 15 (Multiple events)
  {
    id: 103,
    user_id: 'user_1',
    day: 15,
    icon: 'flight',
    title: 'Flight to NYC',
    time: '08:00 AM',
    startDate: '2023-10-15T08:00:00',
    endDate: '2023-10-15T11:00:00',
    eventType: 'cita',
    status: 'programado',
    isRecurring: false,
    notes: 'Flight AA123, Terminal 4. Gate 12.',
    colorClass: 'text-sky-500',
    iconBgClass: 'bg-sky-500/10',
  },
  {
    id: 104,
    user_id: 'user_1',
    day: 15,
    icon: 'hotel',
    title: 'Hotel Check-in',
    time: '02:00 PM',
    startDate: '2023-10-15T14:00:00',
    endDate: '2023-10-15T14:30:00',
    eventType: 'cita',
    status: 'programado',
    isRecurring: false,
    colorClass: 'text-orange-500',
    iconBgClass: 'bg-orange-500/10',
  },
  {
    id: 105,
    user_id: 'user_1',
    day: 15,
    icon: 'restaurant',
    title: 'Dinner with Client',
    time: '07:30 PM',
    startDate: '2023-10-15T19:30:00',
    endDate: '2023-10-15T21:00:00',
    eventType: 'reunión',
    status: 'programado',
    isRecurring: false,
    colorClass: 'text-red-500',
    iconBgClass: 'bg-red-500/10',
  },
  // Day 22 (Today - original data)
  {
    id: 1,
    user_id: 'user_1',
    day: 22,
    icon: 'design_services',
    title: 'Design Sync',
    time: '10:00 AM - 11:00 AM',
    startDate: '2023-10-22T10:00:00',
    endDate: '2023-10-22T11:00:00',
    eventType: 'reunión',
    status: 'en_curso',
    isRecurring: true,
    notes: 'Discuss new mobile layout mockups.',
    meetingUrl: 'https://zoom.us/j/123456789',
    colorClass: 'text-primary',
    iconBgClass: 'bg-primary/10',
  },
  {
    id: 2,
    user_id: 'user_1',
    day: 22,
    icon: 'dentistry',
    title: 'Dentist Appointment',
    time: '02:00 PM - 03:00 PM',
    startDate: '2023-10-22T14:00:00',
    endDate: '2023-10-22T15:00:00',
    eventType: 'cita',
    status: 'programado',
    isRecurring: false,
    colorClass: 'text-purple-500',
    iconBgClass: 'bg-purple-500/10',
  },
  {
    id: 3,
    user_id: 'user_1',
    day: 22,
    icon: 'fitness_center',
    title: 'Gym Session',
    time: '06:00 PM - 07:00 PM',
    startDate: '2023-10-22T18:00:00',
    endDate: '2023-10-22T19:00:00',
    eventType: 'recordatorio',
    status: 'completado',
    isRecurring: true,
    colorClass: 'text-slate-500',
    iconBgClass: 'bg-slate-500/10',
  },
];

export const CALENDAR_DAYS = [
  // Previous Month Days (Ghost)
  { day: 29, isGhost: true },
  { day: 30, isGhost: true },
  // Current Month Days
  { day: 1 },
  { day: 2 },
  { day: 3, indicators: ['bg-slate-500'] },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  { day: 10, indicators: ['bg-primary'] },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14 },
  { day: 15, indicators: ['bg-primary', 'bg-primary/60', 'bg-primary/40'] },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22, isToday: true, indicators: ['bg-white', 'bg-white/50'] },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28 },
  { day: 29 },
  { day: 30 },
  { day: 31 },
  // Next Month (Ghost)
  { day: 1, isGhost: true },
  { day: 2, isGhost: true },
];

export const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
