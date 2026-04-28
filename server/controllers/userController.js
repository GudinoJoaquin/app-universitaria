// Controlador de usuarios — gestión de roles y perfiles
export const getUsers = async (req, res) => {
  try {
    const connection = req.db;
    const [users] = await connection.execute(`
      SELECT p.id, p.name, p.email, p.role, p.avatar_url,
             GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') as states
      FROM profiles p
      LEFT JOIN user_states us ON us.user_id = p.id
      LEFT JOIN states s ON s.id = us.state_id
      GROUP BY p.id, p.name, p.email, p.role, p.avatar_url
      ORDER BY p.name ASC
    `);
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error getUsers:", error);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};

// Jerarquía de roles (mayor peso = más poder)
const ROLE_HIERARCHY = {
  'Admin': 4,
  'Helper': 3,
  'Organizer': 2,
  'User': 1
};

export const updateUserRole = async (req, res) => {
  try {
    const connection = req.db;
    const { id } = req.params;
    const { role: newRole } = req.body;
    
    if (!ROLE_HIERARCHY[newRole]) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const callerId = req.user.id;
    const callerRole = req.user.role;
    // Normalizar a Capitalized para buscar en el mapa
    const normalizedCallerRole = callerRole ? (callerRole.charAt(0).toUpperCase() + callerRole.slice(1).toLowerCase()) : "";
    const callerPower = ROLE_HIERARCHY[normalizedCallerRole] || 0;

    // 1. Nadie puede cambiarse su propio ROL
    if (callerId === id) {
      return res.status(403).json({ error: "No puedes modificar tu propio nivel de acceso." });
    }

    // 2. Obtener datos del objetivo
    const [target] = await connection.execute("SELECT role FROM profiles WHERE id = ?", [id]);
    if (target.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    const targetCurrentRole = target[0].role;
    const normalizedTargetRole = targetCurrentRole ? (targetCurrentRole.charAt(0).toUpperCase() + targetCurrentRole.slice(1).toLowerCase()) : "";
    const targetPower = ROLE_HIERARCHY[normalizedTargetRole] || 0;
    
    // Normalizar nuevo rol
    const normalizedNewRole = newRole ? (newRole.charAt(0).toUpperCase() + newRole.slice(1).toLowerCase()) : "";
    const newRolePower = ROLE_HIERARCHY[normalizedNewRole] || 0;

    // 3. REGLA: El que llama debe tener un rango ESTRICTAMENTE MAYOR al del objetivo 
    // y al del nuevo rol que quiere asignar.
    if (callerPower <= targetPower) {
      return res.status(403).json({ 
        error: `Acceso Denegado: Como ${callerRole}, no tienes autoridad para modificar a un ${targetCurrentRole}.` 
      });
    }

    if (callerPower <= newRolePower) {
      return res.status(403).json({ 
        error: `Acceso Denegado: Como ${callerRole}, no tienes permiso para otorgar el rango de ${newRole}.` 
      });
    }

    // Si pasó los filtros, actualizar
    await connection.execute("UPDATE profiles SET role = ? WHERE id = ?", [newRole, id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updateUserRole:", error);
    res.status(500).json({ error: "Error actualizando rol" });
  }
};
