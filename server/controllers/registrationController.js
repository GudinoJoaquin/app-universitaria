// Controlador de inscripciones a eventos
export const registerToEvent = async (req, res) => {
  try {
    const connection = req.db;
    const { eventId } = req.body;
    const userId = req.user.id;
    if (!eventId) return res.status(400).json({ error: "eventId es requerido" });
    await connection.execute(
      "INSERT IGNORE INTO event_registrations (user_id, event_id) VALUES (?, ?)", [userId, eventId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al inscribirse al evento" });
  }
};

export const unregisterFromEvent = async (req, res) => {
  try {
    const connection = req.db;
    const { eventId } = req.params;
    const userId = req.user.id;
    await connection.execute(
      "DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?", [userId, eventId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al cancelar inscripción" });
  }
};

export const getMyRegistrations = async (req, res) => {
  try {
    const connection = req.db;
    const userId = req.user.id;
    const [rows] = await connection.execute(`
      SELECT e.id, e.title, e.description, e.date, e.location, er.created_at as registered_at
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      WHERE er.user_id = ?
      ORDER BY er.created_at DESC
    `, [userId]);
    res.json({ success: true, events: rows });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo inscripciones" });
  }
};

export const getEventParticipants = async (req, res) => {
  try {
    const connection = req.db;
    const { eventId } = req.params;
    const callerRole = req.user.role;

    // Solo Admin, Helper, Organizer (dueño del evento) pueden ver participantes
    if (!["Admin", "Helper"].includes(callerRole)) {
      const [event] = await connection.execute("SELECT created_by FROM events WHERE id = ?", [eventId]);
      if (event.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
      if (event[0].created_by !== req.user.id) {
        return res.status(403).json({ error: "Sin permisos para ver participantes" });
      }
    }

    const [rows] = await connection.execute(`
      SELECT p.id, p.name, p.email, p.role, er.created_at as registered_at
      FROM event_registrations er
      INNER JOIN profiles p ON p.id = er.user_id
      WHERE er.event_id = ?
      ORDER BY er.created_at ASC
    `, [eventId]);

    res.json({ success: true, participants: rows });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo participantes" });
  }
};
