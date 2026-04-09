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
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas." });

        // Firma del token seguro
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
        
        await prisma.log.create({ data: { action: "Acceso Seguro", details: `Login detectado vía API`, userId: user.id } });

        res.json({ token, user: email });
    } catch (err) {
        res.status(500).json({ error: "Error procesando el acceso." });
    }
};

module.exports = { register, login };
