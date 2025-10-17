# API Clínica Ketekura - DUOC

API Node.js con Express y frontend React para ejecutar procedimientos PL/SQL en base de datos Aiven PostgreSQL.

## 🚀 Características

- **Backend**: Node.js + Express
- **Frontend**: React
- **Base de datos**: PostgreSQL (Aiven)
- **Funcionalidad**: Ejecutar procedimientos almacenados con parámetros desde un formulario

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn
- Cuenta de Aiven con PostgreSQL configurado

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd api-clinicaketekura-duoc
```

### 2. Configurar el Backend

```bash
# Instalar dependencias del backend
npm install

# Copiar el archivo de ejemplo de variables de entorno
copy .env.example .env

# Editar .env con tus credenciales de Aiven
```

### 3. Configurar el Frontend

```bash
# Navegar a la carpeta del cliente
cd client

# Instalar dependencias
npm install

# Volver a la raíz
cd ..
```

## ⚙️ Configuración

### Variables de Entorno (.env)

Edita el archivo `.env` con tus credenciales de Aiven:

```env
DB_HOST=tu-host.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=tu-password
DB_NAME=defaultdb
DB_SSL=true
PORT=3001
CLIENT_URL=http://localhost:3000
```

### Crear el Procedimiento/Función en PostgreSQL

Conéctate a tu base de datos Aiven y crea una función de ejemplo:

```sql
-- Ejemplo de función que recibe dos parámetros
CREATE OR REPLACE FUNCTION mi_funcion(
    p_param1 TEXT,
    p_param2 TEXT
)
RETURNS TABLE (
    resultado TEXT,
    parametro1 TEXT,
    parametro2 TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'Ejecución exitosa'::TEXT,
        p_param1,
        p_param2;
END;
$$ LANGUAGE plpgsql;
```

O si prefieres un procedimiento:

```sql
-- Ejemplo de procedimiento
CREATE OR REPLACE PROCEDURE mi_procedimiento(
    p_param1 TEXT,
    p_param2 TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Tu lógica aquí
    INSERT INTO mi_tabla (campo1, campo2) VALUES (p_param1, p_param2);
    COMMIT;
END;
$$;
```

**Importante**: Modifica el archivo `server.js` (líneas 65-68) con el nombre de tu procedimiento/función.

## 🚀 Ejecución

### Opción 1: Ejecutar ambos servidores por separado

**Terminal 1 - Backend:**

```bash
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd client
npm start
```

### Opción 2: Script para ejecutar ambos (opcional)

Puedes agregar concurrently para ejecutar ambos con un comando:

```bash
npm install --save-dev concurrently
```

Y modificar `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "client": "cd client && npm start",
  "dev:all": "concurrently \"npm run dev\" \"npm run client\""
}
```

Luego ejecutar:

```bash
npm run dev:all
```

## 📱 Uso

1. Accede a `http://localhost:3000` en tu navegador
2. Completa los dos campos del formulario
3. Haz clic en "Ejecutar Procedimiento"
4. Los resultados se mostrarán en pantalla

## 🔍 Endpoints de la API

### Health Check

```
GET /api/health
```

Verifica la conexión con la base de datos.

### Ejecutar Procedimiento

```
POST /api/execute-procedure
Content-Type: application/json

{
  "param1": "valor1",
  "param2": "valor2"
}
```

## 🎨 Personalización

### Modificar el procedimiento que se ejecuta

Edita `server.js` línea 68:

```javascript
// Para función que retorna valores
const result = await client.query("SELECT * FROM tu_funcion($1, $2)", [
  param1,
  param2,
]);

// Para procedimiento
await client.query("CALL tu_procedimiento($1, $2)", [param1, param2]);
```

### Agregar más campos al formulario

1. Modifica `client/src/App.js` - estado `formData`
2. Agrega los campos en el JSX del formulario
3. Actualiza el endpoint en `server.js` para recibir los nuevos parámetros

## 🐛 Troubleshooting

### Error de conexión SSL

Si tienes problemas con SSL, verifica que `DB_SSL=true` en `.env` y que el certificado de Aiven sea válido.

### Puerto ocupado

Si el puerto 3000 o 3001 está ocupado, modifica:

- Backend: `PORT` en `.env`
- Frontend: crea `.env` en `client/` con `PORT=3002`

### CORS errors

Asegúrate que `CLIENT_URL` en `.env` coincida con la URL del frontend.

## 📄 Licencia

ISC

## 👤 Autor

Javier - Proyecto DUOC
