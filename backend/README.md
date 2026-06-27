# Aqable Branch 2 Backend

This backend connects the site to MongoDB and saves:

- Contact form messages
- Newsletter subscriptions
- Cart checkout orders

## Setup

1. Start MongoDB locally, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` in `.env`.
4. Start the server:

```bash
npm start
```

Open `http://localhost:3000` to use the site with the database-connected API.
