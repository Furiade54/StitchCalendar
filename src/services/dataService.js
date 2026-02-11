import { SCHEDULE_DATA, CALENDAR_DAYS, CURRENT_USER_ID, DEFAULT_EVENT_TYPES, EVENT_STATUS, EVENT_TYPES } from '../data/mockData';
// import { supabase } from '../lib/supabase'; // FUTURE: Import Supabase client

const SIMULATE_DELAY_MS = 800;

const STORAGE_KEY_EVENTS = 'stitch_calendar_events';
const STORAGE_KEY_TYPES = 'stitch_event_types';

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
        // Run overdue check on all user events before filtering
        const userEvents = MEMORY_SCHEDULE.filter(item => item.user_id === userId);
        checkAndMarkOverdue(userEvents);

        // Perform JOIN with Event Types to hydrate visual data
        const joinedEvents = userEvents.map(event => joinEventType(event));

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

  updateEvent: async (updatedEvent, userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = MEMORY_SCHEDULE.findIndex(e => e.id === updatedEvent.id && e.user_id === userId);
        if (index !== -1) {
          // Clean up visual props before saving to simulate DB normalization
          // We only save the data that actually belongs in the 'events' table
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
          
          // Return the full hydrated object for the frontend
          resolve(joinEventType(MEMORY_SCHEDULE[index]));
        } else {
           // If not found, resolve with null or original
           resolve(updatedEvent);
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  deleteEvent: async (eventId, userId = CURRENT_USER_ID) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = MEMORY_SCHEDULE.findIndex(e => e.id.toString() === eventId.toString() && e.user_id === userId);
        if (index !== -1) {
          MEMORY_SCHEDULE.splice(index, 1);
          saveToStorage(STORAGE_KEY_EVENTS, MEMORY_SCHEDULE);
          resolve(true);
        } else {
          reject(new Error('Event not found or access denied'));
        }
      }, SIMULATE_DELAY_MS / 2);
    });
  },

  addEvent: async (newEvent, userId = CURRENT_USER_ID) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Prepare DB record
        const eventRecord = {
          ...newEvent,
          id: Date.now(),
          user_id: userId,
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
  }
};
