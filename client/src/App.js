import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    param1: "",
    param2: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/execute-procedure",
        formData
      );
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Error al ejecutar el procedimiento"
      );
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="card">
          <h1>🏥 Clínica Ketekura</h1>
          <h2>Ejecutar Procedimiento PL/SQL</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="param1">Parámetro 1</label>
              <input
                type="text"
                id="param1"
                name="param1"
                value={formData.param1}
                onChange={handleChange}
                placeholder="Ingrese el primer parámetro"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="param2">Parámetro 2</label>
              <input
                type="text"
                id="param2"
                name="param2"
                value={formData.param2}
                onChange={handleChange}
                placeholder="Ingrese el segundo parámetro"
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "⏳ Ejecutando..." : "🚀 Ejecutar Procedimiento"}
            </button>
          </form>

          {error && (
            <div className="alert alert-error">
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {result && result.success && (
            <div className="alert alert-success">
              <strong>✅ Éxito:</strong> {result.message}
              {result.data && result.data.length > 0 && (
                <div className="result-data">
                  <h3>Resultados:</h3>
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
