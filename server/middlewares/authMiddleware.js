import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. Token no proporcionado" });
  }

  // El token normalmente viene como: "Bearer <token>"
  const token = authHeader.replace("Bearer ", "").trim();

  try {
    // Usa la clave del entorno, no una fija
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Guarda los datos decodificados en la request
    next();
  } catch (error) {
    console.error("Error en auth middleware:", error);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};
