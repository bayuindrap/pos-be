import express from 'express';
import dotenv from 'dotenv'
import {getConnection} from '../config/db.js'
import Excel from 'exceljs';
import moment from 'moment';
import verifyToken from '../authentication/verifyToken.js';

dotenv.config()
const router = express.Router()

// Fungsi untuk mendapatkan ID terakhir transaksi
const getLastTransactionId = () => {
    return new Promise((resolve, reject) => {
        getConnection()
            .then((connection) => {
                connection.query(
                    'SELECT ID_TRANSACTIONS FROM TRANSACTIONS ORDER BY ID_TRANSACTIONS DESC LIMIT 1',
                    [],
                    (error, results) => {
                        connection.release();
                        if (error) {
                            return reject(error);
                        }
                        if (results.length > 0) {
                            const lastId = results[0].ID_TRANSACTIONS;
                            const numericPart = parseInt(lastId.match(/\d+/)[0]);
                            const newId = 'TRX' + String(numericPart + 1).padStart(3, '0');
                            return resolve(newId);
                        } else {
                            return resolve('TRX001');
                        }
                    },
                );
            })
            .catch((error) => {
                reject(error);
            });
    });
};

const getLastTransactionDetailId = () => {
    return new Promise((resolve, reject) => {
        getConnection()
            .then((connection) => {
                connection.query(
                    'SELECT ID_DETAIL_TRANSACTIONS FROM TRANSACTION_DETAIL ORDER BY ID_DETAIL_TRANSACTIONS DESC LIMIT 1',
                    [],
                    (error, results) => {
                        connection.release();
                        if (error) {
                            return reject(error);
                        }
                        if (results.length > 0) {
                            const lastId = results[0].ID_DETAIL_TRANSACTIONS;
                            const numericPart = parseInt(lastId.replace(/[^\d]/g, ''));
                            const newId = 'TRXD' + String(numericPart + 1).padStart(3, '0');
                            return resolve(newId);
                        } else {
                            return resolve('TRXD001');
                        }
                    }
                );
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// Fungsi untuk mengurangi stock produk
const updateProductStock = (productId, quantity) => {
    return new Promise((resolve, reject) => {
        getConnection()
            .then((connection) => {
                connection.query(
                    'UPDATE PRODUCTS SET STOCK = STOCK - ? WHERE ID_PRODUCTS = ?',
                    [quantity, productId],
                    (error, result) => {
                        connection.release();
                        if (error) {
                            return reject(error);
                        }
                        return resolve(result);
                    },
                );
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// Fungsi untuk menambah transaksi
const addTransaction = (transactionData) => {
    return new Promise((resolve, reject) => {
        getConnection()
            .then((connection) => {
                connection.query(
                    `INSERT INTO TRANSACTIONS (ID_TRANSACTIONS, TRANSACTION_DATE, TOTAL_AMOUNT, PAYMENT_AMOUNT, CHANGE_AMOUNT) 
                     VALUES(?, ?, ?, ?, ?)`,
                    [
                        transactionData.ID_TRANSACTIONS,
                        transactionData.TRANSACTION_DATE,
                        transactionData.TOTAL_AMOUNT,
                        transactionData.PAYMENT_AMOUNT,
                        transactionData.CHANGE_AMOUNT
                    ],
                    (error, result) => {
                        connection.release();
                        if (error) {
                            return reject(error);
                        }
                        return resolve(result.insertId);
                    }
                );
            })
            .catch((error) => {
                reject(error);
            });
    });
};

// Modified addTransactionDetails function to handle multiple items correctly
const addTransactionDetails = async (transactionId, cart, custName, cashierId) => {
    const connection = await getConnection();
    try {
        // Process each item one by one to ensure unique IDs
        for (const item of cart) {
            const detailId = await getLastTransactionDetailId();
            const subtotal = item.PRICE * item.quantity;

            await new Promise((resolve, reject) => {
                const query = `INSERT INTO TRANSACTION_DETAIL 
                    (ID_DETAIL_TRANSACTIONS, ID_TRANSACTIONS, ID_PRODUCTS, QUANTITY, PRICE, SUBTOTAL, CUST_NAME, CASHIER_ID) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                connection.query(query, [
                    detailId,
                    transactionId,
                    item.ID_PRODUCTS,
                    item.quantity,
                    item.PRICE,
                    subtotal,
                    custName,
                    cashierId
                ], (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            });
        }
        
        connection.release();
        return true;
    } catch (error) {
        connection.release();
        throw error;
    }
};

const selectTransaction = (page, limit, searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
          if (page !== undefined && limit !== undefined) {
            const offset = (page - 1) * limit;
            query = `
                      SELECT A.ID_TRANSACTIONS, A.QUANTITY, A.PRICE, A.CUST_NAME, B.TRANSACTION_DATE AS DATE, C.NAMA, D.NAME AS PRODUCT_NAME, E.CATEGORY_NAME
                      FROM TRANSACTION_DETAIL A
                      LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
                      LEFT JOIN USERS C ON A.CASHIER_ID = C.ID_USERS
                      LEFT JOIN PRODUCTS D ON A.ID_PRODUCTS = D.ID_PRODUCTS
                      LEFT JOIN CATEGORY E ON D.ID_CATEGORY = E.ID_CATEGORY
                      WHERE C.NAMA LIKE ?
                      LIMIT ? OFFSET ?
                  `;
            params = [`%${searchTerm || ''}%`, limit, offset];
          } else {
            query = `
                      SELECT A.ID_TRANSACTIONS, A.QUANTITY, A.PRICE, A.CUST_NAME, B.TRANSACTION_DATE AS DATE, C.NAMA, D.NAME AS PRODUCT_NAME, E.CATEGORY_NAME
                      FROM TRANSACTION_DETAIL A
                      LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
                      LEFT JOIN USERS C ON A.CASHIER_ID = C.ID_USERS
                      LEFT JOIN PRODUCTS D ON A.ID_PRODUCTS = D.ID_PRODUCTS
                      LEFT JOIN CATEGORY E ON D.ID_CATEGORY = E.ID_CATEGORY
                      WHERE C.NAMA LIKE ?
                  `;
            params = [`%${searchTerm || ''}%`];
          }
          connection.query(query, params, (error, elements) => {
            connection.release();
            if (error) {
              return reject(error);
            }
            return resolve(elements);
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

const countTransactions = (searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          const query = `
                  SELECT COUNT(*) AS total
                  FROM TRANSACTION_DETAIL
                  WHERE CUST_NAME LIKE ?
              `;
          const params = [`%${searchTerm}%`];
          connection.query(query, params, (error, results) => {
            connection.release();
            if (error) {
              return reject(error);
            }
            return resolve(results[0].total);
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };


// Route untuk menyimpan transaksi dan detail transaksi
router.post('/add', verifyToken, async (req, res) => {
    try {
        const { cart, amountPaid, change, custName, today, cashierId } = req.body;

        const formattedDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
        const totalAmount = cart.reduce((acc, item) => acc + (item.PRICE * item.quantity), 0);
        const paymentAmount = amountPaid;
        const changeAmount = change;

        // Step 1: Generate new Transaction ID
        const transactionId = await getLastTransactionId();
        
        // Step 2: Save to transaction table
        const transactionData = {
            ID_TRANSACTIONS: transactionId,
            TRANSACTION_DATE: formattedDateTime,
            TOTAL_AMOUNT: totalAmount,
            PAYMENT_AMOUNT: paymentAmount,
            CHANGE_AMOUNT: changeAmount
        };

        await addTransaction(transactionData);
        
        // Step 3: Save to transactions_detail table
        await addTransactionDetails(transactionId, cart, custName, cashierId);
        
        // Step 4: Update stock for each product in the cart
        for (const item of cart) {
            await updateProductStock(item.ID_PRODUCTS, item.quantity);
        }

        return res.status(200).send({
            status: true,
            message: 'Transaction success',
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: error.message,
        });
    }
});

router.post('/', verifyToken, async (req, res) => {
    try {
      const { page = '', limit = '', searchTerm = ''} = req.body;
      let resultsElement, totalItems;
  
        resultsElement = await selectTransaction(page, limit, searchTerm);
        totalItems = await countTransactions(searchTerm);

      if (resultsElement.length === 0) {
        return res.status(200).send({
          status: false,
          message: 'Data not found.',
          data: [],
          totalItems: 0,
        });
      }
      return res.status(200).send({
        status: true,
        message: 'Data available',
        data: resultsElement,
        totalItems: totalItems,
      });
    } catch (error) {
      return res.status(500).send({
        status: false,
        message: error.message,
        data: [],
      });
    }
  });

export default router;