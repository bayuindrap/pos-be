import express from 'express';
import { getConnection } from '../config/db.js';
import verifyToken from '../authentication/verifyToken.js';

const router = express.Router();

// Query to get daily transaction data per category
// const getDailyTransactionData = () => {
//   return new Promise((resolve, reject) => {
//     getConnection()
//       .then((connection) => {
//         const query = `
//           SELECT 
//             DATE(B.TRANSACTION_DATE) AS transaction_date, 
//             D.CATEGORY_NAME, 
//             SUM(A.QUANTITY) AS total_quantity, 
//             SUM(A.SUBTOTAL) AS total_subtotal,
//             D.ID_CATEGORY
//           FROM transaction_detail A
//           LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
//           LEFT JOIN PRODUCTS C ON A.ID_PRODUCTS = C.ID_PRODUCTS
//           LEFT JOIN CATEGORY D ON C.ID_CATEGORY = D.ID_CATEGORY
//           WHERE D.CATEGORY_NAME IN ('Flat Glass', 'Automotive Glass')
//           GROUP BY DATE(B.TRANSACTION_DATE), D.CATEGORY_NAME, D.ID_CATEGORY
//           ORDER BY transaction_date;
//         `;
//         connection.query(query, [], (error, results) => {
//           connection.release();
//           if (error) {
//             return reject(error);
//           }
//           return resolve(results);
//         });
//       })
//       .catch((error) => {
//         reject(error);
//       });
//   });
// };

router.get('/transaction-chart', verifyToken, async (req, res) => {
    try {
      const query = `
        SELECT 
          DATE(B.TRANSACTION_DATE) AS transaction_date, 
          D.CATEGORY_NAME, 
          SUM(A.QUANTITY) AS total_quantity, 
          SUM(A.SUBTOTAL) AS total_subtotal,
          D.ID_CATEGORY
        FROM transaction_detail A
        LEFT JOIN TRANSACTIONS B ON A.ID_TRANSACTIONS = B.ID_TRANSACTIONS
        LEFT JOIN PRODUCTS C ON A.ID_PRODUCTS = C.ID_PRODUCTS
        LEFT JOIN CATEGORY D ON C.ID_CATEGORY = D.ID_CATEGORY
        WHERE D.CATEGORY_NAME IN ('Flat Glass', 'Automotive Glass')
        GROUP BY DATE(B.TRANSACTION_DATE), D.CATEGORY_NAME, D.ID_CATEGORY
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
  
      // Verifikasi hasil query dan kirim respons jika data ada
      if (!results || results.length === 0) {
        return res.status(404).send({
          status: false,
          message: 'No data found for the given categories',
        });
      }
  
      return res.status(200).send({
        status: true,
        message: 'Data retrieved successfully',
        data: results, // Mengirim data hasil query
      });
    } catch (error) {
      return res.status(500).send({
        status: false,
        message: error.message,
      });
    }
  });
  

router.get('/transaction-chart', verifyToken, async (req, res) => {
  try {
    const results = await getDailyTransactionData();

    // Group data by category
    const categories = { 'Flat Glass': [], 'Automotive Glass': [] };
    results.forEach((row) => {
      if (row.CATEGORY_NAME === 'Flat Glass') {
        categories['Flat Glass'].push({
          date: row.transaction_date,
          total_quantity: row.total_quantity,
          total_subtotal: row.total_subtotal,
        });
      } else if (row.CATEGORY_NAME === 'Automotive Glass') {
        categories['Automotive Glass'].push({
          date: row.transaction_date,
          total_quantity: row.total_quantity,
          total_subtotal: row.total_subtotal,
        });
      }
    });

    // Prepare data for the chart
    const chartData = {
        labels: [...new Set([...categories['Flat Glass'].map(item => item.date), ...categories['Automotive Glass'].map(item => item.date)])],
        datasets: [
          {
            label: 'Flat Glass - Quantity',
            data: categories['Flat Glass'].map(item => item.total_quantity),
            borderColor: '#3e95cd',
            fill: false,
          },
          {
            label: 'Flat Glass - Subtotal',
            data: categories['Flat Glass'].map(item => item.total_subtotal),
            borderColor: '#3e95cd',
            fill: false,
            borderDash: [5, 5],
          },
          {
            label: 'Automotive Glass - Quantity',
            data: categories['Automotive Glass'].map(item => item.total_quantity),
            borderColor: '#8e5ea2',
            fill: false,
          },
          {
            label: 'Automotive Glass - Subtotal',
            data: categories['Automotive Glass'].map(item => item.total_subtotal),
            borderColor: '#8e5ea2',
            fill: false,
            borderDash: [5, 5],
          },
        ],
      };
      

    res.status(200).send({
      status: true,
      message: 'Transaction data for chart generated successfully',
      data: chartData,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: error.message,
    });
  }
});

export default router;
