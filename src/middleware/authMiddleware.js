const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Token no proveído. Acceso Denegado." });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificación de Versión para Botón de Destrucción de Sesiones
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!dbUser || dbUser.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({ error: "Sesión Revocada Remotamente. Debes volver a iniciar sesión." });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token inválido o expirado." });
    }
};

module.exports = authMiddleware;
