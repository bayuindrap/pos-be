import jwt from 'jsonwebtoken';

// Middleware untuk memverifikasi JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Ambil token dari Authorization header
    console.log ("token backend", token)
    if (!token) {
        return res.status(403).send({
            "status": false,
            "message": "Token is required",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY); // Verifikasi token menggunakan SECRET_KEY
        req.user = decoded; // Simpan informasi pengguna yang terverifikasi di request
        next(); // Lanjutkan ke request handler berikutnya
    } catch (error) {
        return res.status(401).send({
            "status": false,
            "message": "Invalid or expired token",
        });
    }
};

export default verifyToken;
