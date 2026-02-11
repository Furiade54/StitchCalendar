import { SCHEDULE_DATA, CALENDAR_DAYS, CURRENT_USER_ID, DEFAULT_EVENT_TYPES, EVENT_STATUS, EVENT_TYPES, USERS } from '../data/mockData';
// import { supabase } from '../lib/supabase'; // FUTURE: Import Supabase client

const SIMULATE_DELAY_MS = 800;

const USERS_KEY = 'stitch_users';

// Helper to access the "database" (localStorage) - SAME AS AUTH SERVICE
const getStoredUsers = () => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : USERS;
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// In-memory store for users (simulating DB) - Now initialized from localStorage
let MEMORY_USERS = getStoredUsers();

const STORAGE_KEY_EVENTS = 'stitch_calendar_events';
const STORAGE_KEY_TYPES = 'stitch_event_types';
const STORAGE_KEY_NOTIFICATIONS = 'stitch_notifications';

// Load initial data from LocalStorage or fall back to Mock Data
const loadFromStorage = (key, defaultData) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [...defaultData];
  } catch (error) {
    console.error(`Error loading from storage ${key}`, error);
    return [...defaultData];
  }
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage ${key}`, error);
  }
};

// In-memory store initialized from storage
let MEMORY_EVENT_TYPES = loadFromStorage(STORAGE_KEY_TYPES, DEFAULT_EVENT_TYPES);
let MEMORY_SCHEDULE = loadFromStorage(STORAGE_KEY_EVENTS, SCHEDULE_DATA);
let MEMORY_NOTIFICATIONS = loadFromStorage(STORAGE_KEY_NOTIFICATIONS, []);

// MIGRATION: Auto-assign event_type_id to legacy events
const migrateLegacyEvents = () => {
    let hasChanges = false;
    MEMORY_SCHEDULE.forEach(event => {
        if (!event.event_type_id && event.eventType) {
            // Try to find matching type by name AND user_id
            const type = MEMORY_EVENT_TYPES.find(t => 
                t.name.toLowerCase() === event.eventType.toLowerCase() && 
                t.user_id === event.user_id
            );
            if (type) {
                event.event_type_id = type.id;
                // Clean up redundant visual data to enforce normalization
                delete event.colorClass;
                delete event.iconBgClass;
                delete event.icon;
                hasChanges = true;
            }
        }
    });

    if (hasChanges) {
        console.log('Migrated legacy events to relational structure');
        saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
    }
};

// Run migration on init
migrateLegacyEvents();

// Helper to check and update overdue events
const checkAndMarkOverdue = (events) => {
  const now = new Date();
  let hasChanges = false;

  events.forEach(event => {
    // Check both SCHEDULED and OVERDUE events
    // We re-check OVERDUE events to migrate them to COMPLETED if they are auto-completable types
    if (event.status === EVENT_STATUS.SCHEDULED || event.status === EVENT_STATUS.OVERDUE) {
      // Use endDate if available, otherwise startDate
      const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
      
      if (eventEnd < now) {
        const type = event.eventType ? event.eventType.toLowerCase() : '';
        const isAutoCompletable = 
          type === EVENT_TYPES.REMINDER || 
          type === EVENT_TYPES.BIRTHDAY ||
          type === 'cumpleaños' || 
          type === 'recordatorio';

        if (isAutoCompletable) {
          if (event.status !== EVENT_STATUS.COMPLETED) {
            event.status = EVENT_STATUS.COMPLETED;
            hasChanges = true;
          }
        } else if (event.status === EVENT_STATUS.SCHEDULED) {
          // Only mark as OVERDUE if it was previously SCHEDULED (don't overwrite existing OVERDUE unless upgrading to COMPLETED)
          event.status = EVENT_STATUS.OVERDUE;
          hasChanges = true;
        }
      }
    }
  });

  if (hasChanges) {
    saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
  }
};

// Helper to simulate SQL JOIN with event_types table
// Ensures data normalization: visual properties come from the Type, not the Event record
const joinEventType = (event) => {
  // Find the related type
  // Support both legacy string match (for mock data) and future foreign key (event_type_id)
  let type = null;
  
  if (event.event_type_id) {
    type = MEMORY_EVENT_TYPES.find(t => t.id === event.event_type_id);
  } else if (event.eventType) {
    // Fallback/Migration logic for legacy mock data
    // Try to match by name (case insensitive) AND user_id
    type = MEMORY_EVENT_TYPES.find(t => 
        t.name.toLowerCase() === event.eventType.toLowerCase() &&
        t.user_id === event.user_id
    );
  }

  if (type) {
    return {
      ...event,
      // In a real SQL JOIN, these would be selected as: "event_types.color_class as colorClass"
      // We map snake_case DB columns to camelCase frontend props
      colorClass: type.color_class || event.colorClass, 
      iconBgClass: type.icon_bg_class || event.iconBgClass,
      icon: type.icon || event.icon,
      eventTypeName: type.label || type.name, // Human readable name
      event_type_id: type.id // Ensure FK is present
    };
  }

  return event; // Return as-is if no type found (orphan record or custom)
};

export const dataService = {
  getEventTypes: async (userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let types = MEMORY_EVENT_TYPES.filter(t => t.user_id === userId);
        
        // Auto-seed default types for new users (Simulation of onboarding logic)
        if (types.length === 0 && DEFAULT_EVENT_TYPES.length > 0) {
           const seededTypes = DEFAULT_EVENT_TYPES.map(t => ({
             ...t,
             id: `seed_${t.id}_${userId}_${Date.now()}`, // Unique IDs for this user
             user_id: userId // Assign to this user
           }));
           
           // Persist these new seeded types to memory
           MEMORY_EVENT_TYPES.push(...seededTypes);
           saveToStorage(STORAGE_KEY_TYPES, MEMORY_EVENT_TYPES);
           types = seededTypes;
        }

        resolve(types);
      }, SIMULATE_DELAY_MS / 3);
    });
  },

  createEventType: async (newType, userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const typeWithId = {
          ...newType,
          id: Date.now(), // Mock ID
          user_id: userId
        };
        MEMORY_EVENT_TYPES.push(typeWithId);
        saveToStorage(STORAGE_KEY_TYPES, MEMORY_EVENT_TYPES);
        resolve(typeWithId);
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  updateEventType: async (typeId, updatedType, userId = CURRENT_USER_ID) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = MEMORY_EVENT_TYPES.findIndex(t => t.id === typeId && t.user_id === userId);
        if (index !== -1) {
           MEMORY_EVENT_TYPES[index] = { ...MEMORY_EVENT_TYPES[index], ...updatedType };
           saveToStorage(STORAGE_KEY_TYPES, MEMORY_EVENT_TYPES);
           resolve(MEMORY_EVENT_TYPES[index]);
        } else {
           reject(new Error('Event Type not found or permission denied'));
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  deleteEventType: async (typeId, userId = CURRENT_USER_ID) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = MEMORY_EVENT_TYPES.findIndex(t => t.id === typeId && t.user_id === userId);
        if (index !== -1) {
          MEMORY_EVENT_TYPES.splice(index, 1);
          saveToStorage(STORAGE_KEY_TYPES, MEMORY_EVENT_TYPES);
          resolve(true);
        } else {
          reject(new Error('Event type not found or permission denied'));
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  getSchedule: async (day, currentDate, userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Refresh users to ensure family links are up to date
        const currentUsers = getStoredUsers(); 
        const currentUser = currentUsers.find(u => u.id === userId);

        // Run overdue check on all events (global) before filtering could be better, 
        // but for now we filter first for performance, then check overdue on result.
        // Wait, checkAndMarkOverdue modifies objects. We should check relevant events.
        
        // FUTURE: This logic mimics Supabase RLS 'SELECT' policy.
        // The Policy would be:
        // auth.uid() = user_id  -- Owner
        // OR auth.uid() = ANY(shared_with) -- Direct Share
        // OR ('family' = ANY(shared_with) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND family_id = events.family_id)) -- Family Share
        // OR auth.uid() = ANY (SELECT unnest(allowed_editors) FROM profiles WHERE id = events.user_id) -- Editor Access
        const userEvents = MEMORY_SCHEDULE.filter(item => {
             const isOwner = item.user_id === userId;
             
             // Check direct sharing
             const isSharedWithMe = item.shared_with && item.shared_with.includes(userId);
             
             // Check family sharing
             let isFamilyShared = false;
             if (item.shared_with && item.shared_with.includes('family')) {
                 const owner = currentUsers.find(u => u.id === item.user_id);
                 // If I am in the same family as the owner
                 if (owner && currentUser && owner.family_id && currentUser.family_id === owner.family_id) {
                     isFamilyShared = true;
                 }
             }

             // Check editor permission (Editors can SEE the calendar too)
             const canEdit = dataService.canEdit(item.user_id, userId);

             return isOwner || isSharedWithMe || isFamilyShared || canEdit;
        });

        checkAndMarkOverdue(userEvents);

        // Perform JOIN with Event Types to hydrate visual data
        // AND JOIN with Users to get Owner Info
        const joinedEvents = userEvents.map(event => {
            const hydratedEvent = joinEventType(event);
            
            // Attach Owner Info
            const owner = currentUsers.find(u => u.id === event.user_id);
            if (owner) {
                hydratedEvent.owner = {
                    id: owner.id,
                    full_name: owner.full_name,
                    avatar_url: owner.avatar_url,
                    username: owner.username
                };
            }
            
            return hydratedEvent;
        });

        let filtered = joinedEvents;
        
        // Filter logic based on selection
        if (day && currentDate) {
            // Filter by specific day if provided (Strict Day Match)
            const targetDate = new Date(currentDate);
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();

            filtered = filtered.filter(item => {
                const itemDate = new Date(item.startDate);
                return itemDate.getDate() === day && 
                       itemDate.getMonth() === targetMonth && 
                       itemDate.getFullYear() === targetYear;
            });
        } else if (currentDate) {
            // If no day selected (Month View / Agenda View)
            // UX Improvement: Show events starting from TODAY if viewing the current month
            // Otherwise show from start of the selected month
            const targetDate = new Date(currentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let startFilterDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            
            // If viewing current month, start filter from Today
            if (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) {
                startFilterDate = today;
            }

            filtered = filtered.filter(item => {
                const itemDate = new Date(item.startDate);
                // Always show Overdue events regardless of date
                if (item.status === EVENT_STATUS.OVERDUE) return true;
                
                // Show future/present events
                return itemDate >= startFilterDate;
            });

            // SUPABASE MIGRATION NOTE:
            // While SQL can sort using 'ORDER BY', we perform this specific "Priority Sort" 
            // (Today > Future > Past) in the CLIENT layer.
            // 
            // Reason: "Today" is relative to the User's local Timezone.
            // PostgreSQL server time (UTC) might differ from User's browser time.
            // To ensure "Today" is always accurate to the user's perception, we fetch 
            // the data range from DB, and then apply this smart-sorting in the browser.
            
            // 1. Priority Sorting Logic
            filtered.sort((a, b) => {
                const dateA = new Date(a.startDate);
                const dateB = new Date(b.startDate);
                
                // Normalize to midnight for date comparison
                const dateAOnly = new Date(dateA); dateAOnly.setHours(0,0,0,0);
                const dateBOnly = new Date(dateB); dateBOnly.setHours(0,0,0,0);
                const todayOnly = new Date(today); todayOnly.setHours(0,0,0,0);
                
                // Priority Categories:
                // 0 = Today (High Priority - Top of list)
                // 1 = Future (Upcoming - Middle of list)
                // 2 = Past/Overdue (Low Priority - Bottom of list)
                const getCategory = (d) => {
                    if (d.getTime() === todayOnly.getTime()) return 0;
                    if (d > todayOnly) return 1;
                    return 2;
                };

                const catA = getCategory(dateAOnly);
                const catB = getCategory(dateBOnly);

                // Primary Sort: By Category
                if (catA !== catB) {
                    return catA - catB; 
                }

                // Secondary Sort: Chronological within category
                // Past events: Ascending (Oldest to Newest) or Descending (Yesterday to Oldest)?
                // Standard Agenda behavior is Ascending (Time flows forward)
                return dateA - dateB;
            });
        }
        
        resolve(filtered);
      }, SIMULATE_DELAY_MS);
    });
  },

  getEventById: async (eventId, userId = CURRENT_USER_ID) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // userId check is important for security simulation
        // Changed userId to user_id to match Supabase convention
        const event = MEMORY_SCHEDULE.find(e => e.id.toString() === eventId.toString() && e.user_id === userId);
        if (event) {
          // Check if this specific event is overdue
          checkAndMarkOverdue([event]);
          // Return hydrated event (JOIN)
          resolve(joinEventType(event));
        } else {
          reject(new Error('Event not found'));
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  updateEvent: async (updatedEvent, userId = CURRENT_USER_ID, requestingUserId = null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Find existing event to verify owner
        const existingEvent = MEMORY_SCHEDULE.find(e => e.id.toString() === updatedEvent.id.toString());
        if (!existingEvent) {
             reject(new Error("Evento no encontrado"));
             return;
        }

        // The owner of the event is existingEvent.user_id
        // We must check if requestingUserId can edit existingEvent.user_id's calendar
        if (requestingUserId && requestingUserId !== existingEvent.user_id) {
             const hasPermission = dataService.canEdit(existingEvent.user_id, requestingUserId);
             if (!hasPermission) {
                 reject(new Error("No tienes permiso para editar este evento."));
                 return;
             }
        }

        const index = MEMORY_SCHEDULE.findIndex(e => e.id.toString() === updatedEvent.id.toString() && e.user_id === userId);
        if (index !== -1) {
           // Clean up visual props before saving to simulate DB normalization
           const { colorClass, iconBgClass, icon, eventTypeName, ...dbEvent } = updatedEvent;
           
           // Ensure event_type_id is set if we have a type name
           if (!dbEvent.event_type_id && dbEvent.eventType) {
              const type = MEMORY_EVENT_TYPES.find(t => 
                 t.name.toLowerCase() === dbEvent.eventType.toLowerCase() &&
                 t.user_id === userId
              );
              if (type) dbEvent.event_type_id = type.id;
           }

           MEMORY_SCHEDULE[index] = { ...MEMORY_SCHEDULE[index], ...dbEvent };
           saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
           resolve(joinEventType(MEMORY_SCHEDULE[index]));
        } else {
          reject(new Error('Evento no encontrado'));
        }
      }, SIMULATE_DELAY_MS);
    });
  },

  deleteEvent: async (eventId, userId = CURRENT_USER_ID, requestingUserId = null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const event = MEMORY_SCHEDULE.find(e => e.id.toString() === eventId.toString());
        if (!event) {
             reject(new Error("Evento no encontrado"));
             return;
        }

        if (requestingUserId && requestingUserId !== event.user_id) {
             const hasPermission = dataService.canEdit(event.user_id, requestingUserId);
             if (!hasPermission) {
                 reject(new Error("No tienes permiso para eliminar este evento."));
                 return;
             }
        }

        const initialLength = MEMORY_SCHEDULE.length;
        MEMORY_SCHEDULE = MEMORY_SCHEDULE.filter(e => !(e.id.toString() === eventId.toString() && e.user_id === userId));
        
        if (MEMORY_SCHEDULE.length < initialLength) {
          saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
          resolve({ success: true });
        } else {
          reject(new Error('Evento no encontrado o permiso denegado'));
        }
      }, SIMULATE_DELAY_MS);
    });
  },

  shareEvent: async (eventId, targetIds, userId = CURRENT_USER_ID) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = MEMORY_SCHEDULE.findIndex(e => e.id.toString() === eventId.toString() && e.user_id === userId);
        if (index !== -1) {
          // Update shared_with
          // targetIds should be an array of strings (userIds or 'family')
          MEMORY_SCHEDULE[index] = {
            ...MEMORY_SCHEDULE[index],
            shared_with: targetIds
          };
          saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
          
          // Return the full hydrated object
          resolve(joinEventType(MEMORY_SCHEDULE[index]));
        } else {
          reject(new Error('Evento no encontrado o permiso denegado'));
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  updateUserPermissions: async (userId, allowedEditors) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // FUTURE: This maps to an UPDATE on the 'profiles' table.
        // RLS Policy: Users can only update their own profile.
        // CHECK (auth.uid() = id)
        const userIndex = MEMORY_USERS.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          MEMORY_USERS[userIndex] = {
            ...MEMORY_USERS[userIndex],
            allowed_editors: allowedEditors
          };
          saveUsers(MEMORY_USERS);
          resolve(MEMORY_USERS[userIndex]);
        } else {
          resolve(null);
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  // FUTURE: This method maps to Supabase RLS policies for table "events".
  // The policy "Users can insert/update/delete events" would look like:
  // (auth.uid() = user_id) OR (auth.uid() = ANY (SELECT unnest(allowed_editors) FROM profiles WHERE id = events.user_id))
  canEdit: (targetUserId, editorId) => {
    if (targetUserId === editorId) return true;
    const users = getStoredUsers();
    const targetUser = users.find(u => u.id === targetUserId);
    // In RLS, 'allowed_editors' is a text[] column in the 'profiles' table
    return targetUser && targetUser.allowed_editors && targetUser.allowed_editors.includes(editorId);
  },

  addEvent: async (newEvent, userId = CURRENT_USER_ID, requestingUserId = null) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Permission check
        // FUTURE: RLS Policy for INSERT:
        // WITH CHECK ((auth.uid() = user_id) OR (auth.uid() = ANY (SELECT unnest(allowed_editors) FROM profiles WHERE id = user_id)))
        if (requestingUserId && requestingUserId !== userId) {
             const hasPermission = dataService.canEdit(userId, requestingUserId);
             if (!hasPermission) {
                 reject(new Error("No tienes permiso para editar el calendario de este usuario."));
                 return;
             }
        }

        // Prepare DB record
        const eventRecord = {
          ...newEvent,
          id: Date.now(),
          user_id: userId,
          // Track who actually created the event if it wasn't the owner (Audit Trail)
          created_by: requestingUserId || userId, 
          created_at: new Date().toISOString()
        };

        // Try to link to a real event type
        if (!eventRecord.event_type_id && eventRecord.eventType) {
            const type = MEMORY_EVENT_TYPES.find(t => 
                t.name.toLowerCase() === eventRecord.eventType.toLowerCase() &&
                t.user_id === userId
            );
            if (type) {
                eventRecord.event_type_id = type.id;
            }
        }

        // Remove visual properties if they are redundant (coming from type)
        // This simulates a clean 'events' table
        if (eventRecord.event_type_id) {
            delete eventRecord.colorClass;
            delete eventRecord.iconBgClass;
            delete eventRecord.icon;
        } else {
            // Fallback defaults if no type found
            if (!eventRecord.colorClass) eventRecord.colorClass = 'text-primary';
            if (!eventRecord.iconBgClass) eventRecord.iconBgClass = 'bg-primary/10';
            if (!eventRecord.icon) eventRecord.icon = 'event';
        }

        MEMORY_SCHEDULE.push(eventRecord);
        saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
        
        // Return hydrated event
        resolve(joinEventType(eventRecord));
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  getCalendarDays: async (year, month, userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const days = [];
        
        // Get first day of month and total days
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Previous month days (ghost)
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
          days.push({ day: daysInPrevMonth - i, isGhost: true, isPrevMonth: true });
        }

        // Current month days
        const today = new Date();
        const isSameMonth = today.getMonth() === month && today.getFullYear() === year;

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = isSameMonth && i === today.getDate();

            // Dynamic Relational Indicator Generation
            // Query events for this day and user to generate indicators
            const dayEvents = MEMORY_SCHEDULE.filter(e => 
              e.day === i && 
              e.user_id === userId &&
              new Date(e.startDate).getMonth() === month && // Basic check, ideally use full date comparison
              new Date(e.startDate).getFullYear() === year
            ).map(e => joinEventType(e)); // HYDRATE WITH JOIN

            let indicators = dayEvents.map(e => {
                // Map event types/colors to indicator classes
                // Safe check for colorClass (it should exist after joinEventType)
                const color = e.colorClass || 'text-gray-400';
                
                if (color.includes('text-primary')) return 'bg-primary';
                if (color.includes('text-sky')) return 'bg-sky-500';
                if (color.includes('text-orange')) return 'bg-orange-500';
                if (color.includes('text-red')) return 'bg-red-500';
                if (color.includes('text-purple')) return 'bg-purple-500';
                if (color.includes('text-slate')) return 'bg-slate-500';
                if (color.includes('text-indigo')) return 'bg-indigo-500';
                if (color.includes('text-pink')) return 'bg-pink-500';
                return 'bg-gray-400';
            });
            
            // Limit indicators to 3 dots max
            if (indicators.length > 3) indicators = indicators.slice(0, 3);

            days.push({ day: i, isCurrentMonth: true, indicators, isToday });
        }

        // Next month days (ghost) - fill remaining grid slots (assuming 6 rows * 7 cols = 42 total slots max usually needed)
        // Or just fill until end of week
        const totalDaysShown = days.length;
        const daysNeeded = 42 - totalDaysShown; // Ensure 6 rows for consistent height
        
        for (let i = 1; i <= daysNeeded; i++) {
             days.push({ day: i, isGhost: true, isNextMonth: true });
        }

        resolve(days);
      }, SIMULATE_DELAY_MS / 2); // Faster response for calendar grid
    });
  },

  getUserStats: async (userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userEvents = MEMORY_SCHEDULE.filter(item => item.user_id === userId);
        
        // Ensure overdue status is up to date before counting
        checkAndMarkOverdue(userEvents);

        const completedCount = userEvents.filter(e => e.status === EVENT_STATUS.COMPLETED).length;
        
        const now = new Date();
        const upcomingCount = userEvents.filter(e => 
          new Date(e.startDate) > now && 
          e.status !== EVENT_STATUS.CANCELLED
        ).length;

        resolve({
          completedTasks: completedCount,
          upcomingEvents: upcomingCount
        });
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  getCompletedEvents: async (userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userEvents = MEMORY_SCHEDULE.filter(item => item.user_id === userId);
        
        // Update statuses first (this will auto-complete expired reminders)
        checkAndMarkOverdue(userEvents);

        // Filter AND Hydrate (JOIN)
        const completedEvents = userEvents
            .filter(item => item.status === EVENT_STATUS.COMPLETED)
            .map(e => joinEventType(e));
        
        // Sort by completion date (using endDate or startDate) descending
        completedEvents.sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        resolve(completedEvents);
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  getFamilyMembers: async (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Refresh from storage to ensure we have latest data
        MEMORY_USERS = getStoredUsers();
        const currentUser = MEMORY_USERS.find(u => u.id === userId);
        if (!currentUser || !currentUser.family_id) {
          resolve([]);
          return;
        }
        const members = MEMORY_USERS.filter(u => 
          u.family_id === currentUser.family_id && u.id !== userId
        );
        resolve(members);
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  // FUTURE: This method maps to a Supabase RPC function because it requires cross-user write permissions.
  // See: supabase/migrations/20231028000001_rpc_add_family_member.sql
  // Usage: const { data, error } = await supabase.rpc('add_family_member', { target_email: email });
  addFamilyMember: async (currentUserId, email) => {
    return new Promise((resolve, reject) => {
       setTimeout(() => {
          // Refresh from storage
          MEMORY_USERS = getStoredUsers();
          
          const currentUserIndex = MEMORY_USERS.findIndex(u => u.id === currentUserId);
          if (currentUserIndex === -1) {
             reject(new Error("Usuario actual no encontrado"));
             return;
          }

          const targetUserIndex = MEMORY_USERS.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
          if (targetUserIndex === -1) {
             reject(new Error("No se encontró ningún usuario con ese email"));
             return;
          }

          const currentUser = MEMORY_USERS[currentUserIndex];
          const targetUser = MEMORY_USERS[targetUserIndex];

          if (currentUser.id === targetUser.id) {
              reject(new Error("No puedes agregarte a ti mismo"));
              return;
          }

          if (targetUser.family_id && targetUser.family_id !== currentUser.family_id) {
              reject(new Error("Este usuario ya pertenece a otro grupo familiar"));
              return;
          }
          
          if (targetUser.family_id === currentUser.family_id && currentUser.family_id) {
              reject(new Error("Este usuario ya está en tu grupo familiar"));
              return;
          }

          // Crear family_id si no existe
          let familyId = currentUser.family_id;
          if (!familyId) {
              familyId = `family_${Date.now()}`;
              MEMORY_USERS[currentUserIndex].family_id = familyId;
          }

          // Asignar al target
          MEMORY_USERS[targetUserIndex].family_id = familyId;
          
          // IMPORTANT: Update currentUser in memory too if we just created a new family for them
          if (!currentUser.family_id) {
             MEMORY_USERS[currentUserIndex].family_id = familyId;
          }

          // PERSIST CHANGES TO STORAGE
          saveUsers(MEMORY_USERS);

          resolve(MEMORY_USERS[targetUserIndex]);
       }, SIMULATE_DELAY_MS);
    });
  },

  removeFamilyMember: async (currentUserId, targetMemberId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        MEMORY_USERS = getStoredUsers();
        const currentUser = MEMORY_USERS.find(u => u.id === currentUserId);
        const targetUserIndex = MEMORY_USERS.findIndex(u => u.id === targetMemberId);

        if (!currentUser || !currentUser.family_id) {
          reject(new Error("No perteneces a ningún grupo familiar"));
          return;
        }
        
        // FUTURE: This operation requires an RPC function in Supabase because
        // a user cannot update another user's profile directly via RLS.
        // Function: remove_family_member(target_user_id uuid)
        
        if (targetUserIndex === -1) {
          reject(new Error("Usuario no encontrado"));
          return;
        }

        const targetUser = MEMORY_USERS[targetUserIndex];

        if (targetUser.family_id !== currentUser.family_id) {
          reject(new Error("Este usuario no pertenece a tu grupo familiar"));
          return;
        }

        // Remove from family
        MEMORY_USERS[targetUserIndex].family_id = null;
        
        // Also remove from allowed_editors if present to revoke permissions
        if (currentUser.allowed_editors) {
            const editorIndex = currentUser.allowed_editors.indexOf(targetMemberId);
            if (editorIndex !== -1) {
                const currentUserIndex = MEMORY_USERS.findIndex(u => u.id === currentUserId);
                const updatedEditors = [...currentUser.allowed_editors];
                updatedEditors.splice(editorIndex, 1);
                MEMORY_USERS[currentUserIndex].allowed_editors = updatedEditors;
            }
        }

        saveUsers(MEMORY_USERS);
        resolve({ success: true });
      }, SIMULATE_DELAY_MS);
    });
  },

  leaveFamilyGroup: async (userId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        MEMORY_USERS = getStoredUsers();
        const userIndex = MEMORY_USERS.findIndex(u => u.id === userId);

        if (userIndex === -1) {
          reject(new Error("Usuario no encontrado"));
          return;
        }

        if (!MEMORY_USERS[userIndex].family_id) {
          reject(new Error("No perteneces a ningún grupo familiar"));
          return;
        }

        // Remove family_id
        MEMORY_USERS[userIndex].family_id = null;
        saveUsers(MEMORY_USERS);
        resolve({ success: true });
      }, SIMULATE_DELAY_MS);
    });
  },

  sendFamilyRequest: async (currentUserId, targetEmail) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        MEMORY_USERS = getStoredUsers();
        const currentUser = MEMORY_USERS.find(u => u.id === currentUserId);
        const targetUser = MEMORY_USERS.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());

        if (!currentUser) {
            reject(new Error("Usuario actual no encontrado"));
            return;
        }

        if (!targetUser) {
            reject(new Error("Usuario objetivo no encontrado"));
            return;
        }

        if (!targetUser.family_id) {
            reject(new Error("El usuario objetivo no tiene grupo familiar"));
            return;
        }

        if (targetUser.id === currentUserId) {
            reject(new Error("No puedes enviarte una solicitud a ti mismo"));
            return;
        }

        // Check if request already exists
        const existingRequest = MEMORY_NOTIFICATIONS.find(n => 
            n.type === 'family_request' && 
            n.fromUserId === currentUserId && 
            n.toUserId === targetUser.id &&
            n.status === 'pending'
        );

        if (existingRequest) {
            reject(new Error("Ya has enviado una solicitud a este usuario"));
            return;
        }

        // Create Notification
        const notification = {
            id: `notif_${Date.now()}`,
            type: 'family_request',
            fromUserId: currentUserId,
            fromUserName: currentUser.full_name || currentUser.email,
            toUserId: targetUser.id,
            familyId: targetUser.family_id,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        MEMORY_NOTIFICATIONS.push(notification);
        saveToStorage(STORAGE_KEY_NOTIFICATIONS, MEMORY_NOTIFICATIONS);
        
        resolve({ success: true, message: "Solicitud enviada correctamente" });
      }, SIMULATE_DELAY_MS);
    });
  },

  getNotifications: async (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const notifications = MEMORY_NOTIFICATIONS.filter(n => n.toUserId === userId && n.status === 'pending')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(notifications);
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  respondToFamilyRequest: async (notificationId, userId, accept) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // FUTURE: This method maps to a Supabase RPC function.
        // Even though we are updating the 'notifications' status (which the user owns),
        // we are ALSO updating the *requester's* family_id (which the user DOES NOT own).
        // Therefore, this entire transaction must be wrapped in a SECURITY DEFINER function.
        // Function: respond_to_family_request(notification_id uuid, accept boolean)
        
        const notificationIndex = MEMORY_NOTIFICATIONS.findIndex(n => n.id === notificationId && n.toUserId === userId);
        
        if (notificationIndex === -1) {
            reject(new Error("Notificación no encontrada"));
            return;
        }

        const notification = MEMORY_NOTIFICATIONS[notificationIndex];

        if (accept) {
            // Logic to join the user to the family
            MEMORY_USERS = getStoredUsers();
            
            // The requester is the one who wanted to join YOUR family
            // So we add 'fromUserId' to 'toUserId's family
            // WAIT - The prompt says: "Este usuario ya pertenece a otro grupo familiar, deseas que le enviemos una solicitud para que te una a su grupo familiar?"
            // So User A (Current) asks User B (Target/Existing Group) to join User B's family.
            // Notification goes to User B.
            // If User B accepts, User A should be added to User B's family.
            
            // BUT wait, User A initiated the request.
            // The notification is: "User A wants to join your family group".
            // So 'fromUserId' is User A. 'toUserId' is User B.
            // If User B accepts, User A's family_id should become User B's family_id.

            const requesterIndex = MEMORY_USERS.findIndex(u => u.id === notification.fromUserId);
            const approverIndex = MEMORY_USERS.findIndex(u => u.id === userId); // User B

            if (requesterIndex === -1 || approverIndex === -1) {
                reject(new Error("Usuario no encontrado"));
                return;
            }

            const approver = MEMORY_USERS[approverIndex];
            
            // Assign requester to approver's family
            MEMORY_USERS[requesterIndex].family_id = approver.family_id;
            saveUsers(MEMORY_USERS);
        }

        // Update notification status
        MEMORY_NOTIFICATIONS[notificationIndex].status = accept ? 'accepted' : 'rejected';
        saveToStorage(STORAGE_KEY_NOTIFICATIONS, MEMORY_NOTIFICATIONS);

        resolve({ success: true });
      }, SIMULATE_DELAY_MS);
    });
  },

  deleteUser: async (userId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        MEMORY_USERS = getStoredUsers();
        const userIndex = MEMORY_USERS.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
          reject(new Error("Usuario no encontrado"));
          return;
        }

        // 1. Remove User
        MEMORY_USERS.splice(userIndex, 1);
        
        // 2. Remove from other users' allowed_editors
        MEMORY_USERS.forEach(user => {
            if (user.allowed_editors && user.allowed_editors.includes(userId)) {
                user.allowed_editors = user.allowed_editors.filter(id => id !== userId);
            }
        });
        saveUsers(MEMORY_USERS);

        // 3. Cascade Delete Events
        const initialEventCount = MEMORY_SCHEDULE.length;
        MEMORY_SCHEDULE = MEMORY_SCHEDULE.filter(e => e.user_id !== userId);
        if (MEMORY_SCHEDULE.length !== initialEventCount) {
            saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
        }

        // 4. Cascade Delete Event Types
        const initialTypeCount = MEMORY_EVENT_TYPES.length;
        MEMORY_EVENT_TYPES = MEMORY_EVENT_TYPES.filter(t => t.user_id !== userId);
        if (MEMORY_EVENT_TYPES.length !== initialTypeCount) {
            saveToStorage(STORAGE_KEY_TYPES, MEMORY_EVENT_TYPES);
        }

        // 5. Cascade Delete Notifications (sent by or received by user)
        const initialNotifCount = MEMORY_NOTIFICATIONS.length;
        MEMORY_NOTIFICATIONS = MEMORY_NOTIFICATIONS.filter(n => n.fromUserId !== userId && n.toUserId !== userId);
        if (MEMORY_NOTIFICATIONS.length !== initialNotifCount) {
            saveToStorage(STORAGE_KEY_NOTIFICATIONS, MEMORY_NOTIFICATIONS);
        }

        resolve({ success: true });
      }, SIMULATE_DELAY_MS);
    });
  }
};
