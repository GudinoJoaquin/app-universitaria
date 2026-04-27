import { supabase } from './supabase';

/** Inscribirse a un evento */
export const registerToEvent = async (userId, eventId) => {
  try {
    const { error } = await supabase
      .from('event_registrations')
      .insert({ user_id: userId, event_id: eventId });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Desuscribirse de un evento */
export const unregisterFromEvent = async (userId, eventId) => {
  try {
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Obtener todos los eventos a los que se inscribió el usuario */
export const getMyRegistrations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('event_id, created_at, events(id, title, description, date, location, created_by)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data.map(r => ({ ...r.events, registered_at: r.created_at })) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Verificar si el usuario está inscrito en un evento */
export const isRegistered = async (userId, eventId) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) throw error;
    return { success: true, registered: !!data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Obtener participantes de un evento (para Organizer/Admin/Helper) */
export const getEventParticipants = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('user_id, created_at, profiles(id, name, email, role, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { success: true, data: data.map(r => ({ ...r.profiles, registered_at: r.created_at })) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Contar inscritos en un evento */
export const getRegistrationCount = async (eventId) => {
  try {
    const { count, error } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (error) throw error;
    return { success: true, count: count ?? 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
