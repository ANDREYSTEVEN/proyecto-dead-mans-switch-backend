require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
const { startCronJob } = require('./jobs/cronJob');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Permitir conexiones desde Vite (Local) o Vercel (Producción)
app.use(express.json());

// Endpoints Centrales
app.use('/api', apiRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('El motor de Dead Man Switch está Operativo.');
});

// Iniciamos el servidor y los motores de Job Automáticos
app.listen(PORT, () => {
    console.log(`📡 Dead Man's Switch API transmitiendo en el puerto ${PORT}`);
    startCronJob(); // Arrancamos el vigilante fantasma
});
