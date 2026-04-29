import { supabase } from "../../shared/services/supabase";
import { Platform } from "react-native";
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export const eventsService = {
  getEvents: async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:created_by (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      return { success: true, events: data.map(e => ({ ...e, created_by_name: e.profiles?.name || 'Desconocido' })) };
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }
  },

  createEvent: async (eventData) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, event: data };
    } catch (error) {
      console.log("Error creando:", error);
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }
  },

  deleteEvent: async (id) => {
    try {
      await supabase.from("event_categories_junction").delete().eq("event_id", id);
      await supabase.from("event_registrations").delete().eq("event_id", id);
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  uploadImage: async (uri) => {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      // Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convertir base64 a ArrayBuffer (que Supabase entiende perfectamente)
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.log("Error subiendo imagen:", error);
      return { success: false, error: error.message };
    }
  }
};

