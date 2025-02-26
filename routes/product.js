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
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY, A.IMAGE, A.ID_PRODUCTS, A.ID_CATEGORY, A.STATUS
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ?
                      LIMIT ? OFFSET ?
                  `;
            params = [`%${searchTerm || ''}%`, limit, offset];
          } else {
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY, A.IMAGE, A.ID_PRODUCTS, A.ID_CATEGORY, A.STATUS
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

const selectProductPOS = (page, limit, searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
          if (page !== undefined && limit !== undefined) {
            const offset = (page - 1) * limit;
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY, A.IMAGE, A.ID_PRODUCTS, A.ID_CATEGORY, A.STATUS
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ? AND STATUS = '1'
                      LIMIT ? OFFSET ?
                  `;
            params = [`%${searchTerm || ''}%`, limit, offset];
          } else {
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY, A.IMAGE, A.ID_PRODUCTS, A.ID_CATEGORY, A.STATUS
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ? AND STATUS = '1'
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

const selectAllProducts = (searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          let query, params;
            query = `
                      SELECT A.NAME, A.PRICE, A.STOCK, A.IMAGE, B.CATEGORY_NAME AS CATEGORY, A.IMAGE, A.ID_PRODUCTS
                      FROM PRODUCTS A
                      LEFT JOIN CATEGORY B ON A.ID_CATEGORY = B.ID_CATEGORY
                      WHERE A.NAME LIKE ?
                  `;
            params = [`%${searchTerm || ''}%`];
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

const countProductPOS = (searchTerm) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          const query = `
                  SELECT COUNT(*) AS total
                  FROM PRODUCTS
                  WHERE NAME LIKE ? AND STATUS = '1'
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

const checkProductExists = (productName) => {
  return new Promise((resolve, reject) => {
    getConnection()
      .then((connection) => {
        connection.query(
          `SELECT * FROM PRODUCTS WHERE NAME = ?`,
          [productName],
          (error, results) => {
            connection.release();
            if (error) {
              return reject(error);
            }
            return resolve(results.length > 0 ? results[0] : null);
          }
        );
      })
      .catch((error) => {
        reject(error);
      });
  });
  };

const updateProductStock = (idProduct, additionalStock) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          connection.query(
            `UPDATE PRODUCTS SET STOCK = STOCK + ? WHERE ID_PRODUCTS = ?`,
            [additionalStock, idProduct],
            (error, results) => {
              connection.release();
              if (error) {
                return reject(error);
              }
              return resolve(results);
            }
          );
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
              `(ID_PRODUCTS, NAME, PRICE, ID_CATEGORY, STOCK, IMAGE)` +
              `VALUES(?, ?, ?, ?, ?, ?)`,
            [dataProducts.PRODUCT_ID, dataProducts.PRODUCT_NAME, dataProducts.PRICE, dataProducts.CATEGORY, dataProducts.STOCK, dataProducts.IMAGE],
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

const getLastProdId = () => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          connection.query(
            'SELECT ID_PRODUCTS FROM PRODUCTS ORDER BY ID_PRODUCTS DESC LIMIT 1',
            [],
            (error, results) => {
              connection.release();
              if (error) {
                return reject(error);
              }
              if (results.length > 0) {
                
                const lastId = results[0].ID_PRODUCTS;
  
                // Ekstrak bagian numerik dari lastId menggunakan regex untuk menangani format yang berbeda (VID00010, VID00100, dll)
                const numericPart = parseInt(lastId.match(/\d+/)[0]);
  
                // Tambahkan 1 ke bagian numerik dan pad dengan nol di depan agar memiliki 5 digit
                const newId = 'GLS' + String(numericPart + 1).padStart(3, '0');
                return resolve(newId);
              } else {
                return resolve('GLS');
              }
            },
          );
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

const deleteProduct = (idProduct) => {
    return new Promise((resolve, reject) => {
      getConnection()
        .then((connection) => {
          connection.query(
            'DELETE FROM PRODUCTS WHERE ID_PRODUCTS = ?',
            [idProduct],
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

const updateData = (prodName, prodPrice, category, status, idProduct) => {
    return new Promise((resolve, reject) => {
        getConnection().then(connection => {
            connection.query('UPDATE PRODUCTS SET NAME = ?, PRICE = ?, ID_CATEGORY = ?, STATUS = ? WHERE ID_PRODUCTS = ?', [prodName, prodPrice, category, status, idProduct], (error, elements) => {
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

router.post('/pos', verifyToken, async (req, res) => {
    try {
      const { page = '', limit = '', searchTerm = ''} = req.body;
      let resultsElement, totalItems;
  
        resultsElement = await selectProductPOS(page, limit, searchTerm);
        totalItems = await countProductPOS(searchTerm);

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

router.post('/all', verifyToken, async (req, res) => {
    try {
      const { searchTerm = ''} = req.body;
      let resultsElement
  
        resultsElement = await selectAllProducts(searchTerm);

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

router.get('/download', verifyToken, async (req, res) => {
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
        { header: 'Url Image', key: 'IMAGE', width: 10 },
      ];
      resultElements.forEach((row) => {
        worksheet.addRow({
          NAME: row.NAME,
          CATEGORY: row.CATEGORY,
          PRICE: row.PRICE,
          STOCK: row.STOCK,
          IMAGE: row.IMAGE,
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
      return res.status(400).send({
        status: false,
        message: error.message,
      });
    }
  });

router.post('/add', verifyToken, async (req, res) => {
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
      
      const existingProduct = await checkProductExists(prodName);
      if (existingProduct) {
        return res.status(200).send({
          status: false,
          message: 'Product already exists',
          data: existingProduct
        });
      }
      
      const prodId = await getLastProdId()
     
      const dataProducts = {
       PRODUCT_ID: prodId,
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
      return res.status(400).send({
        status: false,
        message: error.message,
        data: null,
      });
    }
  });

router.post('/delete', async (req, res) => {
    try {
      const { idProduct } = req.body;
      const resultsEmelement = await deleteProduct(idProduct);
      if (resultsEmelement.affectedRows < 0) {
        return res.status(200).send({
          status: false,
          message: 'Delte unsuccesfull',
        });
      }
      return res.status(200).send({
        status: true,
        message: 'Delete data success',
        data: resultsEmelement,
      });
    } catch (error) {
      return res.status(400).send({
        status: false,
        message: error.message,
        data: null,
      });
    }
  });

router.post('/category', verifyToken, async (req, res) => {
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

router.post('/edit', verifyToken, async (req, res) => {
    try {
        const {prodName, prodPrice, category, status, idProduct} = req.body;
        const resultsEmelement = await updateData(prodName, prodPrice, category, status, idProduct);
        if(resultsEmelement.affectedRows < 0){
            return res.status(200).send({
                "status": false,
                "message": `Update ${prodName} unsuccessfull`
            });
        }
        return res.status(200).send({
            "status": true,
            "message": "Data product updated",
            "data": resultsEmelement
        });
    } catch (error) {
        //console.log(error);
        return res.status(400).send({
            "status": false,
            "message": error.message,
            "data":null
        });
    }

});

router.post('/update-stock', verifyToken, async (req, res) => {
  try {
    const { idProduct, additionalStock } = req.body;

    if (!idProduct) {
      return res.status(200).send({
        status: false,
        message: 'Product id cant be empty',
      });
    }

    if (!additionalStock || additionalStock <= 0) {
      return res.status(200).send({
        status: false,
        message: 'Invalid stock amount',
      });
    }

    await updateProductStock(idProduct, additionalStock);

    return res.status(200).send({
      status: true,
      message: 'Stock updated successfully',
    });
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message,
      data: null,
    });
  }
});

export default router;