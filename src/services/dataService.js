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
    shared_with: dbEvent.shared_with || [],
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
     shared_with: frontendEvent.shared_with || []
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
            if (result1.error && result1.error.code !== '20') console.error("Error checking overdue events (1):", result1.error);
            if (result2.error && result2.error.code !== '20') console.error("Error checking overdue events (2):", result2.error);

            const events = [...(result1.data || []), ...(result2.data || [])];

            if (!events || events.length === 0) return;

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
                console.log(`Auto-maintained: ${toComplete.length} completed, ${toOverdue.length} overdue.`);
            }
        } catch (err) {
            // Ignore abort errors
            if (err.name !== 'AbortError') {
                console.error("Auto-maintenance error:", err);
            }
        }
    },

  getEventTypes: async (userId) => {
       const { data, error } = await supabase
         .from('event_types')
         .select('*')
         .eq('user_id', userId);
       
       if (error) throw error;

       // If no types exist for this user, seed default types
       if (data.length === 0 && DEFAULT_EVENT_TYPES.length > 0) {
           const typesToInsert = DEFAULT_EVENT_TYPES.map(t => ({
               user_id: userId,
               name: t.name,
               label: t.label,
               color_class: t.color_class,
               icon_bg_class: t.icon_bg_class,
               icon: t.icon,
               requires_end_time: t.requires_end_time,
               requires_location: t.requires_location,
               requires_url: t.requires_url,
               default_recurring: t.default_recurring
           }));

           const { data: newTypes, error: insertError } = await supabase
               .from('event_types')
               .upsert(typesToInsert, { onConflict: 'user_id, name', ignoreDuplicates: true })
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
        let query = supabase
            .from('events')
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .order('start_date', { ascending: true });

        // Apply Date Filters
        if (day && currentDate) {
            // Specific Day
            const targetDate = new Date(currentDate);
            targetDate.setDate(day);
            targetDate.setHours(0,0,0,0);
            
            const nextDay = new Date(targetDate);
            nextDay.setDate(day + 1);
            
            // Filter: start_date >= target AND start_date < nextDay
            query = query.gte('start_date', targetDate.toISOString())
                         .lt('start_date', nextDay.toISOString());
                         
        } else if (currentDate) {
            // Month View / Agenda View
            const targetDate = new Date(currentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let startFilterDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            
            // If viewing current month, only show from Today onwards (plus overdue)
            if (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear()) {
                startFilterDate = today;
            }
            
            // Fetch strict range for future events.
            // start_date >= startFilterDate OR status = 'overdue'
            query = query.or(`start_date.gte.${startFilterDate.toISOString()},status.eq.overdue`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map and Client-side Sort
        const events = data.map(mapEventFromSupabase);

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
                     if (status === 'overdue') return 2; // Keep overdue at bottom? Mock says 2 (Low Priority)
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
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .eq('id', eventId)
            .single();
            
        if (error) throw error;
        return mapEventFromSupabase(data);
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
            
        if (error) throw error;
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
        const { data, error } = await supabase
            .from('events')
            .update({ shared_with: targetIds })
            .eq('id', eventId)
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .single();
            
        if (error) throw error;
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
            
        if (error) throw error;
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
        // 1. Maintenance: Update past events
        await dataService.checkAndMarkOverdue(userId);

        const now = new Date().toISOString();
        
        try {
            // Run queries in parallel for better performance
            const queryCompleted = supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed');

            const queryUpcoming = supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .neq('status', 'cancelled')
                .gt('start_date', now);

            const [resultCompleted, resultUpcoming] = await Promise.all([queryCompleted, queryUpcoming]);

            // Filter out abort errors (code 20)
            if (resultCompleted.error && resultCompleted.error.code !== '20') throw resultCompleted.error;
            if (resultUpcoming.error && resultUpcoming.error.code !== '20') throw resultUpcoming.error;

            return {
              completedTasks: resultCompleted.count || 0,
              upcomingEvents: resultUpcoming.count || 0
            };
        } catch (err) {
            // Ignore abort errors
            if (err.name === 'AbortError' || err.code === '20') {
                return { completedTasks: 0, upcomingEvents: 0 };
            }
            throw err;
        }
  },

  getCompletedEvents: async (userId) => {
        let query = supabase
            .from('events')
            .select('*, event_types(*), profiles!events_user_id_fkey(*)')
            .eq('status', 'completed')
            .order('start_date', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
            
        if (error) throw error;
        return data.map(mapEventFromSupabase);
  },

  getFamilyMembers: async (userId) => {
      // 1. Get my family_id
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      if (!userData?.family_id) return [];

      // 2. Get members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', userData.family_id)
        .neq('id', userId);

      if (membersError) throw membersError;
      return members;
  },

  addFamilyMember: async (currentUserId, email) => {
      const { data, error } = await supabase.rpc('add_family_member', { target_email: email });
      if (error) throw error;
      return data;
  },

  removeFamilyMember: async (currentUserId, targetMemberId) => {
      const { data, error } = await supabase.rpc('remove_family_member', { target_user_id: targetMemberId });
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
      const { data, error } = await supabase.rpc('send_family_request_rpc', { target_email: targetEmail });
      if (error) throw error;
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
  },

  deleteUser: async (userId) => {
        console.log('Attempting to delete user from Supabase:', userId);
        
        // 1. Delete Events
        const { error: eventsError } = await supabase
            .from('events')
            .delete()
            .eq('user_id', userId);
        if (eventsError) throw eventsError;

        // 2. Delete Event Types
        const { error: typesError } = await supabase
            .from('event_types')
            .delete()
            .eq('user_id', userId);
        if (typesError) throw typesError;

        // 3. Delete Notifications
        await supabase.from('notifications').delete().eq('from_user_id', userId);
        await supabase.from('notifications').delete().eq('to_user_id', userId);

        // 4. Delete Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (profileError) throw profileError;
        
        return { success: true };
  }
};
