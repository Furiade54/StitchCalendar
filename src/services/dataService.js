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
      username: owner.username
    } : null
  };
};

// Helper to map Frontend Model to Supabase Event
const mapEventToSupabase = (frontendEvent, userId) => {
   const sharedWith = frontendEvent.shared_with || [];
   return {
     title: frontendEvent.title,
     description: frontendEvent.description,
     start_date: frontendEvent.startDate,
     end_date: frontendEvent.endDate,
     all_day: frontendEvent.allDay,
     status: STATUS_MAP_TO_DB[frontendEvent.status] || 'scheduled',
     location: frontendEvent.location,
     user_id: userId, // Ensure ownership
     event_type_id: frontendEvent.event_type_id,
     is_family_shared: sharedWith.includes('family')
   };
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
                     // Changed to update_my_event_status in loop as batch not implemented yet in new schema
                     // or implement batch_update_my_status
                     // For now, let's stick to loop of single updates to ensure per-user status
                     await Promise.all(toCompleteIds.map(id => 
                        this.updateEventStatus(id, 'completed', userId)
                     ));
                }
                if (toOverdueIds.length > 0) {
                     await Promise.all(toOverdueIds.map(id => 
                        this.updateEventStatus(id, 'overdue', userId)
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
       const { data: sessionData } = await supabase.auth.getSession();
       const currentAuthId = sessionData?.session?.user?.id;
       
       if (currentAuthId && userId && currentAuthId !== userId) {
           console.warn(`[getEventTypes] Mismatch: auth.uid=${currentAuthId}, param.userId=${userId}`);
       }

       const { data, error } = await supabase
         .from('event_types')
         .select('*')
         .eq('user_id', userId);
       
       if (error) throw error;

       // If no types exist for this user, seed default types
       // SECURITY: Only seed if the requested userId matches the authenticated user
       if (data.length === 0 && DEFAULT_EVENT_TYPES.length > 0 && currentAuthId === userId) {
           console.log(`[getEventTypes] Seeding default types for user ${userId}`);
           const typesToInsert = DEFAULT_EVENT_TYPES.map(t => ({
               user_id: userId,
               name: t.name,
               // label removed as it does not exist in DB
               color_class: t.color_class,
               icon_bg_class: t.icon_bg_class,
               icon: t.icon,
               requires_end_time: t.requires_end_time,
               requires_location: t.requires_location,
               requires_url: t.requires_url,
               default_recurring: t.default_recurring
           }));

          // Insertar tipos por defecto solo para el usuario autenticado
          const { data: newTypes, error: insertError } = await supabase
              .from('event_types')
              .insert(typesToInsert)
              .select();

           if (insertError) {
               console.error("Error seeding default event types:", insertError);
               // Don't throw, just return empty list to avoid blocking UI
               return [];
           }
           
           return newTypes.map(t => ({
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
       }
       
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

  createEventType: async (newType, userId) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentAuthId = sessionData?.session?.user?.id;
        
        if (currentAuthId && userId && currentAuthId !== userId) {
             console.error(`[createEventType] Security mismatch: auth.uid=${currentAuthId} vs param.userId=${userId}`);
             throw new Error('Security violation: Cannot create event types for another user.');
        }

        const dbType = {
            name: newType.name,
            color_class: newType.colorClass || newType.color, // handle both
            icon_bg_class: newType.iconBgClass,
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
        const { data: sessionData } = await supabase.auth.getSession();
        const currentAuthId = sessionData?.session?.user?.id;
        
        if (currentAuthId && userId && currentAuthId !== userId) {
            console.error(`[updateEventType] Security mismatch: auth.uid=${currentAuthId} vs param.userId=${userId}`);
            throw new Error('Security violation: Cannot update event types for another user.');
        }

        const dbUpdates = {};
        if (updatedType.name) dbUpdates.name = updatedType.name;
        if (updatedType.colorClass || updatedType.color) dbUpdates.color_class = updatedType.colorClass || updatedType.color;
        if (updatedType.iconBgClass) dbUpdates.icon_bg_class = updatedType.iconBgClass;
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

  getSchedule: async (day, currentDate, userId) => {
        let events = [];
        
        try {
             // 1. Try fetching via RPC (New Per-User Status Logic)
             let startRange = null;
             let endRange = null;
             
             if (day && currentDate) {
                 const targetDate = new Date(currentDate);
                 targetDate.setDate(day);
                 targetDate.setHours(0,0,0,0);
                 startRange = targetDate.toISOString();
                 
                 const nextDay = new Date(targetDate);
                 nextDay.setDate(day + 1);
                 endRange = nextDay.toISOString();
             } else if (currentDate) {
                 const targetDate = new Date(currentDate);
                 const today = new Date();
                 today.setHours(0, 0, 0, 0);
                 
                 let startFilterDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
                 if (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) {
                     startFilterDate = today;
                 }
                 startRange = startFilterDate.toISOString();
             }
             
             const { data: rpcData, error: rpcError } = await supabase.rpc('get_events_with_status_json', {
                 target_user_id: userId,
                 filter_type: 'schedule',
                 start_range: startRange,
                 end_range: endRange
             });
             
             if (rpcError) throw rpcError;
             
             // Map JSON result to model
             events = rpcData.map(mapEventFromSupabase);
             
        } catch (err) {
            console.warn("RPC get_events_with_status_json failed, fallback to legacy query:", err.message);
            // Fallback: Legacy Logic (Shared Status)
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
            events = data.map(mapEventFromSupabase);
        }

        // Apply Client-side Priority Sort (same as Mock)
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

  getEventById: async (eventId, userId) => {
        const { data, error } = await supabase
            .from('events')
            .select('*, event_types(*), profiles!events_user_id_fkey(*), event_shares(user_id)')
            .eq('id', eventId)
            .single();
            
        if (error) throw error;
        return mapEventFromSupabase(data);
  },

  updateEventStatus: async (eventId, newStatus, userId) => {
      // Use RPC to update per-user status securely
      try {
          const { error } = await supabase.rpc('update_my_event_status', {
              target_event_id: eventId,
              new_status: newStatus
          });
          
          if (error) throw error;
          
          // Return optimistic response or re-fetch?
          // For now, return success
          return { success: true, status: newStatus };
      } catch (err) {
          console.warn("RPC update_my_event_status failed, fallback to direct update (legacy owner mode):", err.message);
          // Fallback: If I am the owner, update the global status
          const { data, error } = await supabase
            .from('events')
            .update({ status: newStatus })
            .eq('id', eventId)
            .eq('user_id', userId) // Security: only owner can update global status in legacy mode
            .select()
            .single();
            
          if (error) throw error;
          return { success: true, status: data.status };
      }
  },

  updateEvent: async (updatedEvent, userId, requestingUserId = null) => {
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

  deleteEvent: async (eventId, userId, requestingUserId = null) => {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);
            
        if (error) throw error;
        return { success: true };
  },

  shareEvent: async (eventId, targetIds, userId) => {
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

  // Check if targetUser has allowed editorId to edit their calendar
  canEdit: async (targetUserId, editorId) => {
    if (targetUserId === editorId) return true;
    
    // Fetch target user's profile to check allowed_editors
    const { data, error } = await supabase
        .from('profiles')
        .select('allowed_editors')
        .eq('id', targetUserId)
        .single();
        
    if (error || !data) return false;
    
    return data.allowed_editors && data.allowed_editors.includes(editorId);
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

  getCalendarDays: async (year, month, userId) => {
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
        
        const hydratedEvents = monthEvents.map(mapEventFromSupabase);

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
                    supabase.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['completed', 'overdue']),
                    supabase.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'cancelled').neq('status', 'completed').neq('status', 'overdue').gte('start_date', todayIso)
                ]);
                return {
                    completedTasks: resultCompleted.count || 0,
                    upcomingEvents: resultUpcoming.count || 0
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
            events = data.map(mapEventFromSupabase);
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

  addFamilyMember: async (currentUserId, email) => {
      // DEPRECATED: Use sendFamilyRequest instead.
      // This function now redirects to sendFamilyRequest internally via SQL or JS
      return dataService.sendFamilyRequest(currentUserId, email);
  },

  removeFamilyMember: async (currentUserId, targetMemberId) => {
      // RPC ensures secure removal
      const { data, error } = await supabase.rpc('remove_family_member', { target_user_id: targetMemberId });
      if (error) throw error;
      return { success: true };
  },

  leaveFamilyGroup: async (userId) => {
      // RPC handles self-removal cleanly
      const { error } = await supabase.rpc('remove_family_member', { target_user_id: userId });
      if (error) throw error;
      return { success: true };
  },

  sendFamilyRequest: async (currentUserId, targetEmail) => {
      const { data, error } = await supabase.rpc('send_family_request_rpc', { target_email: targetEmail });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      return data;
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
        .eq('status', 'pending')
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
      const { data, error } = await supabase.rpc('respond_to_family_request', { 
        notification_id: notificationId, 
        accept: accept 
      });
      if (error) throw error;
      return { success: true };
  }
};
