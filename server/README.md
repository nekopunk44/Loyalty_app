# Loyalty App Backend Server

Express + PostgreSQL + Sequelize backend for the Villa Jaconda loyalty app.

## Requirements

- Node.js 18+
- npm
- PostgreSQL database

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill `.env` with real values:

```env
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/loyalty_app
JWT_SECRET=generate-a-long-random-secret
API_BASE_URL=http://localhost:5002
CORS_ORIGIN=http://localhost:3000,http://localhost:19006,http://localhost:19000
```

Run migrations and start the server:

```bash
npm run migrate
npm run dev
```

Health check:

```bash
curl http://localhost:5002/health
```

## Security Notes

- `JWT_SECRET` is required in production.
- Finance endpoints require `adminLevel === 1`.
- Booking detail and payment-status endpoints are limited to the booking owner or an admin.
- Demo card top-ups are allowed only outside production, or when `ALLOW_DEMO_PAYMENTS=true`.
- In production, card top-ups must be confirmed by a real payment provider/webhook before balance changes.

## Useful Scripts

```bash
npm start          # start server
npm run dev        # start with nodemon
npm run migrate    # run Sequelize migrations
npm run seed       # seed development data
npm run check      # syntax-check server/index.js
```

## Main Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/properties`
- `POST /api/bookings`
- `GET /api/bookings/:bookingId`
- `POST /api/bookings/:bookingId/pay-from-card`
- `GET /api/admin/finances/summary`
- `POST /api/admin/finances/withdrawal`

Most API endpoints require `Authorization: Bearer <token>`.
