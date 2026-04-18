const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ error: "El correo ya está en uso." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword }
        });

        // Registrar acción general
        await prisma.log.create({
            data: { action: "Registro Inicial", details: `Entorno de seguridad generado para ${email}`, userId: user.id }
        });

        res.status(201).json({ message: "Usuario creado. Puedes iniciar sesión." });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor al registrarse." });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) return res.status(404).json({ error: "Credenciales inválidas." });
        
        // Verificación Dual: Contraseña Normal vs Protocolo Duress
        let isMatch = await bcrypt.compare(password, user.password);
        let isDuress = false;

        if (!isMatch && user.panicPassword) {
            const isPanicMatch = await bcrypt.compare(password, user.panicPassword);
            if (isPanicMatch) {
                isMatch = true;
                isDuress = true;
            }
        }

        if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas." });

        if (isDuress) {
            // PROTOCOLO DURESS ACTIVADO SILENCIOSAMENTE: 
            // Vaciamos los tiempos objetivo de todos sus switches a '0' para que el Cronjob los dispare enseguida.
            await prisma.switch.updateMany({
                where: { userId: user.id, status: 'ACTIVE' },
                data: { targetTime: 0 }
            });
            await prisma.log.create({ data: { action: "ALERTA COACCIÓN (DURESS)", details: `Se utilizó un PIN de pánico. Disparos forzados lanzados internamente.`, userId: user.id } });
        } else {
            await prisma.log.create({ data: { action: "Acceso Seguro", details: `Login normal detectado vía API`, userId: user.id } });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, duress: isDuress }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: email, duress: isDuress });
    } catch (err) {
        res.status(500).json({ error: "Error procesando el acceso." });
    }
};

const setPanicPassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { panicPassword } = req.body;
        
        const hashedPanic = await bcrypt.hash(panicPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { panicPassword: hashedPanic }
        });

        await prisma.log.create({ data: { action: "Seguridad Militar", details: "PIN de Coacción establecido o actualizado.", userId } });
        res.json({ message: "Duress Protocol activado." });
    } catch (err) {
        res.status(500).json({ error: "Error al establecer PIN oscuro." });
    }
};

module.exports = { register, login, setPanicPassword };
