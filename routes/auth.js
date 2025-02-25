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

const saveRefreshToken = (refreshToken, userId) => {
    return new Promise((resolve, reject) => {
        getConnection().then(connection => {
            connection.query(
                'UPDATE users SET REFRESH_TOKEN = ? WHERE ID_USERS = ?',
                [refreshToken, userId],
                (error, results) => {
                    connection.release();
                    if (error) {
                        return reject(error);
                    }
                    resolve(results);
                }
            );
        }).catch(error => {
            reject(error);
        });
    });
};

const updateTokenLogout = (token, userId) => {
    return new Promise((resolve, reject) => {
        getConnection().then(connection => {
            connection.query('UPDATE USERS SET REFRESH_TOKEN = ? WHERE ID_USER = ?', [token, userId], (error, elements) => {
                connection.release();
                if (error) {
                    return reject(error);
                }
                return resolve(elements);
            });
          })
          .catch(error => {
            reject(error);
          });
    });
};


const verifyRefreshToken = (refreshToken) => {
    try {
      const secretKey = process.env.REFRESH_SECRET_KEY;
      if (!secretKey) {
        throw new Error('No refresh token secret key provided');
      }
      return jwt.verify(refreshToken, secretKey);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  };
  
 
  const getUserByRefreshToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
      getConnection().then(connection => {
        connection.query('SELECT * FROM users WHERE REFRESH_TOKEN = ?', [refreshToken], (error, elements) => {
          connection.release();
          if (error) {
            return reject(error);
          }
          return resolve(elements);
        });
      })
      .catch(error => {
        reject(error);
      });
    });
  };
  
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).send({
          status: false,
          message: "Refresh token is required"
        });
      }
  
    
      const decoded = verifyRefreshToken(refreshToken);
      

      const users = await getUserByRefreshToken(refreshToken);
      
      if (users.length === 0) {
        return res.status(403).send({
          status: false,
          message: "Invalid refresh token"
        });
      }
      
      const user = users[0];
      
      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);
      await saveRefreshToken(newRefreshToken, user.ID_USERS);
      
      return res.status(200).send({
        status: true,
        message: "Token refreshed successfully",
        token: newToken,
        refreshToken: newRefreshToken
      });
      
    } catch (error) {
      console.error("Refresh token error:", error);
      return res.status(403).send({
        status: false,
        message: error.message || "Invalid refresh token"
      });
    }
  });




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
        const userId = results[0].ID_USERS;
        const token = generateToken(results[0]);
        const refreshToken = generateRefreshToken(results[0]);
        console.log("liat", refreshToken, userId)
        await saveRefreshToken(refreshToken, userId);
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

router.post('/updateToken', async (req, res) => {
    try {
        const { token,userId } = req.body;

        if (!(userId)) {
            return res.status(200).send({
                "status": false,
                "message": "User Id cant null"
            });
        }
        
        const resultElements = await updateTokenLogout(token,userId);

        return res.send({
            "status": true,
            "message": "Update success",
            "data":resultElements
        });
    } catch (error) {
        //console.log(error);
        return res.status(401).send({
            "status": true,
            "message": error.message
        });
    }

});

export default router