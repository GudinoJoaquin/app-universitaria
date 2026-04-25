import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const connection = req.db;
    const { name, email, password, role = "student" } = req.body;

    console.log(" Intentando registro:", { name, email, role });

    // Validaciones
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Todos los campos son requeridos",
      });
    }

    // Validar que solo estudiantes puedan registrarse
    if (role !== "student") {
      return res.status(400).json({
        success: false,
        error: "El registro está disponible solo para estudiantes",
      });
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: "El usuario ya existe",
      });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario nuevo
    const [result] = await connection.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
    );

    // Generar token
    const token = jwt.sign(
      { id: result.insertId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    );

    console.log(" Usuario registrado exitosamente:", result.insertId);

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
};

export const login = async (req, res) => {
  try {
    const connection = req.db;
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email y contraseña requeridos",
      });
    }

    // Buscar usuario
    const [users] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      });
    }

    const user = users[0];

    // Verificar contraseña
    const validPass = await bcrypt.compare(password, user.password);

    if (!validPass) {
      console.log(" Contraseña incorrecta");
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      });
    }

    // VERIFICACIÓN CRÍTICA: JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error(" ERROR: JWT_SECRET no está definido");
      return res.status(500).json({
        success: false,
        error: "Error de configuración del servidor - JWT",
      });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(" Error en login:", error);

    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
};
export const getProfile = async (req, res) => {
  try {
    const connection = req.db;
    const [users] = await connection.execute(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("Error en perfil:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
