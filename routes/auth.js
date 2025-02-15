import express from "express";
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken';
import fs from 'fs'
import {getConnection} from '../config/db.js'

dotenv.config()
const router = express.Router()

const generateToken = () => {
    const options = {
        expiresIn: '2h',
    };

    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
        throw new Error('No secret key');
    }

    return jwt.sign({}, secretKey, options);
};


const generateRefreshToken = () => {
    const options = {
        expiresIn: '7d',
    };

    const secretKey = process.env.REFRESH_SECRET_KEY; 
    if (!secretKey) {
        throw new Error('No refresh token secret key provided');
    }
    return jwt.sign({}, secretKey, options);
};

const selectUser = (username, pass) => {
    return new Promise((resolve, reject) => {
        getConnection().then(connection => {
            connection.query('SELECT * FROM users WHERE USERNAME = ? AND PASSWORD = ? ', [username, pass], (error, elements) => {
                connection.release()
                if (error) {
                    return reject(error)
                }

                return resolve(elements)
            })
        })
        .catch(error => {
            reject(error)
        })
    })
}

router.post('/', async(req, res) => {
    try {
        const {username, pass} = req.body
        const results = await selectUser(username, pass)

        if (results.length < 1) {
            return res.status(401).send({
                "status": false,
                "message": "Invalid username / password",
            });
        }

        const token = generateToken(results[0]);
        const refreshToken = generateRefreshToken(results[0]);

         res.send({
            "status": true,
            "message": "Login Success",
            "data": results,
            "token": token,
            "refreshToken": refreshToken
        });
        
    } catch (error) {
        console.log(error)
        return res.status(401).send({
            "status": false,
            "message": error.message
        })
    }
})

export default router