import { supabase } from './supabase';

// ─── Estados (CRUD) ──────────────────────────────────────────────────────────

export const getAllStates = async () => {
  try {
    const { data, error } = await supabase
      .from('states')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDefaultState = async () => {
  try {
    const { data, error } = await supabase
      .from('states')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createState = async (name, color) => {
  try {
    if (!name || !color) throw new Error('Nombre y color son requeridos');
    const { data, error } = await supabase
      .from('states')
      .insert([{ name, color, is_default: false }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateState = async (stateId, { name, color, is_default }) => {
  try {
    // No se puede desactivar el estado default directamente
    if (is_default === false) {
      const { data: cur } = await supabase.from('states').select('is_default').eq('id', stateId).single();
      if (cur?.is_default) throw new Error('No puedes desactivar el estado por defecto. Primero asigna otro.');
    }
    // Si se pone como default, quitar el anterior
    if (is_default === true) {
      await supabase.from('states').update({ is_default: false }).eq('is_default', true).neq('id', stateId);
    }
    const { data, error } = await supabase.from('states').update({ name, color, is_default }).eq('id', stateId).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteState = async (stateId) => {
  try {
    const { data: st } = await supabase.from('states').select('is_default, name').eq('id', stateId).single();
    if (st?.is_default) throw new Error('No puedes eliminar el estado por defecto.');

    // Verificar si hay usuarios con ese estado en user_states
    const { data: usersWithState } = await supabase.from('user_states').select('id').eq('state_id', stateId);
    if (usersWithState?.length > 0) {
      throw new Error(`No puedes eliminar "${st.name}" porque ${usersWithState.length} usuario(s) lo tienen asignado.`);
    }

    const { error } = await supabase.from('states').delete().eq('id', stateId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const setDefaultState = async (stateId) => {
  try {
    await supabase.from('states').update({ is_default: false }).eq('is_default', true).neq('id', stateId);
    const { error } = await supabase.from('states').update({ is_default: true }).eq('id', stateId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ─── Asignación de estados a usuarios (user_states) ──────────────────────────

/** Obtiene todos los estados de un usuario */
export const getUserStates = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_states')
      .select('state_id, states(id, name, color, is_default)')
      .eq('user_id', userId);
    if (error) throw error;
    return { success: true, data: data.map(r => r.states) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Asigna un estado a un usuario (insert en user_states) */
export const assignStateToUser = async (userId, stateId) => {
  try {
    if (!userId || !stateId) throw new Error('Usuario y estado son requeridos');
    const { error } = await supabase
      .from('user_states')
      .insert({ user_id: userId, state_id: stateId });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Quita un estado a un usuario */
export const removeStateFromUser = async (userId, stateId) => {
  try {
    if (!userId || !stateId) throw new Error('Usuario y estado son requeridos');
    const { error } = await supabase
      .from('user_states')
      .delete()
      .eq('user_id', userId)
      .eq('state_id', stateId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Obtiene usuarios que tienen un estado específico */
export const getUsersByState = async (stateId) => {
  try {
    const { data, error } = await supabase
      .from('user_states')
      .select('user_id, profiles(id, name, email, role)')
      .eq('state_id', stateId);
    if (error) throw error;
    return { success: true, data: data.map(r => r.profiles) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
