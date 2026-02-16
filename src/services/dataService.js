import { supabase } from '../lib/supabase';
import { DEFAULT_EVENT_TYPES, EVENT_STATUS, EVENT_TYPES } from '../utils/constants';

const STATUS_MAP_TO_DB = {
  'programado': 'scheduled',
  'en curso': 'scheduled',
  'completado': 'completed',
  'vencido': 'overdue',
  'cancelado': 'cancelled',
  // Safety fallbacks
  'scheduled': 'scheduled',
  'completed': 'completed',
  'overdue': 'overdue',
  'cancelled': 'cancelled'
};

const STATUS_MAP_FROM_DB = {
  'scheduled': 'programado',
  'completed': 'completado',
  'overdue': 'vencido',
  'cancelled': 'cancelado'
};

// Helper to map Supabase Event to Frontend Model
const mapEventFromSupabase = (dbEvent) => {
  // Extract joined relations
  const type = dbEvent.event_types;
  const owner = dbEvent.profiles; // joined via user_id

  // NEW: Construct shared_with from normalized data
  let sharedWith = [];
  if (dbEvent.shared_with) {
      // RPC returns it directly
      sharedWith = dbEvent.shared_with;
  } else {
      // Direct select: combine is_family_shared + event_shares table
      if (dbEvent.event_shares && Array.isArray(dbEvent.event_shares)) {
          sharedWith = dbEvent.event_shares.map(s => s.user_id);
      }
      if (dbEvent.is_family_shared) {
          sharedWith.push('family');
      }
  }

  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    startDate: dbEvent.start_date,
    endDate: dbEvent.end_date,
    allDay: dbEvent.all_day,
    status: STATUS_MAP_FROM_DB[dbEvent.status] || 'programado',
    location: dbEvent.location,
    user_id: dbEvent.user_id,
    shared_with: sharedWith,
    created_by: dbEvent.created_by,
    isRecurring: dbEvent.is_recurring || false,
    recurrencePattern: dbEvent.recurrence_pattern || null,
    notes: dbEvent.notes,
    meetingUrl: dbEvent.meeting_url,
    
    // Relational Data (Hydrated)
    event_type_id: dbEvent.event_type_id,
    eventType: type ? type.name : null, // Legacy support
    eventTypeName: type ? type.name : null,
    colorClass: type ? type.color_class : (dbEvent.color_class || 'text-primary'), // Fallback if type deleted
    iconBgClass: type ? type.icon_bg_class : (dbEvent.icon_bg_class || 'bg-primary/10'),
    icon: type ? type.icon : (dbEvent.icon || 'event'),
    
    // Owner Info
    owner: owner ? {
      id: owner.id,
      full_name: owner.full_name,
      avatar_url: owner.avatar_url,
      username: owner.username,
      family_id: owner.family_id,
      allowed_editors: owner.allowed_editors
    } : null
  };
};

// Helper to map Frontend Model to Supabase Event
const mapEventToSupabase = (frontendEvent, userId) => {
   const sharedWith = frontendEvent.shared_with || [];
   const hasTz = (s) => typeof s === 'string' && /([zZ]|[+-]\d{2}:\d{2})$/.test(s);
   const toIsoZ = (localStr) => {
     if (!localStr) return null;
     if (hasTz(localStr)) {
       // If it already has a timezone, normalize to Z to avoid double shifts
       const d = new Date(localStr);
       return d.toISOString();
     }
     const [datePart, timePartRaw] = localStr.split('T');
     const timePart = (timePartRaw || '00:00').padEnd(5, '0');
     const [hh, mm] = timePart.split(':').map((v) => parseInt(v, 10));
     const [y, m, d] = datePart.split('-').map((v) => parseInt(v, 10));
     const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
     return dt.toISOString();
   };
   return {
     title: frontendEvent.title,
     description: frontendEvent.description,
     start_date: toIsoZ(frontendEvent.startDate),
     end_date: toIsoZ(frontendEvent.endDate),
     all_day: frontendEvent.allDay,
     status: STATUS_MAP_TO_DB[frontendEvent.status] || 'scheduled',
     location: frontendEvent.location,
     user_id: userId, // Ensure ownership
     event_type_id: frontendEvent.event_type_id,
     is_family_shared: sharedWith.includes('family'),
     is_recurring: frontendEvent.isRecurring || false,
     recurrence_pattern: frontendEvent.recurrencePattern || null,
     notes: frontendEvent.notes,
     meeting_url: frontendEvent.meetingUrl,
     color_class: frontendEvent.colorClass,
     icon_bg_class: frontendEvent.iconBgClass,
     icon: frontendEvent.icon
   };
};

