//Maneja los eventos del CRUD
export const getEvents = async (req, res) => {
  try {
    const connection = req.db;
    const [events] = await connection.execute(`
      SELECT e.*, u.name as created_by_name 
      FROM events e 
      LEFT JOIN users u ON e.created_by = u.id 
      ORDER BY e.date DESC
    `);
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo eventos" });
  }
};

export const getEventById = async (req, res) => {
  try {
    const connection = req.db;
    const [events] = await connection.execute(
      `
      SELECT e.*, u.name as created_by_name 
      FROM events e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `,
      [req.params.id]
    );

    if (events.length === 0)
      return res.status(404).json({ error: "Evento no encontrado" });

    res.json({ success: true, event: events[0] });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo evento" });
  }
};

export const createEvent = async (req, res) => {
  try {
    const connection = req.db;
    const { title, description, date, location } = req.body;

    if (!title || !date || !location)
      return res
        .status(400)
        .json({ error: "Título, fecha y ubicación son requeridos" });

    const [result] = await connection.execute(
      "INSERT INTO events (title, description, date, location, created_by) VALUES (?, ?, ?, ?, ?)",
      [title, description, date, location, req.user.id]
    );

    const [newEvent] = await connection.execute(
      `
      SELECT e.*, u.name as created_by_name 
      FROM events e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Evento creado exitosamente",
      event: newEvent[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Error creando evento" });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const connection = req.db;
    const { title, description, date, location } = req.body;
    const eventId = req.params.id;

    const [events] = await connection.execute(
      "SELECT created_by FROM events WHERE id = ?",
      [eventId]
    );

    if (events.length === 0)
      return res.status(404).json({ error: "Evento no encontrado" });

    const event = events[0];
    if (req.user.role !== "admin" && req.user.id !== event.created_by)
      return res
        .status(403)
        .json({ error: "No tienes permisos para editar este evento" });

    await connection.execute(
      "UPDATE events SET title = ?, description = ?, date = ?, location = ? WHERE id = ?",
      [title, description, date, location, eventId]
    );

    const [updatedEvent] = await connection.execute(
      `
      SELECT e.*, u.name as created_by_name 
      FROM events e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `,
      [eventId]
    );

    res.json({
      success: true,
      message: "Evento actualizado exitosamente",
      event: updatedEvent[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Error actualizando evento" });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const connection = req.db;
    const eventId = req.params.id;

    const [events] = await connection.execute(
      "SELECT created_by FROM events WHERE id = ?",
      [eventId]
    );

    if (events.length === 0)
      return res.status(404).json({ error: "Evento no encontrado" });

    const event = events[0];
    if (req.user.role !== "admin" && req.user.id !== event.created_by)
      return res
        .status(403)
        .json({ error: "No tienes permisos para eliminar este evento" });

    await connection.execute("DELETE FROM events WHERE id = ?", [eventId]);

    res.json({ success: true, message: "Evento eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error eliminando evento" });
  }
};
