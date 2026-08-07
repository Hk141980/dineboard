# 🍽️ DineBoard — Multi-Tenant SaaS Restaurant Management System

> **Your restaurant, beautifully managed.**

DineBoard is a full-featured SaaS platform for restaurant management with AI-powered WhatsApp chatbot, smart table booking, multi-tenant architecture, and integrated payments.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone & Setup
```bash
cd dineboard
cp .env.example backend/.env
```

### 2. Start Infrastructure (PostgreSQL + Redis)
```bash
docker-compose up -d postgres redis
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

### 4. Install Frontend Dependencies
```bash
cd frontend/web
npm install
cd ../..
```

### 5. Start Development Servers
```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Next.js Frontend
cd frontend/web && npm run dev
```

### 6. Access the Application
| Service | URL |
|---|---|
| **Landing Page** | http://localhost:3000 |
| **Admin Panel** | http://localhost:3000/admin |
| **Super Admin** | http://localhost:3000/superadmin |
| **API Server** | http://localhost:4000/api |
| **Customer Page** | Open `frontend/customer/index.html` |

---

## 🏗️ Architecture

```
dineboard/
├── backend/                  # Node.js + Express API
│   ├── prisma/               # Database schema & migrations
│   ├── src/
│   │   ├── ai/               # Gemini AI chatbot engine
│   │   ├── config/           # Service configurations
│   │   ├── middleware/        # Auth, tenant, rate-limit
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── jobs/             # BullMQ background workers
│   │   └── app.js            # Entry point
│   └── package.json
│
├── frontend/
│   ├── customer/             # Tenant-branded customer page
│   │   └── index.html
│   └── web/                  # Next.js (Landing + Admin)
│       └── src/app/
│           ├── (landing)/    # Public pages
│           ├── admin/        # Tenant admin panel
│           └── superadmin/   # Platform admin
│
├── docker-compose.yml
└── .env.example
```

## 🔑 Key Features

- **Multi-Tenant Architecture** — PostgreSQL RLS for data isolation
- **AI WhatsApp Chatbot** — Gemini-powered, supports Hindi/English/Hinglish
- **Smart Table Booking** — Configurable slots (45 min dining + 15 min cleaning)
- **Razorpay Integration** — Subscriptions + Route for commission auto-splits
- **Zero Customer Registration** — Order & book without login
- **GST Invoicing** — Auto-generated invoices with CGST/SGST
- **Staff Management** — Role-based access (owner/manager/waiter/chef/cashier)
- **Real-time Reports** — Available via web and WhatsApp

## 📄 License

Proprietary — All rights reserved.
