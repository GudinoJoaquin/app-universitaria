import { supabase } from "./supabase";

export const eventsService = {
  getEvents: async () => {
    try {
      console.log(" Obteniendo eventos de Supabase...");
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:created_by (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Formatear para que coincida con el frontend actual
      const formattedEvents = data.map(event => ({
        ...event,
        created_by_name: event.profiles?.name || 'Desconocido'
      }));
      
      return { success: true, events: formattedEvents };
    } catch (error) {
      console.log(" Error obteniendo eventos:", error);
      throw error;
    }
  },

  getEventById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:created_by (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const event = {
        ...data,
        created_by_name: data.profiles?.name || 'Desconocido'
      };
      
      return { success: true, event };
    } catch (error) {
      console.log(" Error obteniendo evento:", error);
      throw error;
    }
  },

  createEvent: async (eventData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from('events')
        .insert([
          { ...eventData, created_by: userData.user.id }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, event: data };
    } catch (error) {
      console.log(" Error creando evento:", error);
      throw error;
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, event: data };
    } catch (error) {
      console.log(" Error actualizando evento:", error);
      throw error;
    }
  },

  deleteEvent: async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.log(" Error eliminando evento:", error);
      throw error;
    }
  },
};
