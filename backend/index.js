const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aqable_branch_2';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..')));

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        img: { type: String, trim: true },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

const Contact = mongoose.model('Contact', contactSchema);
const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSchema);
const Order = mongoose.model('Order', orderSchema);

const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const contact = await Contact.create({ name, email, message });
  res.status(201).json({ message: 'Message saved.', id: contact._id });
});

app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email?.trim() || !isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const subscriber = await NewsletterSubscriber.create({ email });
    res.status(201).json({ message: 'Subscription saved.', id: subscriber._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This email is already subscribed.' });
    }
    throw error;
  }
});

app.post('/api/orders', async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must include at least one item.' });
  }

  const cleanItems = items.map((item) => ({
    name: String(item.name || '').trim(),
    price: Number(item.price),
    quantity: Number(item.quantity),
    img: String(item.img || '').trim(),
  }));

  const hasInvalidItem = cleanItems.some(
    (item) => !item.name || !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity < 1
  );

  if (hasInvalidItem) {
    return res.status(400).json({ error: 'Order contains invalid items.' });
  }

  const total = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({ items: cleanItems, total });
  res.status(201).json({ message: 'Order saved.', id: order._id, total });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log('MongoDB connected');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
