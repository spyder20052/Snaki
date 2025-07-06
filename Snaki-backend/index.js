require('dotenv').config();
const express = require('express');
const cors = require('cors');
const FedaPay = require('fedapay');
const app = express();

app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());

FedaPay.apiKey = process.env.FEDAPAY_SECRET_KEY;
FedaPay.environment = process.env.FEDAPAY_ENV || 'sandbox';

app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, customer, metadata } = req.body;
    const payment = await FedaPay.Payment.create({
      amount,
      currency: 'XOF',
      description: 'Commande Snaki',
      callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      customer,
      metadata
    });
    res.json({ paymentUrl: payment.payment_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FedaPay backend listening on port ${PORT}`);
});
