import cors from 'cors'
import dotenv from 'dotenv'
import bearerToken from 'express-bearer-token';
import express from 'express';
import authRoute from './routes/auth.js'
import productRoute from './routes/product.js'
import transactionRoute from './routes/transactions.js'
import dashboardRoutes from './routes/dashboard.js'

dotenv.config();



const app = express()

const PORT = process.env.PORT;

app.use(cors())
app.use(bearerToken())
app.use(express.json())



app.use('/login', authRoute)
app.use('/products', productRoute)
app.use('/transaction', transactionRoute)
app.use('/dashboard', dashboardRoutes)



app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

app.listen(PORT, () => console.log('API available on port:', PORT))