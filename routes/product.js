import express from 'express';
import dotenv from 'dotenv'
import {getConnection} from '../config/db.js'
import Excel from 'exceljs';
import verifyToken from '../authentication/verifyToken.js';

dotenv.config()
const router = express.Router()


const selectProducts = (page, limit, searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
          if (page !== undefined && limit !== undefined) {
            const offset = (page - 1) * limit;
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ?
                      LIMIT ? OFFSET ?
                  `;
            params = [`%${searchTerm || ''}%`, limit, offset];
          } else {
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ?
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

const countProducts = (searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          const query = `
                  SELECT COUNT(*) AS total
                  FROM PRODUCTS
                  WHERE NAME LIKE ?
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

const addProducts = (dataProducts) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          connection.query(
            `INSERT INTO PRODUCTS ` +
              `(NAME, PRICE, ID_CATEGORY, STOCK, IMAGE)` +
              `VALUES(?, ?, ?, ?, ?)`,
            [dataProducts.PRODUCT_NAME, dataProducts.PRICE, dataProducts.CATEGORY, dataProducts.STOCK, dataProducts.IMAGE],
            (error, elements) => {
              connection.release();
              if (error) {
                return reject(error);
              }
              return resolve(elements);
            },
          );
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  const selectCategory = (page, limit, searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
          
            const offset = (page - 1) * limit;
            query = `
                      SELECT ID_CATEGORY, CATEGORY_NAME FROM CATEGORY
                  `;
            params = [];
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

router.post('/', verifyToken, async (req, res) => {
    try {
      const { page = '', limit = '', searchTerm = ''} = req.body;
      let resultsElement, totalItems;
  
        resultsElement = await selectProducts(page, limit, searchTerm);
        totalItems = await countProducts(searchTerm);

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

router.get('/download', async (req, res) => {
    try {
      let resultElements;
      resultElements = await selectProducts();
      if (resultElements.length < 1) {
        return res.send({
          status: false,
          message: 'Download Failed',
        });
      }
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Sheet 1');
      worksheet.columns = [
        { header: 'Product Name', key: 'NAME', width: 10 },
        { header: 'Category', key: 'CATEGORY', width: 10 },
        { header: 'Price', key: 'PRICE', width: 10 },
        { header: 'Stock', key: 'STOCK', width: 10 },
      ];
      resultElements.forEach((row) => {
        worksheet.addRow({
          NAME: row.NAME,
          CATEGORY: row.CATEGORY,
          PRICE: row.PRICE,
          STOCK: row.STOCK,
        });
      });
      const fileName = `product-data.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      workbook.xlsx.write(res).then(() => {
        res.end();
      });
    } catch (error) {
      //console.log(error);
      return res.status(401).send({
        status: false,
        message: error.message,
      });
    }
  });

router.post('/add', async (req, res) => {
    try {
      const {
        prodName,
        price,
        category,
        stock,
        imageUrl
      } = req.body;
  
      if (!prodName) {
        return res.status(200).send({
          status: false,
          message: 'Product name cant be empty',
        });
      }
      if (!category) {
        return res.status(200).send({
          status: false,
          message: 'Category must be choosed',
        });
      }
      if (!price) {
        return res.status(200).send({
          status: false,
          message: 'Price cant be empty',
        });
      }
      if (!stock) {
        return res.status(200).send({
          status: false,
          message: 'Stock cant be empty',
        });
      }
      
      // const parsedDate = parse(dob, 'dd-MM-yyyy', new Date());
      // const outputDate = format(parsedDate, 'yyyy-MM-dd');
      // const emailChecks = await emailCheck(email);
      // if(emailChecks.length > 0){
      //     return res.status(200).send({
      //         "status": false,
      //         "message": "Email ini tidak bisa digunakan/sudah pernah terdaftar"
      //     });
      // }
      // const prefixUsr = await getPrefix('PREFIX_USR');
      // const prefixPatient = await getPrefix('PREFIX_PTN');
      // const usrIdGenerated = generateId(prefixUsr[0].VAL4);
      // const patiendIdGenerated = generateId(prefixPatient[0].VAL4);

      const dataProducts = {
       PRODUCT_NAME: prodName,
       PRICE: price,
       CATEGORY: category,
       STOCK: stock,
       IMAGE: imageUrl
      };
      await addProducts(dataProducts);
  
      return res.status(200).send({
        status: true,
        message: 'Add product success',
      });
    } catch (error) {
      //console.log(error);
      return res.status(401).send({
        status: true,
        message: error.message,
        data: null,
      });
    }
  });

router.post('/category', async (req, res) => {
    try {
      let resultsElement

        resultsElement = await selectCategory();
      
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