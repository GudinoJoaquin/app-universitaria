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

export const updateUserRole = async (req, res) => {
  try {
    const connection = req.db;
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ["Admin", "Helper", "Organizer", "User"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const callerRole = req.user.role;

    // Helper solo puede cambiar User <-> Organizer
    if (callerRole === "Helper") {
      const [target] = await connection.execute("SELECT role FROM profiles WHERE id = ?", [id]);
      if (target.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

      const targetRole = target[0].role;
      const allowed = ["User", "Organizer"];
      if (!allowed.includes(targetRole) || !allowed.includes(role)) {
        return res.status(403).json({ error: "Helper solo puede cambiar entre User y Organizer" });
      }

      // Helper no puede modificar su propio rol
      if (req.user.id === id) {
        return res.status(403).json({ error: "No puedes cambiar tu propio rol" });
      }
    }

    await connection.execute("UPDATE profiles SET role = ? WHERE id = ?", [role, id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updateUserRole:", error);
    res.status(500).json({ error: "Error actualizando rol" });
  }
};
