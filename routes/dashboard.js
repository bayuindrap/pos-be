import express from 'express';
import { getConnection } from '../config/db.js';
import verifyToken from '../authentication/verifyToken.js';

const router = express.Router();

router.get('/transaction-chart', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        DATE(B.TRANSACTION_DATE) AS transaction_date, 
        D.CATEGORY_NAME, 
        SUM(A.SUBTOTAL) AS total_subtotal
        FROM transaction_detail A
        LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
        LEFT JOIN PRODUCTS C ON A.ID_PRODUCTS = C.ID_PRODUCTS
        LEFT JOIN CATEGORY D ON C.ID_CATEGORY = D.ID_CATEGORY
        WHERE D.CATEGORY_NAME IN ('Flat Glass', 'Automotive Glass')
        GROUP BY DATE(B.TRANSACTION_DATE), D.CATEGORY_NAME
        ORDER BY transaction_date;
    `;

    const results = await getConnection()
      .then((connection) => {
        return new Promise((resolve, reject) => {
          connection.query(query, [], (error, results) => {
            connection.release();
            if (error) {
              return reject(error);
            }
            resolve(results);
          });
        });
      });

    if (!results || results.length === 0) {
      return res.status(404).send({
        status: false,
        message: 'Data not found',
      });
    }

    return res.status(200).send({
      status: true,
      message: 'Data available',
      data: results,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: error.message,
    });
  }
});

export default router;