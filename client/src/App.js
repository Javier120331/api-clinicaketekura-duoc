import React, { useState } from "react";
import axios from "axios"; // Usaremos axios para todas las llamadas, es más limpio
import "./App.css";

// --- Componente Reutilizable para mostrar Resultados ---
// Lo usaremos en todas las tarjetas para mostrar la respuesta (éxito o error)
const Resultado = ({ data, error, loading }) => {
  if (loading) {
    return <div className="resultado-box cargando">⏳ Cargando...</div>;
  }
  if (error) {
    return <div className="resultado-box error">❌ Error: {error}</div>;
  }
  if (!data) {
    return null; // No mostrar nada si no hay data
  }
  // Si la data es un mensaje simple (como en DELETE o Copago)
  if (typeof data === 'string') {
    return <div className="resultado-box exito">✅ {data}</div>;
  }
  // Si la data es un objeto o array (lo dejamos por si alguna otra función lo usa)
  return (
    <div className="resultado-box exito">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

// --- Componente Tarjeta (para ordenar la presentación) ---
const Card = ({ titulo, children }) => (
  <div className="card">
    <h2>{titulo}</h2>
    {children}
  </div>
);

// --- 1. Funcionalidad: Calcular Copago (Script 2) ---
const Funcionalidad1_CalcularCopago = () => {
  const [idAtencion, setIdAtencion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null); // Ahora guardará un string

  const handleCalcular = async () => {
    if (!idAtencion) {
      setError("Por favor, ingresa un ID de Atención.");
      return;
    }
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      // Llamamos al endpoint del backend
      const response = await axios.get(`http://localhost:3001/api/copago/${idAtencion}`);
      
      // *** CAMBIO AQUÍ ***
      // En lugar de guardar el JSON, creamos un string bonito.
      const copagoFormateado = response.data.copago_calculado.toLocaleString('es-CL');
      setResultado(`Cálculo exitoso. Copago: $${copagoFormateado}`);
      // *** FIN DEL CAMBIO ***

    } catch (err) {
      // Si el backend da error 500, 'err.response.data' tendrá el JSON de error
      const errorMsg = err.response?.data?.details || err.message;
      setError(errorMsg);
      // La función en PL/SQL ya guardó el error en la tabla 'log_errores_proceso'
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card titulo="1. Función: fn_calcular_copago (Script 2)">
      <p>Llama a la función PL/SQL que calcula el copago y maneja errores con tablas de log.</p>
      <div className="form-grupo">
        <input
          type="number"
          value={idAtencion}
          onChange={(e) => setIdAtencion(e.target.value)}
          placeholder="Ingresa ID Atención (Ej: 101)"
        />
        <button onClick={handleCalcular} disabled={loading}>
          {loading ? "Calculando..." : "💰 Calcular Copago"}
        </button>
      </div>
      {/* El componente Resultado ahora recibe el string de éxito */}
      <Resultado data={resultado} error={error} loading={loading} />
    </Card>
  );
};

// --- 2. Funcionalidad: Reporte Atenciones Costosas (Script 1) ---
const Funcionalidad2_ReporteCostosas = () => {
  const [monto, setMonto] = useState(70000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reporte, setReporte] = useState([]); // El resultado es una tabla

  const handleGenerar = async () => {
    setLoading(true);
    setError(null);
    setReporte([]);
    try {
      // Llamamos al endpoint con el parámetro ?monto=
      const response = await axios.get(`http://localhost:3001/api/reporte-costosas?monto=${monto}`);
      setReporte(response.data); // El resultado es un array
      if (response.data.length === 0) {
        setError("No se encontraron atenciones con ese monto.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.details || err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card titulo="2. Función: fn_get_reporte_costosas (Script 1)">
      <p>Llama a la función que devuelve un reporte (SYS_REFCURSOR) basado en un monto mínimo.</p>
      <div className="form-grupo">
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Ingresa Monto Mínimo"
        />
        <button onClick={handleGenerar} disabled={loading}>
          {loading ? "Generando..." : "💸 Generar Reporte"}
        </button>
      </div>
      {/* Mostramos el error si existe */}
      {error && !loading && <Resultado error={error} />}
      
      {/* Mostramos la tabla si hay resultados */}
      {!loading && reporte.length > 0 && (
        <table className="tabla-reporte">
          <thead>
            <tr>
              <th>ID Atención</th>
              <th>Paciente</th>
              <th>Médico</th>
              <th>Fecha</th>
              <th>Costo</th>
            </tr>
          </thead>
          {/* ... ESTE ES EL CÓDIGO CORREGIDO ... */}
                  <tbody>
                    {reporte.map((fila) => (
                      <tr key={fila[0]}> {/* Usamos el ATE_ID (fila[0]) como key */}
                        <td>{fila[0]}</td> {/* ATE_ID */}
                        <td>{fila[3]}</td> {/* PACIENTE */}
                        <td>{fila[4]}</td> {/* MEDICO */}
                        <td>{new Date(fila[2]).toLocaleDateString('es-CL')}</td> {/* FECHA_ATENCION */}
                        
                        {/* Aquí estaba el error: 
                          Usamos fila[1] (COSTO) y nos aseguramos de que no sea nulo 
                        */}
                        <td>
                          ${fila[1] ? fila[1].toLocaleString('es-CL') : 'N/A'}
                        </td>
                        
                      </tr>
                    ))}
                  </tbody>
        </table>
      )}
    </Card>
  );
};

// --- 3. Funcionalidad: Obtener TODOS los Pacientes (CRUD) ---
const Funcionalidad3_GetPacientes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pacientes, setPacientes] = useState([]);

  const handleGetPacientes = async () => {
    setLoading(true);
    setError(null);
    setPacientes([]);
    try {
      const response = await axios.get("http://localhost:3001/api/pacientes");
      setPacientes(response.data);
      if (response.data.length === 0) {
        setError("No se encontraron pacientes.");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.details || err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  return (
    <Card titulo="3. Obtener TODOS los Pacientes (CRUD: Read All)">
      <p>Ejecuta un `SELECT * FROM PACIENTE` simple. No requiere parámetros.</p>
      <div className="form-grupo">
        <button onClick={handleGetPacientes} disabled={loading}>
          {loading ? "Cargando..." : "📋 Obtener Todos los Pacientes"}
        </button>
      </div>
      {error && !loading && <Resultado error={error} />}
      {!loading && pacientes.length > 0 && (
        <table className="tabla-pacientes">
          <thead>
            <tr>
              <th>RUN</th>
              <th>Nombre</th>
              <th>Apellido Paterno</th>
              <th>Fecha Nac.</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.PAC_RUN}>
                <td>{p.PAC_RUN}-{p.DV_RUN}</td>
                <td>{p.PNOMBRE}</td>
                <td>{p.APATERNO}</td>
                <td>{formatearFecha(p.FECHA_NACIMIENTO)}</td>
                <td>{p.TELEFONO || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

// --- 4. Funcionalidad: Buscar UN Paciente (CRUD) ---
const Funcionalidad4_GetPacientePorRun = () => {
  const [run, setRun] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null); // Guardará el objeto paciente

  const handleBuscar = async () => {
    if (!run) {
      setError("Por favor, ingresa un RUN.");
      return;
    }
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const response = await axios.get(`http://localhost:3001/api/pacientes/${run}`);
      setResultado(response.data); // Muestra el objeto del paciente
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No registrado';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  return (
    <Card titulo="4. Buscar UN Paciente (CRUD: Read One)">
      <p>Ejecuta un `SELECT * FROM PACIENTE WHERE pac_run = :run`.</p>
      <div className="form-grupo">
        <input
          type="number"
          value={run}
          onChange={(e) => setRun(e.target.value)}
          placeholder="Ingresa RUN (sin dígito)"
        />
        <button onClick={handleBuscar} disabled={loading}>
          {loading ? "Buscando..." : "👤 Buscar Paciente"}
        </button>
      </div>

      {/* --- CAMBIO AQUÍ --- */}
      {/* Ya no usamos <Resultado data={...} /> para el éxito */}
      
      {loading && <Resultado loading />}
      {error && <Resultado error={error} />}

      {/* Si tenemos un resultado (que es el objeto Paciente), lo formateamos: */}
      {resultado && !loading && !error && (
        <div className="resultado-box exito">
          <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Paciente Encontrado</h4>
          <ul className="paciente-detalles">
            <li><strong>RUN:</strong> {resultado.PAC_RUN}-{resultado.DV_RUN}</li>
            <li><strong>Nombre:</strong> {resultado.PNOMBRE} {resultado.APATERNO} {resultado.AMATERNO}</li>
            <li><strong>Fecha Nac:</strong> {formatearFecha(resultado.FECHA_NACIMIENTO)}</li>
            <li><strong>Teléfono:</strong> {resultado.TELEFONO || 'No registrado'}</li>
            <li><strong>SALA ID:</strong> {resultado.SAL_ID || 'No asignada'}</li>
          </ul>
        </div>
      )}
      {/* --- FIN DEL CAMBIO --- */}
    </Card>
  );
};

// --- 5. Funcionalidad: Eliminar UN Paciente (CRUD) ---
const Funcionalidad5_EliminarPacientePorRun = () => {
  const [run, setRun] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null); // Para el mensaje de éxito

  const handleEliminar = async () => {
    if (!run) {
      setError("Por favor, ingresa un RUN.");
      return;
    }
    
    // Usamos window.confirm para una acción destructiva
    const confirmar = window.confirm(`¿Estás seguro de eliminar al paciente con RUN ${run}?`);
    if (!confirmar) {
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const response = await axios.delete(`http://localhost:3001/api/pacientes/${run}`);
      setResultado(response.data.message); // Muestra el mensaje de éxito
      setRun(""); // Limpia el input
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card titulo="5. Eliminar UN Paciente (CRUD: Delete)">
      <p>Ejecuta un `DELETE FROM PACIENTE WHERE pac_run = :run`.</p>
      <div className="form-grupo">
        <input
          type="number"
          value={run}
          onChange={(e) => setRun(e.target.value)}
          placeholder="Ingresa RUN (sin dígito)"
        />
        <button onClick={handleEliminar} disabled={loading} className="btn-danger">
          {loading ? "Eliminando..." : "🗑️ Eliminar Paciente"}
        </button>
      </div>
      <Resultado data={resultado} error={error} loading={loading} />
    </Card>
  );
};


// --- Componente Principal APP ---
function App() {
  return (
    <div className="app-container">
      <header>
        <h1>🏥 Demo de Base de Datos: Clínica Ketekura</h1>
        <p>Frontend (React) conectada a Backend (Node.js) y Base de Datos (Oracle PL/SQL)</p>
      </header>
      
      {/* Cada funcionalidad está encapsulada en su propia tarjeta */}
      <Funcionalidad1_CalcularCopago />
      <Funcionalidad2_ReporteCostosas />
      <Funcionalidad3_GetPacientes />
      <Funcionalidad4_GetPacientePorRun />
      <Funcionalidad5_EliminarPacientePorRun />

    </div>
  );
}

export default App;