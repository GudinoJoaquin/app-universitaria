// Estados Controller - CRUD de estados + gestión via user_states

export const getStates = async (req, res) => {
  try {
    const connection = req.db;
    const [states] = await connection.execute(
      "SELECT id, name, color, is_default FROM states ORDER BY is_default DESC, name ASC"
    );
    res.json({ success: true, states });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo estados" });
  }
};

export const getDefaultState = async (req, res) => {
  try {
    const connection = req.db;
    const [states] = await connection.execute(
      "SELECT id, name, color FROM states WHERE is_default = TRUE LIMIT 1"
    );
    if (states.length === 0) return res.status(404).json({ error: "No hay estado por defecto" });
    res.json({ success: true, state: states[0] });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo estado por defecto" });
  }
};

export const createState = async (req, res) => {
  try {
    const connection = req.db;
    const { name, color } = req.body;
    if (!name || !color) return res.status(400).json({ error: "Nombre y color son requeridos" });
    const [result] = await connection.execute(
      "INSERT INTO states (name, color, is_default) VALUES (?, ?, FALSE)", [name, color]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Este estado ya existe" });
    res.status(500).json({ error: "Error creando estado" });
  }
};

export const updateState = async (req, res) => {
  try {
    const connection = req.db;
    const { id } = req.params;
    const { name, color, is_default } = req.body;
    if (is_default === true) {
      await connection.execute("UPDATE states SET is_default = FALSE WHERE is_default = TRUE AND id != ?", [id]);
    }
    await connection.execute(
      "UPDATE states SET name = ?, color = ?, is_default = ? WHERE id = ?",
      [name, color, is_default || false, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error actualizando estado" });
  }
};

export const deleteState = async (req, res) => {
  try {
    const connection = req.db;
    const { id } = req.params;
    const [state] = await connection.execute("SELECT is_default, name FROM states WHERE id = ?", [id]);
    if (state.length === 0) return res.status(404).json({ error: "Estado no encontrado" });
    if (state[0].is_default) return res.status(400).json({ error: "No puedes eliminar el estado por defecto." });

    // Verificar users con este estado en user_states
    const [users] = await connection.execute("SELECT COUNT(*) as count FROM user_states WHERE state_id = ?", [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ error: `No puedes eliminar "${state[0].name}" porque ${users[0].count} usuario(s) lo tienen asignado.` });
    }
    await connection.execute("DELETE FROM states WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error eliminando estado" });
  }
};

export const setDefaultState = async (req, res) => {
  try {
    const connection = req.db;
    const { id } = req.params;
    await connection.execute("UPDATE states SET is_default = FALSE WHERE is_default = TRUE AND id != ?", [id]);
    await connection.execute("UPDATE states SET is_default = TRUE WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error estableciendo estado por defecto" });
  }
};

// Asignar estado a usuario (INSERT en user_states)
export const assignStateToUser = async (req, res) => {
  try {
    const connection = req.db;
    const { userId, stateId } = req.body;
    if (!userId || !stateId) return res.status(400).json({ error: "userId y stateId son requeridos" });
    await connection.execute(
      "INSERT IGNORE INTO user_states (user_id, state_id) VALUES (?, ?)", [userId, stateId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error asignando estado" });
  }
};

// Quitar estado a usuario (DELETE en user_states)
export const removeStateFromUser = async (req, res) => {
  try {
    const connection = req.db;
    const { userId, stateId } = req.body;
    if (!userId || !stateId) return res.status(400).json({ error: "userId y stateId son requeridos" });
    await connection.execute(
      "DELETE FROM user_states WHERE user_id = ? AND state_id = ?", [userId, stateId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error quitando estado" });
  }
};

// Obtener usuarios por estado (via user_states)
export const getUsersByState = async (req, res) => {
  try {
    const connection = req.db;
    const { stateId } = req.params;
    const [users] = await connection.execute(
      `SELECT p.id, p.name, p.email, p.role 
       FROM profiles p
       INNER JOIN user_states us ON us.user_id = p.id
       WHERE us.state_id = ?`,
      [stateId]
    );
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo usuarios por estado" });
  }
};
