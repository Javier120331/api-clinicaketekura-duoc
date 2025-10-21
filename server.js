require("dotenv").config();
const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());

// Configurar oracledb para usar el wallet
const walletLocation = process.env.TNS_ADMIN;
const tnsPath = path.join(walletLocation, 'tnsnames.ora');
const sqlnetPath = path.join(walletLocation, 'sqlnet.ora');

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔍 VERIFICANDO CONFIGURACIÓN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📁 Wallet (TNS_ADMIN):", process.env.TNS_ADMIN);
console.log("🔗 Service Name:", process.env.DB_SERVICE_NAME);
console.log("👤 User:", process.env.DB_USER);
console.log("🔑 Wallet Password:", process.env.WALLET_PASSWORD ? "***" : "NO DEFINIDA");

// Verificar que el directorio existe
try {
  const files = fs.readdirSync(walletLocation);
  console.log("\n📂 Archivos en wallet:");
  files.forEach(file => console.log(`  - ${file}`));
} catch (e) {
  console.error("❌ Error leyendo directorio wallet:", e.message);
}

try {
  const tnsContent = fs.readFileSync(tnsPath, 'utf8');
  console.log("\n📄 Contenido de tnsnames.ora (primeras líneas):");
  const tnsLines = tnsContent.split('\n').slice(0, 5);
  tnsLines.forEach(line => console.log(`  ${line}`));
  
  // Verificar que el servicio existe
  if (tnsContent.includes(process.env.DB_SERVICE_NAME)) {
    console.log(`✅ Servicio '${process.env.DB_SERVICE_NAME}' encontrado en tnsnames.ora`);
  } else {
    console.log(`❌ Servicio '${process.env.DB_SERVICE_NAME}' NO encontrado en tnsnames.ora`);
  }
  
  const sqlnetContent = fs.readFileSync(sqlnetPath, 'utf8');
  console.log("\n📄 Contenido de sqlnet.ora:");
  console.log(sqlnetContent);
} catch (e) {
  console.error("❌ Error leyendo archivos:", e.message);
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Variable para estado de conexión
let isConnected = false;

// Función para obtener conexión
async function getConnection() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_SERVICE_NAME,
    walletLocation: process.env.TNS_ADMIN,
    walletPassword: process.env.WALLET_PASSWORD || ""
  };
  
  console.log("🔧 Configuración de conexión:");
  console.log("  - User:", config.user);
  console.log("  - ConnectString:", config.connectString);
  console.log("  - WalletLocation:", config.walletLocation);
  console.log("  - WalletPassword:", config.walletPassword ? "***" : "(vacío)");
  
  return await oracledb.getConnection(config);
}

