import mysql from 'mysql'

var pool = mysql.createPool({
    host: "localhost",
    port: '3306',
    user: "root",
    password: "password123",
    database: "pos_apps",
})

const getConnection = () => {
    return new Promise((resolve,reject) => {
        pool.getConnection((err, connection) => {
            if(err){
                reject(err)
            }else{
                resolve(connection)
            }
        })
    })
}

export { pool, getConnection };