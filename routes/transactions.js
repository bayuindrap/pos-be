import express from 'express';
import dotenv from 'dotenv'
import {getConnection} from '../config/db.js'
import Excel from 'exceljs';
import moment from 'moment';
import verifyToken from '../authentication/verifyToken.js';

dotenv.config()
const router = express.Router()


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

const addTransactionDetails = async (transactionId, cart, custName, cashierId) => {
    const connection = await getConnection();
    try {

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

const selectTransactionDetail = (trxId, page, limit) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
          if (page !== undefined && limit !== undefined) {
            const offset = (page - 1) * limit;
            query = `
                      SELECT A.ID_DETAIL_TRANSACTIONS AS TRXID, A.QUANTITY, A.PRICE, A.CUST_NAME, B.TRANSACTION_DATE AS DATE, C.NAMA, D.NAME AS PRODUCT_NAME, E.CATEGORY_NAME
                      FROM TRANSACTION_DETAIL A
                      LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
                      LEFT JOIN USERS C ON A.CASHIER_ID = C.ID_USERS
                      LEFT JOIN PRODUCTS D ON A.ID_PRODUCTS = D.ID_PRODUCTS
                      LEFT JOIN CATEGORY E ON D.ID_CATEGORY = E.ID_CATEGORY
                      WHERE A.ID_TRANSACTIONS = ?
                      LIMIT ? OFFSET ?
                  `;
            params = [trxId, limit, offset];
          } else {
            query = `
                      SELECT A.ID_DETAIL_TRANSACTIONS AS TRXID, A.QUANTITY, A.PRICE, A.CUST_NAME, B.TRANSACTION_DATE AS DATE, C.NAMA, D.NAME AS PRODUCT_NAME, E.CATEGORY_NAME
                      FROM TRANSACTION_DETAIL A
                      LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
                      LEFT JOIN USERS C ON A.CASHIER_ID = C.ID_USERS
                      LEFT JOIN PRODUCTS D ON A.ID_PRODUCTS = D.ID_PRODUCTS
                      LEFT JOIN CATEGORY E ON D.ID_CATEGORY = E.ID_CATEGORY
                      WHERE A.ID_TRANSACTIONS = ?
                  `;
            params = [trxId];
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

// const selectTransaction = (page, limit, searchTerm) => {
//     return new Promise((resolve, reject) => {
//       getConnection()
//         .then((connection) => {
//           let query, params;
//           if (page !== undefined && limit !== undefined) {
//             const offset = (page - 1) * limit;
//             query = `
//                       SELECT A.ID_TRANSACTIONS, A.TRANSACTION_DATE AS DATE, A.TOTAL_AMOUNT, B.CUST_NAME
//                       FROM TRANSACTIONS A
//                       LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
//                       GROUP BY A.ID_TRANSACTIONS, A.TRANSACTION_DATE, A.TOTAL_AMOUNT
//                       WHERE B.CUST_NAME = ?
//                       LIMIT ? OFFSET ?
//                   `;
//             params = [`%${searchTerm || ''}%`,limit, offset];
//           } else {
//             query = `
//                       SELECT A.ID_TRANSACTIONS, A.TRANSACTION_DATE AS DATE, A.TOTAL_AMOUNT, B.CUST_NAME
//                       FROM TRANSACTIONS A
//                       LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
//                       GROUP BY A.ID_TRANSACTIONS, A.TRANSACTION_DATE, A.TOTAL_AMOUNT
//                       WHERE B.CUST_NAME = ?
//                   `;
//             params = [`%${searchTerm || ''}%`,];
//           }
//           connection.query(query, params, (error, elements) => {
//             connection.release();
//             if (error) {
//               return reject(error);
//             }
//             return resolve(elements);
//           });
//         })
//         .catch((error) => {
//           reject(error);
//         });
//     });
//   };


///////////////////////////////////////////////


// const selectTransaction = (page, limit, searchTerm, sortQuery) => {
//   return new Promise((resolve, reject) => {
//     getConnection()
//       .then((connection) => {
//         let query = `
//           SELECT DISTINCT A.ID_TRANSACTIONS, A.TRANSACTION_DATE AS DATE, A.TOTAL_AMOUNT, B.CUST_NAME
//           FROM TRANSACTIONS A
//           LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
//           WHERE B.CUST_NAME LIKE ?
//           ${sortQuery}  -- Pastikan ini tidak menyebabkan duplikasi
//           LIMIT ? OFFSET ?
//         `;
//         const offset = (page - 1) * limit;
//         const params = [`%${searchTerm || ''}%`, limit, offset];

//         connection.query(query, params, (error, elements) => {
//           connection.release();
//           if (error) {
//             return reject(error);
//           }
//           return resolve(elements);
//         });
//       })
//       .catch((error) => {
//         reject(error);
//       });
//   });
// };

const selectTransaction = (page, limit, searchTerm, sortQuery) => {
  return new Promise((resolve, reject) => {
    getConnection()
      .then((connection) => {
        let query = `
          SELECT DISTINCT A.ID_TRANSACTIONS, A.TRANSACTION_DATE AS DATE, A.TOTAL_AMOUNT, B.CUST_NAME
          FROM TRANSACTIONS A
          LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
          WHERE B.CUST_NAME LIKE ?
          ${sortQuery}
          LIMIT ? OFFSET ?
        `;
        const offset = (page - 1) * limit;
        const params = [`%${searchTerm || ''}%`, limit, offset];

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





// const countTransaction = (searchTerm) => {
//   return new Promise((resolve, reject) => {
//     getConnection()
//       .then((connection) => {
//         const query = `
//           SELECT COUNT(DISTINCT A.ID_TRANSACTIONS) AS total
//           FROM TRANSACTIONS A
//           LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
//           WHERE B.CUST_NAME LIKE ?
//         `;
//         const params = [`%${searchTerm || ''}%`];
//         connection.query(query, params, (error, results) => {
//           connection.release();
//           if (error) {
//             return reject(error);
//           }
//           return resolve(results[0].total);
//         });
//       })
//       .catch((error) => {
//         reject(error);
//       });
//   });
// };

const countTransaction = (searchTerm) => {
  return new Promise((resolve, reject) => {
    getConnection()
      .then((connection) => {
        const query = `
          SELECT COUNT(DISTINCT A.ID_TRANSACTIONS) AS total
          FROM TRANSACTIONS A
          LEFT JOIN TRANSACTION_DETAIL B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
          WHERE B.CUST_NAME LIKE ?
        `;
        const params = [`%${searchTerm || ''}%`];
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


const countTransactionsDetail = (trxId) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          const query = `
                  SELECT COUNT(*) AS total
                  FROM TRANSACTION_DETAIL
                  WHERE ID_TRANSACTIONS = ?
              `;
          const params = [trxId];
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



router.post('/add', verifyToken, async (req, res) => {
    try {
        const { cart, amountPaid, change, custName, today, cashierId } = req.body;

        const formattedDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
        const totalAmount = cart.reduce((acc, item) => acc + (item.PRICE * item.quantity), 0);
        const paymentAmount = amountPaid;
        const changeAmount = change;

       
        const transactionId = await getLastTransactionId();
        
     
        const transactionData = {
            ID_TRANSACTIONS: transactionId,
            TRANSACTION_DATE: formattedDateTime,
            TOTAL_AMOUNT: totalAmount,
            PAYMENT_AMOUNT: paymentAmount,
            CHANGE_AMOUNT: changeAmount
        };

        await addTransaction(transactionData);
        
      
        await addTransactionDetails(transactionId, cart, custName, cashierId);
        
      
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
      const { page = '', limit = '', searchTerm = '', sortBy = ''} = req.body;
      let resultsElement, totalItems;

      let sortQuery = '';
      switch (sortBy) {
        case 'amount_asc':
          sortQuery = 'ORDER BY A.TOTAL_AMOUNT ASC';
          break;
        case 'amount_desc':
          sortQuery = 'ORDER BY A.TOTAL_AMOUNT DESC';
          break;
        case 'date_asc':
          sortQuery = 'ORDER BY A.TRANSACTION_DATE ASC';
          break;
        case 'date_desc':
          sortQuery = 'ORDER BY A.TRANSACTION_DATE DESC';
          break;
        default:
          sortQuery = '';
          break;
      }
  
        resultsElement = await selectTransaction(page, limit, searchTerm, sortQuery);
        totalItems = await countTransaction(searchTerm);

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

router.post('/detail', verifyToken, async (req, res) => {
    try {
      const { trxId, page = '', limit = ''} = req.body;
      let resultsElement, totalItems;
  
        resultsElement = await selectTransactionDetail(trxId, page, limit);
        totalItems = await countTransactionsDetail(trxId);

      if (resultsElement.length === 0) {
        return res.status(200).send({
          status: false,
          message: 'Data not found.',
          data: [],
        //   totalItems: 0,
        });
      }
      return res.status(200).send({
        status: true,
        message: 'Data available',
        data: resultsElement,
        // totalItems: totalItems,
      });
    } catch (error) {
      return res.status(500).send({
        status: false,
        message: error.message,
        data: [],
      });
    }
  });

router.get('/download', verifyToken, async (req, res) => {
    try {
      const { searchTerm = '', sortBy = '' } = req.query; 
  
      let transactions = await selectTransaction(1, 1000, searchTerm, sortBy); 
  
      if (transactions.length < 1) {
        return res.send({
          status: false,
          message: 'Download Failed, no data found',
        });
      }
  
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');
      worksheet.columns = [
        { header: 'Transaction ID', key: 'ID_TRANSACTIONS', width: 10 },
        { header: 'Customer Name', key: 'CUST_NAME', width: 15 },
        { header: 'Total Amount', key: 'TOTAL_AMOUNT', width: 10 },
        { header: 'Transaction Date', key: 'DATE', width: 25 },
      ];
  
   
      transactions.forEach((row) => {
        worksheet.addRow({
          ID_TRANSACTIONS: row.ID_TRANSACTIONS,
          CUST_NAME: row.CUST_NAME,
          TOTAL_AMOUNT: row.TOTAL_AMOUNT,
          DATE: row.DATE,
        });
      });
  
     
      const detailWorksheet = workbook.addWorksheet('Transaction Details');
      detailWorksheet.columns = [
        { header: 'Transaction ID', key: 'ID_TRANSACTIONS', width: 10 },
        { header: 'Product Name', key: 'PRODUCT_NAME', width: 20 },
        { header: 'Quantity', key: 'QUANTITY', width: 10 },
        { header: 'Price', key: 'PRICE', width: 10 },
        { header: 'Total', key: 'TOTAL', width: 10 },
      ];
  
     
      for (let transaction of transactions) {
        const details = await selectTransactionDetail(transaction.ID_TRANSACTIONS);
        details.forEach((detail) => {
          detailWorksheet.addRow({
            ID_TRANSACTIONS: transaction.ID_TRANSACTIONS,
            PRODUCT_NAME: detail.PRODUCT_NAME,
            QUANTITY: detail.QUANTITY,
            PRICE: detail.PRICE,
            TOTAL: detail.PRICE * detail.QUANTITY,
          });
        });
      }
  
      const fileName = 'transaction-data.xlsx';
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return res.status(500).send({
        status: false,
        message: error.message,
      });
    }
  });

export default router;