// Expand recurring events into concrete occurrences within a date range (frontend-only recurrence)
const expandRecurringEvents = (events, rangeStart, rangeEnd) => {
  if (!rangeStart || !rangeEnd) return events;
  const out = [];

  const addInterval = (date, pattern) => {
    const d = new Date(date);
    if (pattern === 'daily') d.setDate(d.getDate() + 1);
    else if (pattern === 'weekly') d.setDate(d.getDate() + 7);
    else if (pattern === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (pattern === 'yearly') d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  events.forEach(ev => {
    if (!ev.isRecurring || !ev.recurrencePattern) {
      out.push(ev);
      return;
    }

    const baseStart = new Date(ev.startDate);
    const baseEnd = new Date(ev.endDate);
    if (isNaN(baseStart) || isNaN(baseEnd)) {
      out.push(ev);
      return;
    }

    let currentStart = new Date(baseStart);
    let currentEnd = new Date(baseEnd);
    let safety = 0;

    while (currentEnd < rangeStart && safety < 1000) {
      currentStart = addInterval(currentStart, ev.recurrencePattern);
      currentEnd = addInterval(currentEnd, ev.recurrencePattern);
      safety += 1;
    }

    while (currentStart <= rangeEnd && safety < 2000) {
      if (currentEnd >= rangeStart) {
        out.push({
          ...ev,
          startDate: currentStart.toISOString(),
          endDate: currentEnd.toISOString()
        });
      }
      currentStart = addInterval(currentStart, ev.recurrencePattern);
      currentEnd = addInterval(currentEnd, ev.recurrencePattern);
      safety += 1;
    }
  });

  return out;
};

export const dataService = {
    // Helper to maintain event statuses (auto-complete reminders, mark overdue)
    checkAndMarkOverdue: async (userId) => {
        try {
            const now = new Date().toISOString();
            
            // Fetch candidates: Scheduled, Overdue, or Pending events in the past
            // We run two queries to handle cases with and without end_date
            const query1 = supabase
                .from('events')
                .select('id, status, end_date, start_date, event_types(name)')
                .eq('user_id', userId)
                .in('status', ['scheduled', 'overdue', 'pending'])
                .lt('end_date', now);

            const query2 = supabase
                .from('events')
                .select('id, status, end_date, start_date, event_types(name)')
                .eq('user_id', userId)
                .in('status', ['scheduled', 'overdue', 'pending'])
                .is('end_date', null)
                .lt('start_date', now);

            const [result1, result2] = await Promise.all([query1, query2]);

            // Filter out "Aborted" errors which happen on rapid navigation
            // Also ignore RLS errors (42501) or connection errors to avoid console noise
            const isIgnorableError = (err) => {
                if (!err) return false;
                // Code 20 is generic abort in some versions, but standard is different.
                // We check for network errors or known safe errors
                return err.code === 'PGRST116' || // no rows (not applicable here but good practice)
                       err.message?.includes('fetch') || 
                       err.message?.includes('abort');
            };

            if (result1.error && !isIgnorableError(result1.error)) {
                console.warn("Maintenance check (1) skipped:", result1.error.message);
            }
            if (result2.error && !isIgnorableError(result2.error)) {
                console.warn("Maintenance check (2) skipped:", result2.error.message);
            }

            const events = [...(result1.data || []), ...(result2.data || [])];

            if (!events || events.length === 0) return;

            // NEW: Use RPC for batch status updates to improve performance and consistency
            // If the RPC fails (e.g., doesn't exist yet), fall back to client-side loop
            try {
                // We only need IDs for the RPC
                // Filter locally first to minimize payload
                const toCompleteIds = [];
                const toOverdueIds = [];

                events.forEach(event => {
                    const typeName = event.event_types ? event.event_types.name.toLowerCase() : '';
                    const isAutoCompletable = 
                        typeName === 'recordatorio' || 
                        typeName === 'cumpleaños' ||
                        typeName === 'reminder' ||
                        typeName === 'birthday' ||
                        !event.event_types;

                    if (isAutoCompletable) {
                        if (event.status !== 'completed') {
                            toCompleteIds.push(event.id);
                        }
                    } else {
                        if (event.status === 'scheduled' || event.status === 'pending') {
                            toOverdueIds.push(event.id);
                        }
                    }
                });

                if (toCompleteIds.length > 0) {
                     await Promise.all(toCompleteIds.map(id => 
                        dataService.updateEventStatus(id, 'completed', userId)
                     ));
                }
                if (toOverdueIds.length > 0) {
                     await Promise.all(toOverdueIds.map(id => 
                        dataService.updateEventStatus(id, 'overdue', userId)
                     ));
                }
                return; // RPC success, exit
            } catch (rpcError) {
                console.warn("Batch update failed, using legacy loop:", rpcError.message);
                // Fallthrough to legacy logic below
            }

            const toComplete = [];
            const toOverdue = [];

            events.forEach(event => {
                const typeName = event.event_types ? event.event_types.name.toLowerCase() : '';
                
                // Logic matches checkAndMarkOverdue for consistency
                // Also treat events with NULL event_type_id as auto-completable (fallback for legacy/orphan events)
                const isAutoCompletable = 
                    typeName === 'recordatorio' || 
                    typeName === 'cumpleaños' ||
                    typeName === 'reminder' ||
                    typeName === 'birthday' ||
                    !event.event_types; // Auto-complete if no type is assigned

                if (isAutoCompletable) {
                    if (event.status !== 'completed') {
                        toComplete.push(event.id);
                    }
                } else {
                    if (event.status === 'scheduled' || event.status === 'pending') {
                        toOverdue.push(event.id);
                    }
                }
            });

            const promises = [];
            if (toComplete.length > 0) {
                promises.push(supabase.from('events').update({ status: 'completed' }).in('id', toComplete));
            }
            if (toOverdue.length > 0) {
                promises.push(supabase.from('events').update({ status: 'overdue' }).in('id', toOverdue));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                // console.log(`Auto-maintained: ${toComplete.length} completed, ${toOverdue.length} overdue.`);
            }
        } catch (err) {
            // Silently ignore maintenance errors to prevent UI noise
            if (err.name !== 'AbortError') {
                // console.warn("Auto-maintenance skipped:", err);
            }
        }
    },

  getEventTypes: async (userId) => {
       const { data, error } = await supabase
         .from('event_types')
         .select('*')
         .eq('user_id', userId);
       
       if (error) throw error;

       // Seeding moved to ensureDefaultEventTypes to avoid race conditions
       // Map to frontend format
       return data.map(t => ({
          id: t.id,
          name: t.name,
          label: t.name, // Compat
          color: t.color_class, // Compat
          color_class: t.color_class,
          icon_bg_class: t.icon_bg_class,
          icon: t.icon,
          user_id: t.user_id,
          requires_end_time: t.requires_end_time,
          requires_location: t.requires_location,
          requires_url: t.requires_url,
          default_recurring: t.default_recurring
       }));
  },

  ensureDefaultEventTypes: async (userId) => {
       const { data: existing, error: fetchErr } = await supabase
         .from('event_types')
         .select('name')
         .eq('user_id', userId);
       if (fetchErr) throw fetchErr;
       if (existing.length > 0) return true;
       for (const t of DEFAULT_EVENT_TYPES) {
         const dbType = {
           user_id: userId,
           name: t.name,
           color_class: t.color_class,
           icon_bg_class: t.icon_bg_class,
           icon: t.icon,
           requires_end_time: t.requires_end_time,
           requires_location: t.requires_location,
           requires_url: t.requires_url,
           default_recurring: t.default_recurring
         };
         const { error: insErr } = await supabase
           .from('event_types')
           .insert(dbType);
         if (insErr && insErr.code !== '23505') {
           console.error('Error seeding default event types:', insErr);
         }
       }
       return true;
  },

  createEventType: async (newType, userId) => {
        const dbType = {
            name: newType.name,
            color_class: newType.color_class || newType.colorClass || newType.color,
            icon_bg_class: newType.icon_bg_class || newType.iconBgClass,
            icon: newType.icon,
            user_id: userId,
            // Configuration fields
            requires_end_time: newType.requires_end_time,
            requires_location: newType.requires_location,
            requires_url: newType.requires_url,
            default_recurring: newType.default_recurring
        };
        
        const { data, error } = await supabase
            .from('event_types')
            .insert(dbType)
            .select()
            .single();
            
        if (error) throw error;
        
        return {
            id: data.id,
            name: data.name,
            label: data.name,
            colorClass: data.color_class,
            iconBgClass: data.icon_bg_class,
            icon: data.icon,
            user_id: data.user_id,
            // Return config
            requires_end_time: data.requires_end_time,
            requires_location: data.requires_location,
            requires_url: data.requires_url,
            default_recurring: data.default_recurring
        };
  },

  updateEventType: async (typeId, updatedType, userId) => {
        const dbUpdates = {};
        if (updatedType.name) dbUpdates.name = updatedType.name;
        if (updatedType.color_class || updatedType.colorClass || updatedType.color) dbUpdates.color_class = updatedType.color_class || updatedType.colorClass || updatedType.color;
        if (updatedType.icon_bg_class || updatedType.iconBgClass) dbUpdates.icon_bg_class = updatedType.icon_bg_class || updatedType.iconBgClass;
        if (updatedType.icon) dbUpdates.icon = updatedType.icon;
        
        // Update configuration fields if present
        if (updatedType.requires_end_time !== undefined) dbUpdates.requires_end_time = updatedType.requires_end_time;
        if (updatedType.requires_location !== undefined) dbUpdates.requires_location = updatedType.requires_location;
        if (updatedType.requires_url !== undefined) dbUpdates.requires_url = updatedType.requires_url;
        if (updatedType.default_recurring !== undefined) dbUpdates.default_recurring = updatedType.default_recurring;
        
        const { data, error } = await supabase
            .from('event_types')
            .update(dbUpdates)
            .eq('id', typeId)
            .eq('user_id', userId) // Security check
            .select()
            .single();
            
        if (error) throw error;
        
        return {
            id: data.id,
            name: data.name,
            label: data.name,
            colorClass: data.color_class,
            iconBgClass: data.icon_bg_class,
            icon: data.icon,
            user_id: data.user_id,
            // Return config
            requires_end_time: data.requires_end_time,
            requires_location: data.requires_location,
            requires_url: data.requires_url,
            default_recurring: data.default_recurring
        };
  },

  deleteEventType: async (typeId, userId) => {
        const { error } = await supabase
            .from('event_types')
            .delete()
            .eq('id', typeId)
            .eq('user_id', userId);
            
        if (error) throw error;
        return true;
  },

  getSchedule: async (day, currentDate, viewerId) => {
        let query = supabase
            .from('events')
            .select('*, event_types(*), profiles!events_user_id_fkey(*), event_shares(user_id)')
            .order('start_date', { ascending: true });

        if (day && currentDate) {
            const targetDate = new Date(currentDate);
            targetDate.setDate(day);
            targetDate.setHours(0,0,0,0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(day + 1);
            query = query.gte('start_date', targetDate.toISOString()).lt('start_date', nextDay.toISOString());
        } else if (currentDate) {
            const targetDate = new Date(currentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startFilterDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            if (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) {
                startFilterDate = today;
            }
            query = query.or(`start_date.gte.${startFilterDate.toISOString()},status.eq.overdue`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        let events = data.map(mapEventFromSupabase);
        if (viewerId) {
            const { data: viewer, error: vErr } = await supabase
              .from('profiles')
              .select('id,family_id')
              .eq('id', viewerId)
              .maybeSingle();
            const familyId = vErr ? null : viewer?.family_id || null;
            events = events.filter(e => {
              const sharedIds = Array.isArray(e.shared_with) ? e.shared_with : [];
              const ownerEditors = Array.isArray(e.owner?.allowed_editors) ? e.owner.allowed_editors : [];
              const famOk = e.shared_with?.includes('family') && e.owner?.family_id && familyId && e.owner.family_id === familyId;
              return e.user_id === viewerId || sharedIds.includes(viewerId) || famOk || ownerEditors.includes(viewerId);
            });
        }

        const rangeStart = (() => {
            if (day && currentDate) {
                const d = new Date(currentDate);
                d.setDate(day);
                d.setHours(0,0,0,0);
                return d;
            }
            if (currentDate) {
                const d = new Date(currentDate);
                d.setHours(0,0,0,0);
                return d;
            }
            return null;
        })();
        const rangeEnd = (() => {
            if (day && currentDate) {
                const d = new Date(currentDate);
                d.setDate(day);
                d.setHours(23,59,59,999);
                return d;
            }
            if (currentDate) {
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() + 1);
                d.setDate(0);
                d.setHours(23,59,59,999);
                return d;
            }
            return null;
        })();

        if (rangeStart && rangeEnd) {
            events = expandRecurringEvents(events, rangeStart, rangeEnd);
        }

        if (!day && currentDate) {
            const today = new Date();
            today.setHours(0,0,0,0);
            events.sort((a, b) => {
                const dateA = new Date(a.startDate);
                const dateB = new Date(b.startDate);
                const dateAOnly = new Date(dateA); dateAOnly.setHours(0,0,0,0);
                const dateBOnly = new Date(dateB); dateBOnly.setHours(0,0,0,0);
                const todayOnly = new Date(today); todayOnly.setHours(0,0,0,0);
                const getCategory = (d, status) => {
                     if (status === 'overdue') return 2;
                     if (d.getTime() === todayOnly.getTime()) return 0;
                     if (d > todayOnly) return 1;
                     return 2;
                };
                const catA = getCategory(dateAOnly, a.status);
                const catB = getCategory(dateBOnly, b.status);
                if (catA !== catB) return catA - catB;
                return dateA - dateB;
            });
        }
        
        return events;
  },

  getEventById: async (eventId, viewerId = null) => {
        const { data, error } = await supabase
            .from('events')
            .select('*, event_types(*), profiles!events_user_id_fkey(*), event_shares(user_id)')
            .eq('id', eventId)
            .single();
            
        if (error) throw error;
        const ev = mapEventFromSupabase(data);
        if (viewerId) {
            const { data: viewer, error: vErr } = await supabase
              .from('profiles')
              .select('id,family_id')
              .eq('id', viewerId)
              .maybeSingle();
            const familyId = vErr ? null : viewer?.family_id || null;
            const sharedIds = Array.isArray(ev.shared_with) ? ev.shared_with : [];
            const ownerEditors = Array.isArray(ev.owner?.allowed_editors) ? ev.owner.allowed_editors : [];
            const famOk = ev.shared_with?.includes('family') && ev.owner?.family_id && familyId && ev.owner.family_id === familyId;
            const visible = ev.user_id === viewerId || sharedIds.includes(viewerId) || famOk || ownerEditors.includes(viewerId);
            if (!visible) throw new Error('Event not found or access denied');
        }
        return ev;
  },

  updateEventStatus: async (eventId, newStatus) => {
      const { data, error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, status: data.status };
  },

  updateEvent: async (updatedEvent, userId) => {
        // Map to DB format
        const dbEvent = mapEventToSupabase(updatedEvent, userId);
        
        const { data, error } = await supabase
            .from('events')
            .update(dbEvent)
            .eq('id', updatedEvent.id)
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .single();
            
        if (error) {
            // Fallback for missing relation or profiles table
            if (error.code === 'PGRST200') {
                 console.warn("Relation fetch failed (likely missing profiles), returning basic data", error.message);
                 const { data: basicData, error: basicError } = await supabase
                    .from('events')
                    .select('*, event_types(*)')
                    .eq('id', updatedEvent.id)
                    .single();
                 if (basicError) throw basicError;
                 return mapEventFromSupabase(basicData);
            }
            throw error;
        }

        // NEW: Sync event_shares
        if (updatedEvent.shared_with && Array.isArray(updatedEvent.shared_with)) {
             const shareUserIds = updatedEvent.shared_with.filter(id => id !== 'family');
             
             // 1. Delete existing shares
             const { error: deleteError } = await supabase
                .from('event_shares')
                .delete()
                .eq('event_id', updatedEvent.id);
                
             if (deleteError) console.error("Error clearing old shares:", deleteError);
             
             // 2. Insert new shares
             if (shareUserIds.length > 0) {
                 const sharesToInsert = shareUserIds.map(uid => ({
                     event_id: updatedEvent.id,
                     user_id: uid
                 }));
                 
                 const { error: insertError } = await supabase
                    .from('event_shares')
                    .insert(sharesToInsert);
                    
                 if (insertError) {
                     console.error("Error updating event shares:", insertError);
                 } else {
                     data.event_shares = sharesToInsert;
                 }
             } else {
                 data.event_shares = [];
             }
        }
        
        return mapEventFromSupabase(data);
  },

  deleteEvent: async (eventId) => {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
            
        if (error) throw error;
        return { success: true };
  },

  shareEvent: async (eventId, targetIds) => {
        // 1. Update is_family_shared flag
        const isFamilyShared = targetIds.includes('family');
        const userIds = targetIds.filter(id => id !== 'family');
        
        const { data, error } = await supabase
            .from('events')
            .update({ is_family_shared: isFamilyShared })
            .eq('id', eventId)
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .single();
            
        if (error) throw error;
        
        // 2. Sync event_shares
        const { error: deleteError } = await supabase
            .from('event_shares')
            .delete()
            .eq('event_id', eventId);
            
        if (deleteError) throw deleteError;
        
        const sharesToInsert = userIds.map(uid => ({
            event_id: eventId,
            user_id: uid
        }));
        
        if (sharesToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('event_shares')
                .insert(sharesToInsert);
                
            if (insertError) throw insertError;
        }
        
        // Attach manual shares for return mapping
        data.event_shares = sharesToInsert;
        
        return mapEventFromSupabase(data);
  },

  updateUserPermissions: async (userId, allowedEditors) => {
    // This maps to an UPDATE on the 'profiles' table.
    // RLS Policy: Users can only update their own profile.
    const { data, error } = await supabase
        .from('profiles')
        .update({ allowed_editors: allowedEditors })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
  },

  // Check de edición: solo dueño o listado explícito en allowed_editors
  canEdit: async (targetUserId, editorUserId) => {
    if (!targetUserId || !editorUserId) return false;
    if (targetUserId === editorUserId) return true;
    const { data: target, error: tErr } = await supabase
      .from('profiles')
      .select('id,allowed_editors')
      .eq('id', targetUserId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!target) return false;
    const allowed = Array.isArray(target.allowed_editors) ? target.allowed_editors : [];
    return allowed.includes(editorUserId);
  },

  addEvent: async (newEvent, userId, requestingUserId = null) => {
        // Map to DB format
        const dbEvent = mapEventToSupabase(newEvent, userId);
        
        // Add audit trail if provided
        if (requestingUserId) {
            dbEvent.created_by = requestingUserId;
        } else {
            dbEvent.created_by = userId;
        }
        
        const { data, error } = await supabase
            .from('events')
            .insert(dbEvent)
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .single();
            
        if (error) {
             // Handle Missing Profile (FK Violation) - Self Healing
             if (error.code === '23503') {
                 console.warn("User profile missing (FK violation), attempting to create profile...");
                 const { data: { user } } = await supabase.auth.getUser();
                 
                 if (user && user.id === userId) {
                     const { error: profileError } = await supabase.from('profiles').insert({
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                        avatar_url: user.user_metadata?.avatar_url,
                        username: user.user_metadata?.username || user.email?.split('@')[0]
                     });
                     
                     if (!profileError) {
                         // Retry insert
                         const { data: retryData, error: retryError } = await supabase
                            .from('events')
                            .insert(dbEvent)
                            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
                            .single();
                            
                         if (!retryError) {
                             // Handle shares for retry
                             if (newEvent.shared_with && Array.isArray(newEvent.shared_with)) {
                                const shareUserIds = newEvent.shared_with.filter(id => id !== 'family');
                                if (shareUserIds.length > 0) {
                                    const sharesToInsert = shareUserIds.map(uid => ({
                                        event_id: retryData.id,
                                        user_id: uid
                                    }));
                                    await supabase.from('event_shares').insert(sharesToInsert);
                                    retryData.event_shares = sharesToInsert;
                                }
                             }
                             return mapEventFromSupabase(retryData);
                         }
                     }
                 }
             }

             // Fallback for missing relation or profiles table
            if (error.code === 'PGRST200') {
                 console.warn("Relation fetch failed (likely missing profiles), returning basic data", error.message);
                 // Retry insert
                 const { data: retryData, error: retryError } = await supabase
                    .from('events')
                    .insert(dbEvent)
                    .select('*, event_types(*)')
                    .single();
                    
                 if (retryError) throw retryError;

                 // Attempt to insert shares even in fallback
                 if (newEvent.shared_with && Array.isArray(newEvent.shared_with)) {
                    const shareUserIds = newEvent.shared_with.filter(id => id !== 'family');
                    if (shareUserIds.length > 0) {
                        const sharesToInsert = shareUserIds.map(uid => ({
                            event_id: retryData.id,
                            user_id: uid
                        }));
                        const { error: shareError } = await supabase.from('event_shares').insert(sharesToInsert);
                        if (!shareError) retryData.event_shares = sharesToInsert;
                    }
                 }
                 
                 return mapEventFromSupabase(retryData);
            }
            throw error;
        }

        // NEW: Handle event_shares insertion
        if (newEvent.shared_with && Array.isArray(newEvent.shared_with)) {
             const shareUserIds = newEvent.shared_with.filter(id => id !== 'family');
             if (shareUserIds.length > 0) {
                 const sharesToInsert = shareUserIds.map(uid => ({
                     event_id: data.id,
                     user_id: uid
                 }));
                 
                 const { error: shareError } = await supabase
                    .from('event_shares')
                    .insert(sharesToInsert);
                 
                 if (shareError) {
                     console.error("Error inserting event shares:", shareError);
                 } else {
                     // Attach shares to data for mapping
                     data.event_shares = sharesToInsert;
                 }
             }
        }
        
        return mapEventFromSupabase(data);
  },

  getCalendarDays: async (year, month, viewerId) => {
        // Calculate range
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        
        // Fetch events for this month
        const { data: monthEvents, error } = await supabase
            .from('events')
            .select('*, event_types(*)') // No need for owner info for indicators
            .gte('start_date', startOfMonth.toISOString())
            .lte('start_date', endOfMonth.toISOString());
            
        if (error) throw error;
        let mapped = monthEvents.map(mapEventFromSupabase);
        if (viewerId) {
            const { data: viewer, error: vErr } = await supabase
              .from('profiles')
              .select('id,family_id')
              .eq('id', viewerId)
              .maybeSingle();
            const familyId = vErr ? null : viewer?.family_id || null;
            mapped = mapped.filter(e => {
              const sharedIds = Array.isArray(e.shared_with) ? e.shared_with : [];
              const ownerEditors = Array.isArray(e.owner?.allowed_editors) ? e.owner.allowed_editors : [];
              const famOk = e.shared_with?.includes('family') && e.owner?.family_id && familyId && e.owner.family_id === familyId;
              return e.user_id === viewerId || sharedIds.includes(viewerId) || famOk || ownerEditors.includes(viewerId);
            });
        }
        const startRange = new Date(year, month, 1, 0, 0, 0, 0);
        const endRange = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const hydratedEvents = expandRecurringEvents(mapped, startRange, endRange);

        // Grid Generation Logic
        const days = [];
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

            // Filter events for this day from the fetched batch
            const dayEvents = hydratedEvents.filter(e => {
                const d = new Date(e.startDate);
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });

            let indicators = dayEvents.map(e => {
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
            
            if (indicators.length > 3) indicators = indicators.slice(0, 3);

            days.push({ day: i, isCurrentMonth: true, indicators, isToday });
        }

        // Next month days
        const totalDaysShown = days.length;
        const daysNeeded = 42 - totalDaysShown; 
        
        for (let i = 1; i <= daysNeeded; i++) {
             days.push({ day: i, isGhost: true, isNextMonth: true });
        }

        return days;
  },

  getUserStats: async (userId) => {
        // 1. Maintenance: Update past events (fire and forget)
        try {
            await dataService.checkAndMarkOverdue(userId);
        } catch (e) {
            // Ignore maintenance errors
        }

        try {
            // Optimization: Use RPC to get all stats in one DB call
            const { data, error } = await supabase.rpc('get_user_stats', { target_user_id: userId });

            if (error) throw error;

            return {
              completedTasks: data.completedTasks || 0,
              upcomingEvents: data.upcomingEvents || 0
            };
        } catch (err) {
            console.warn("RPC get_user_stats failed, falling back to legacy queries:", err.message);
            // Fallback to client-side counting (Legacy)
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayIso = today.toISOString();

                const [resultCompleted, resultUpcoming] = await Promise.all([
                    // Contar eventos visibles por RLS (propios o compartidos)
                    supabase.from('events').select('id', { count: 'exact', head: true }).in('status', ['completed', 'overdue']),
                    supabase.from('events').select('id', { count: 'exact', head: true }).neq('status', 'cancelled').neq('status', 'completed').neq('status', 'overdue').gte('start_date', todayIso)
                ]);
                
                const isAbort = (err) => {
                    if (!err) return false;
                    const msg = (err.message || '').toLowerCase();
                    return err.name === 'AbortError' || msg.includes('abort') || err.code === 'PGRST116';
                };
                
                const completed = isAbort(resultCompleted.error) ? 0 : (resultCompleted.count || 0);
                const upcoming = isAbort(resultUpcoming.error) ? 0 : (resultUpcoming.count || 0);
                
                return {
                    completedTasks: completed,
                    upcomingEvents: upcoming
                };
            } catch (fallbackErr) {
                return { completedTasks: 0, upcomingEvents: 0 };
            }
        }
  },

  getCompletedEvents: async (userId) => {
        let events = [];
        try {
            // 1. Try fetching via RPC (New Per-User Status Logic)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_events_with_status_json', {
                 target_user_id: userId,
                 filter_type: 'completed'
            });

            if (rpcError) throw rpcError;
            events = rpcData.map(mapEventFromSupabase);

        } catch (err) {
             console.warn("RPC get_events_with_status_json failed (completed), fallback to legacy:", err.message);
             // Fallback
             let query = supabase
                .from('events')
                .select('*, event_types(*), profiles!events_user_id_fkey(*), event_shares(user_id)')
                .in('status', ['completed', 'overdue'])
                .order('start_date', { ascending: false });

            // We rely on RLS to filter visible events (Owner OR Shared OR Family)
            // Explicitly filtering by user_id would hide shared events where I am not the owner.
            // if (userId) {
            //     query = query.eq('user_id', userId);
            // }

            const { data, error } = await query;
            if (error) throw error;
            const mapped = data.map(mapEventFromSupabase);
            if (userId) {
                const { data: viewer, error: vErr } = await supabase
                  .from('profiles')
                  .select('id,family_id')
                  .eq('id', userId)
                  .maybeSingle();
                const familyId = vErr ? null : viewer?.family_id || null;
                events = mapped.filter(e => {
                  const sharedIds = Array.isArray(e.shared_with) ? e.shared_with : [];
                  const ownerEditors = Array.isArray(e.owner?.allowed_editors) ? e.owner.allowed_editors : [];
                  const famOk = e.shared_with?.includes('family') && e.owner?.family_id && familyId && e.owner.family_id === familyId;
                  return e.user_id === userId || sharedIds.includes(userId) || famOk || ownerEditors.includes(userId);
                });
            } else {
                events = mapped;
            }
        }
        
        return events;
  },

  getFamilyMembers: async (userId) => {
      // 1. Get my family_id
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) throw userError;
      if (!userData?.family_id) return [];

      // 2. Get members
      // Ensure family_id is treated as UUID if strict typing is enforced, though JS is loose.
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', userData.family_id)
        .neq('id', userId);

      if (membersError) throw membersError;
      return members;
  },

  userExistsByEmail: async (email) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return { exists: !!data, user: data || null };
  },

  addFamilyMember: async (currentUserId, email) => {
      // DEPRECATED: Use sendFamilyRequest instead.
      // This function now redirects to sendFamilyRequest internally via SQL or JS
      return dataService.sendFamilyRequest(currentUserId, email);
  },

  removeFamilyMember: async (currentUserId, targetMemberId) => {
      const { error } = await supabase
        .from('profiles')
        .update({ family_id: null })
        .eq('id', targetMemberId);
      if (error) throw error;
      return { success: true };
  },

  leaveFamilyGroup: async (userId) => {
      const { error } = await supabase
        .from('profiles')
        .update({ family_id: null })
        .eq('id', userId);
      if (error) throw error;
      return { success: true };
  },

  sendFamilyRequest: async (currentUserId, targetEmail) => {
      const { data: target, error: targetErr } = await supabase
        .from('profiles')
        .select('id,email')
        .eq('email', targetEmail)
        .maybeSingle();
      if (targetErr) throw targetErr;
      if (!target) throw new Error('Usuario no encontrado');
      const { data: me, error: meErr } = await supabase
        .from('profiles')
        .select('id,family_id')
        .eq('id', currentUserId)
        .single();
      if (meErr) throw meErr;
      const payload = me.family_id ? { family_id: me.family_id } : {};
      const notification = {
        type: 'family_request',
        from_user_id: currentUserId,
        to_user_id: target.id,
        status: 'pending',
        payload
      };
      const { data: created, error: notifErr } = await supabase
        .from('notifications')
        .insert(notification)
        .select('*')
        .single();
      if (notifErr) throw notifErr;
      return created;
  },

  getNotifications: async (userId) => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:from_user_id (
            full_name,
            email
          )
        `)
        .eq('to_user_id', userId)
        .in('status', ['pending','accepted','rejected','granted','revoked'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map to app structure
      return data.map(n => ({
        id: n.id,
        type: n.type,
        fromUserId: n.from_user_id,
        fromUserName: n.sender?.full_name || n.sender?.email,
        toUserId: n.to_user_id,
        familyId: n.payload?.family_id,
        status: n.status,
        createdAt: n.created_at
      }));
  },

  respondToFamilyRequest: async (notificationId, userId, accept) => {
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('id,type,from_user_id,to_user_id,status,payload')
        .eq('id', notificationId)
        .single();
      if (notifErr) throw notifErr;
      if (!notif || notif.type !== 'family_request') throw new Error('Solicitud inválida');
      if (!accept) {
        const { error: rejectErr } = await supabase
          .from('notifications')
          .update({ status: 'rejected' })
          .eq('id', notificationId);
        if (rejectErr) throw rejectErr;
        return { success: true };
      }
      let familyId = notif.payload?.family_id || null;
      if (!familyId) {
        const { data: fromProfile } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', notif.from_user_id)
          .single();
        familyId = fromProfile?.family_id || null;
      }
      if (!familyId) {
        const { data: newFam, error: famErr } = await supabase
          .from('families')
          .insert({})
          .select('id')
          .single();
        if (famErr) throw famErr;
        familyId = newFam.id;
      }
      const updates = [
        supabase.from('profiles').update({ family_id: familyId }).eq('id', notif.from_user_id),
        supabase.from('profiles').update({ family_id: familyId }).eq('id', notif.to_user_id),
        supabase.from('notifications').update({ status: 'accepted', payload: { family_id: familyId } }).eq('id', notificationId)
      ];
      const results = await Promise.all(updates);
      for (const r of results) {
        if (r.error) throw r.error;
      }
      return { success: true };
  }

  ,
  markNotificationRead: async (notificationId) => {
      const { data: notif, error: fetchErr } = await supabase
        .from('notifications')
        .select('id,type,status')
        .eq('id', notificationId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!notif || notif.type !== 'family_request') throw new Error('Solo se pueden marcar como leídas las invitaciones de grupo familiar');
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);
      if (error) throw error;
      return { success: true };
  }
};
