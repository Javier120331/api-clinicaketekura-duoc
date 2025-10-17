require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on("connect", () => {
  console.log("✅ Conectado a la base de datos PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Error inesperado en el pool de conexiones:", err);
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "OK",
      timestamp: result.rows[0].now,
      database: "Connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  }
});

// Execute stored procedure endpoint
app.post("/api/execute-procedure", async (req, res) => {
  const { param1, param2 } = req.body;

  // Validar que los parámetros existan
  if (!param1 || !param2) {
    return res.status(400).json({
      success: false,
      error: "Ambos parámetros son requeridos",
    });
  }

  let client;
  try {
    client = await pool.connect();

    // Ejemplo: Llamar a un procedimiento almacenado
    // Ajusta el nombre del procedimiento y los parámetros según tu caso
    // Para PostgreSQL, usa CALL para procedimientos o SELECT para funciones

    // Opción 1: Si es un procedimiento (PROCEDURE)
    // await client.query('CALL mi_procedimiento($1, $2)', [param1, param2]);

    // Opción 2: Si es una función que retorna valores (FUNCTION)
    const result = await client.query("SELECT * FROM mi_funcion($1, $2)", [
      param1,
      param2,
    ]);

    res.json({
      success: true,
      message: "Procedimiento ejecutado exitosamente",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error ejecutando procedimiento:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.detail || "Error al ejecutar el procedimiento",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM recibido. Cerrando servidor...");
  pool.end(() => {
    console.log("Pool de conexiones cerrado");
    process.exit(0);
  });
});
