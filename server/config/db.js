import mysql from "mysql2/promise";

export const createConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "universidad",
    });
    console.log("Conectado a MySQL");
    return connection;
  } catch (error) {
    console.error("Error conectando a MySQL:", error.message);
    throw error;
  }
};