// Función de inicialización
async function initialize() {
  try {
    console.log("\n🔄 Intentando conexión a Oracle Database...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const connection = await getConnection();
    console.log("✅ Conexión exitosa!");
    
    // Probar consulta
    const result = await connection.execute(
      `SELECT USER, SYSTIMESTAMP FROM DUAL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log("✅ Usuario conectado:", result.rows[0].USER);
    console.log("✅ Timestamp:", result.rows[0].SYSTIMESTAMP);
    
    await connection.close();
    isConnected = true;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CONEXIÓN A ORACLE EXITOSA");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR AL CONECTAR:");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Mensaje:", err.message);
    console.error("Código:", err.code);
    if (err.errorNum) console.error("Error Num:", err.errorNum);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Diagnóstico adicional
    console.error("\n🔍 DIAGNÓSTICO:");
    console.error("1. Verifica que el servicio sea correcto en tnsnames.ora");
    console.error("2. Verifica que la contraseña de BD sea correcta");
    console.error("3. Verifica que el wallet esté descomprimido correctamente");
    console.error("4. Intenta usar 'fd2i7vwg959rli39_high' en lugar de '_medium'");
    
    isConnected = false;
  }
}

// Health check
app.get("/api/health", async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      status: "ERROR",
      message: "No hay conexión a la base de datos",
      database: "Disconnected"
    });
  }

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT SYSTIMESTAMP FROM DUAL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({
      status: "OK",
      timestamp: result.rows[0].SYSTIMESTAMP,
      database: "Connected to Oracle",
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Obtener todos los pacientes
app.get("/api/pacientes", async (req, res) => {
  if (!isConnected) {
    console.error("❌ Intento de consulta sin conexión a BD");
    return res.status(503).json({
      error: "No hay conexión a la base de datos",
      details: "El servidor no pudo conectarse a Oracle Database. Revisa los logs del servidor."
    });
  }

  let connection;
  try {
    console.log("📋 Obteniendo pacientes...");
    connection = await getConnection();
    console.log("✅ Conexión obtenida");
    
    const result = await connection.execute(
      `SELECT pac_run, dv_run, pnombre, snombre, apaterno, amaterno, 
              fecha_nacimiento, telefono, sal_id 
       FROM PACIENTE 
       ORDER BY pac_run`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(`✅ Se obtuvieron ${result.rows.length} pacientes`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener pacientes:", error);
    res.status(500).json({
      error: "Error al obtener pacientes",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Obtener un paciente específico
app.get("/api/pacientes/:run", async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      error: "No hay conexión a la base de datos"
    });
  }

  let connection;
  try {
    connection = await getConnection();
    
    const result = await connection.execute(
      `SELECT pac_run, dv_run, pnombre, snombre, apaterno, amaterno, 
              fecha_nacimiento, telefono, sal_id 
       FROM PACIENTE 
       WHERE pac_run = :run`,
      [req.params.run],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener paciente:", error);
    res.status(500).json({
      error: "Error al obtener paciente",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Eliminar paciente
app.delete("/api/pacientes/:run", async (req, res) => {
  if (!isConnected) {
    return res.status(503).json({
      error: "No hay conexión a la base de datos"
    });
  }

  let connection;
  try {
    connection = await getConnection();
    
    const result = await connection.execute(
      `DELETE FROM PACIENTE WHERE pac_run = :run`,
      [req.params.run],
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json({ 
      success: true, 
      message: "Paciente eliminado exitosamente" 
    });
  } catch (error) {
    console.error("Error al eliminar paciente:", error);
    res.status(500).json({
      error: "Error al eliminar paciente",
      details: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Endpoint para calcular copago
// Endpoint para calcular copago (COMPLETO Y CORREGIDO)
// ... (Línea 295 aprox)
// Endpoint para calcular copago (ESTA ES LA VERSIÓN CORRECTA)
app.get("/api/copago/:idAtencion", async (req, res) => {
  
  const idAtencion = req.params.idAtencion;
  let connection;

  try {
    // 1. Se conecta (usando tu función 'getConnection' ya corregida)
    console.log(`GET /api/copago/${idAtencion} - Obteniendo conexión...`);
    connection = await getConnection();

    // 2. Prepara la llamada a la FUNCIÓN DEL PAQUETE
    console.log(`GET /api/copago/${idAtencion} - Llamando a pkg_calculos_clinica.fn_calcular_copago...`);
    const sql = `
      BEGIN
        :ret := pkg_calculos_clinica.fn_calcular_copago(:id);
      END;`;

    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, // Variable de Salida
      id: idAtencion                                          // Variable de Entrada
    };

    // 3. Ejecuta la función
    const result = await connection.execute(sql, binds);

    // 4. Obtiene el valor de retorno
    const copago = result.outBinds.ret;

    // 5. DEVUELVE EL ÉXITO AL FRONTEND
    console.log(`GET /api/copago/${idAtencion} - Éxito. Copago: ${copago}`);
    res.json({
      atencion_id: idAtencion,
      copago_calculado: copago,
      mensaje: "Cálculo exitoso"
    });

  } catch (error) {
    // 6. MANEJA ERRORES
    // (La función en PL/SQL ya guardó el error en la tabla 'log_errores_proceso')
    console.error(`Error en GET /api/copago/${idAtencion}:`, error.message);
    res.status(500).json({
      error: "Error al calcular el copago.",
      details: "La atención no existe o tiene datos inválidos. Revise el log de la BD."
    });
  } finally {
    // 7. CIERRA LA CONEXIÓN
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar la conexión:", err);
      }
    }
  }
});

// Endpoint para calcular monto final (usa pkg_gestion_atenciones.fn_calcular_monto_final)
app.get("/api/monto-final/:idAtencion", async (req, res) => {
  const idAtencion = req.params.idAtencion;
  let connection;

  try {
    console.log(`GET /api/monto-final/${idAtencion} - Obteniendo conexi\u00f3n...`);
    connection = await getConnection();

    const sql = `
      BEGIN
        :ret := pkg_gestion_atenciones.fn_calcular_monto_final(:id);
      END;`;

    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      id: idAtencion
    };

    const result = await connection.execute(sql, binds);
    const montoFinal = result.outBinds.ret;

    console.log(`GET /api/monto-final/${idAtencion} - \u00c9xito. Monto final: ${montoFinal}`);
    res.json({ atencion_id: idAtencion, monto_final: montoFinal, mensaje: "C\u00e1lculo exitoso" });

  } catch (error) {
    console.error(`Error en GET /api/monto-final/${idAtencion}:`, error.message);
    res.status(500).json({ error: "Error al calcular monto final.", details: error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error("Error al cerrar la conexi\u00f3n:", err); }
    }
  }
});

// --- ENDPOINT EJERCICIO 1 (VERSIÓN REACT) ---
// (Este es para el botón "Generar Reporte" con parámetro)

app.get("/api/reporte-costosas", async (req, res) => {
  if (!isConnected) return res.status(503).json({ error: "Base de datos no conectada" });

  // 1. Obtenemos el parámetro "monto" de la URL (Query Param)
  // Ejemplo: /api/reporte-costosas?monto=70000
  // Si no se envía ?monto=, usa 0 como default.
  const montoMinimo = req.query.monto || 0;
  
  let connection;
  let cursor; // Variable para guardar el cursor

  try {
    console.log(`GET /api/reporte-costosas?monto=${montoMinimo} - Generando reporte...`);
    connection = await getConnection();

    // 2. Prepara la llamada a la FUNCIÓN que devuelve un CURSOR
    const sql = `
      BEGIN
        :ret := pkg_reportes_clinica.fn_get_reporte_costosas(:monto);
      END;`;

    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_CURSOR }, // Tipo Cursor
      monto: montoMinimo                                             // Parámetro de entrada
    };

    // 3. Ejecuta la función
    const result = await connection.execute(sql, binds);

    // 4. Obtiene el cursor de los resultados
    cursor = result.outBinds.ret;

    // 5. Convierte el cursor a un array de objetos JSON
    // Usamos .getRows() para traer todas las filas
    const rows = await cursor.getRows();
    
    // 6. Cierra el cursor (¡importante!)
    await cursor.close();

    // 7. Envia el array de filas como JSON al frontend (React)
    res.json(rows);

  } catch (error) {
    console.error(`Error en GET /api/reporte-costosas:`, error.message);
    res.status(500).json({
      error: "Error al generar el reporte.",
      details: "Revise el log de la BD (tabla log_errores_proceso)."
    });
  } finally {
    // 8. Cierra la conexión (¡muy importante!)
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});


app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// Inicializar conexión al iniciar el servidor
initialize();