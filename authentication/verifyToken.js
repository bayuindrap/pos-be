import jwt from 'jsonwebtoken';


const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; 
    console.log ("received token", token)
    if (!token) {
        return res.status(403).send({
            "status": false,
            "message": "Token is required",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        // console.log("verifys", process.env.SECRET_KEY)
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send({
            "status": false,
            "message": "Invalid or expired token",
        });
    }
};

export default verifyToken;
