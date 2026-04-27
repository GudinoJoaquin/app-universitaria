import { supabase } from './supabase';

export const categoriesService = {
  /** Obtener todas las categorías */
  getAll: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    return { success: !error, data, error: error?.message };
  },

  /** Crear categoría */
  create: async ({ name, color }) => {
    const cleanName = String(name).trim();
    const cleanColor = String(color || '#64748B').trim();
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: cleanName, color: cleanColor })
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  /** Actualizar categoría */
  update: async (id, { name, color }) => {
    const cleanName = String(name).trim();
    const cleanColor = String(color).trim();
    const { data, error } = await supabase
      .from('categories')
      .update({ name: cleanName, color: cleanColor })
      .eq('id', id)
      .select()
      .single();
    return { success: !error, data, error: error?.message };
  },

  /** Eliminar categoría */
  delete: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return { success: !error, error: error?.message };
  },

  /** Asignar categorías a un evento (reemplaza las anteriores) */
  assignToEvent: async (eventId, categoryIds) => {
    // 1. Borrar asignaciones actuales
    await supabase.from('event_categories_junction').delete().eq('event_id', eventId);
    
    if (!categoryIds || categoryIds.length === 0) return { success: true };

    // 2. Insertar nuevas
    const rows = categoryIds.map(catId => ({ event_id: eventId, category_id: catId }));
    const { error } = await supabase.from('event_categories_junction').insert(rows);
    return { success: !error, error: error?.message };
  }
};
