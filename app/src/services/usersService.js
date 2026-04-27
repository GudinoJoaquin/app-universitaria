import { supabase } from './supabase';

/** Obtener todos los usuarios con sus roles y estados */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, name, email, role, avatar_url,
        user_states(state_id, states(id, name, color))
      `)
      .order('name');
    if (error) throw error;

    // Normalizar: aplanar los estados
    const users = data.map(u => ({
      ...u,
      states: u.user_states?.map(us => us.states) ?? [],
      user_states: undefined,
    }));

    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/** Obtener un usuario con sus estados */
export const getUserWithStates = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, name, email, role, avatar_url,
        user_states(state_id, states(id, name, color, is_default))
      `)
      .eq('id', userId)
      .single();
    if (error) throw error;
    return {
      success: true,
      data: {
        ...data,
        states: data.user_states?.map(us => us.states) ?? [],
        user_states: undefined,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cambiar el rol de un usuario.
 * Validaciones de permisos se hacen en el front según el rol del caller.
 */
export const updateUserRole = async (userId, newRole) => {
  try {
    const validRoles = ['Admin', 'Helper', 'Organizer', 'User'];
    if (!validRoles.includes(newRole)) throw new Error('Rol inválido');

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
