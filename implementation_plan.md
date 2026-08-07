# 🍽️ DineBoard — Multi-Tenant SaaS Restaurant Management System

## System Architecture & Product Design (v2 — Updated)

> **Platform Name: DineBoard** — *Your restaurant, beautifully managed.*

### Decisions Made

| Question | Decision | Rationale |
|---|---|---|
| **Platform Name** | **DineBoard** | Clean, professional, implies a dashboard for dining management |
| **Admin Panel** | **Next.js 14+ (React + TypeScript)** | Rich interactivity, SSR for SEO, component reusability, best DX |
| **ORM** | **Prisma** | Modern, type-safe, auto-generated types, excellent migration system |
| **WhatsApp BSP** | **Wati** | Best flow builder in India, supports multiple numbers per account, good API docs |
| **Deployment** | **AWS** | ECS Fargate + RDS + ElastiCache + S3 + CloudFront |
| **AI Engine** | **Google Gemini API** | Best price/performance for NLU, supports Hindi+English, generous free tier |

---

## Market Research & Competitive Analysis

| Platform | Strengths | DineBoard's Edge |
|---|---|---|
| **Toast** (US) | All-in-one POS, hardware | We're **hardware-free**, WhatsApp-first for India |
| **SevenRooms** | Guest data, reservations | **AI chatbot** + commission-based pricing |
| **OrderIt / SwadPOS** (India) | GST, Zomato/Swiggy | **Full multi-tenancy + AI WhatsApp ordering** |
| **Square** | Easy setup, payments | **Razorpay** (India-native) with Route for splits |
| **Petpooja** (India) | POS + inventory | **AI-powered table booking + slot management** |

### DineBoard's Key Differentiators
1. **AI-Powered WhatsApp Chatbot**: Natural language ordering, booking, bill requests — powered by Gemini AI
2. **Dual Revenue Model**: Subscription + Commission on ALL transactions (even with own Razorpay)
3. **Zero Registration for Customers**: No login/signup needed
4. **Smart Table Management**: Configurable slots (default 45 dining + 15 cleaning)
5. **Per-Restaurant WhatsApp Number**: Each restaurant gets their own branded WhatsApp presence
6. **Platform Landing Page**: Professional company page with registration, demo, about us, policies

---

## High-Level Product Overview

```mermaid
graph TB
    subgraph "DineBoard Platform"
        LP["🌐 Landing Page<br/>(dineboard.in)<br/>Registration + Demo + About"]
        SA["Super Admin Dashboard"]
        BP["Billing & Plans<br/>(Razorpay Subscriptions)"]
        CM["Commission Engine<br/>(Always Active)"]
        AI["🤖 Gemini AI Engine"]
    end
    
    subgraph "Tenant Layer (Restaurant Owner)"
        TA["Tenant Admin Panel<br/>(Next.js)"]
        RM["Restaurant Manager"]
        SM["Staff Management"]
        MM["Menu Manager"]
        TM["Table Manager"]
        BM["Booking Manager"]
        OM["Order Manager"]
        PM["Promo & Discount"]
        IM["Invoice & GST"]
        RP["Reports & Analytics"]
    end
    
    subgraph "Customer Channels"
        CW["Customer Web App<br/>(Tenant Branded Page)"]
        WA["WhatsApp Chatbot<br/>(Per-Restaurant Number)"]
    end

    subgraph "AWS Infrastructure"
        DB[(RDS PostgreSQL<br/>Multi-Tenant DB)]
        RD[(ElastiCache Redis<br/>Cache + Queues)]
        WH["Wati WhatsApp API<br/>(Multi-Number)"]
        RZ["Razorpay<br/>Payments"]
        S3["S3 + CloudFront<br/>(Logos, Invoices, Assets)"]
    end

    LP --> SA
    SA --> BP & CM
    TA --> RM & SM & MM & TM & BM & OM & PM & IM & RP
    CW --> OM & BM
    WA --> AI --> OM & BM & RP
    OM --> RZ
    BM --> WH
    TA --> DB
    CW --> DB
    WA --> DB
    OM --> DB
    BM --> RD
```

---

## 1. Platform Landing Page (dineboard.in)

> [!NOTE]
> This is the **first page restaurant owners see**. It's a marketing + registration page for your company.

### Pages & Sections

| Page | Content |
|---|---|
| **Home (/)** | Hero section with tagline, demo video (autoplay muted), feature highlights, pricing plans, CTA "Start Free Trial", client testimonials/logos, footer |
| **Features (/features)** | Detailed feature breakdown: ordering, booking, WhatsApp AI, payments, reports |
| **Pricing (/pricing)** | Subscription plans comparison table (Basic/Pro/Enterprise), commission rates, FAQ |
| **About Us (/about)** | Company story, team, mission/vision, contact info |
| **Demo Video (/demo)** | Embedded walkthrough video of the product |
| **Registration (/register)** | Multi-step signup form: Owner details → Restaurant info → Choose plan → Razorpay payment |
| **Login (/login)** | Owner/Staff login to admin panel |
| **Privacy Policy (/privacy)** | GDPR/IT Act compliant privacy policy |
| **Terms & Conditions (/terms)** | Service agreement, usage terms, liability |
| **Refund Policy (/refund)** | Subscription refund policy |
| **Contact (/contact)** | Contact form, email, phone, office address |

### Landing Page Tech
- **Built with**: Next.js (same repo as admin panel, different routes)
- **Animations**: Framer Motion for scroll animations
- **Demo Video**: Hosted on S3 + CloudFront CDN
- **SEO**: Full meta tags, structured data, sitemap.xml

---

## 2. Multi-Tenant Architecture

**Shared Database, Shared Schema** with PostgreSQL **Row-Level Security (RLS)**.

```mermaid
graph LR
    subgraph "Single RDS PostgreSQL Instance"
        direction TB
        MT["Master Tables<br/>(tenants, plans, subscriptions,<br/>platform_commissions)"]
        TT["Tenant-Scoped Tables<br/>(menu_items, tables, bookings,<br/>orders, staff, invoices)"]
    end
    
    subgraph "Application Layer"
        MW["Tenant Middleware<br/>(extracts tenant_id from<br/>JWT / URL slug)"]
    end
    
    MW -->|"SET app.current_tenant = 'xyz'"| MT
    MW -->|"RLS auto-filters by tenant_id"| TT
```

**How it works:**
1. Every API request includes the tenant context (from JWT token for admin, or from URL slug `?r=tinas-fusion` for customer)
2. Backend middleware sets `SET app.current_tenant = '<tenant_id>'` on the database session
3. PostgreSQL RLS policies automatically filter ALL queries to that tenant's data
4. Even if code has a bug, the database **physically prevents** cross-tenant data access

---

## 3. Database Schema

```mermaid
erDiagram
    TENANTS {
        uuid id PK
        string name
        string slug UK
        string logo_url
        string phone
        string whatsapp_number "restaurant's own WA number"
        string wati_phone_id "Wati phone ID for this number"
        string address
        string gst_number
        time opening_time
        time closing_time
        string primary_color
        string tagline
        string description
        int booking_slot_minutes "default 60"
        int dining_minutes "default 45"
        int cleaning_minutes "default 15"
        jsonb payment_config "own Razorpay keys if any"
        bool uses_own_razorpay "false by default"
        string subscription_plan_id FK
        string razorpay_subscription_id
        string status "active/suspended/trial"
        timestamp trial_ends_at
    }

    SUBSCRIPTION_PLANS {
        uuid id PK
        string name "Basic/Pro/Enterprise"
        decimal monthly_price
        decimal yearly_price
        decimal commission_rate "% per order - ALWAYS applies"
        decimal booking_commission "% per booking - ALWAYS applies"
        int max_tables
        int max_staff
        int max_menu_items
        jsonb features "AI chatbot, reports, etc"
    }

    PLATFORM_COMMISSIONS {
        uuid id PK
        uuid tenant_id FK
        uuid order_id FK "nullable"
        uuid booking_id FK "nullable"
        string type "order_commission/booking_commission"
        decimal transaction_amount
        decimal commission_rate
        decimal commission_amount
        string collection_method "razorpay_route/invoice"
        string status "pending/collected/invoiced"
        timestamp collected_at
    }

    STAFF {
        uuid id PK
        uuid tenant_id FK
        string name
        string email UK
        string password_hash
        enum role "owner/manager/waiter/chef/cashier"
        bool is_active
    }

    MENU_ITEMS {
        uuid id PK
        uuid tenant_id FK
        string name
        string description
        decimal price
        string category
        bool is_veg
        bool is_available
        int sort_order
        string image_url
    }

    TABLES {
        uuid id PK
        uuid tenant_id FK
        string name "Table 1, VIP Booth, etc"
        int capacity
        string section "Indoor/Outdoor/Rooftop"
        bool is_active
        string status "available/occupied/reserved/cleaning"
    }

    BOOKINGS {
        uuid id PK
        uuid tenant_id FK
        string booking_code UK
        date booking_date
        time booking_time
        time end_time "auto-calculated"
        int guests
        string customer_name
        string customer_phone
        string customer_email
        string note
        enum source "website/whatsapp"
        enum status "confirmed/cancelled/completed/no-show"
        decimal discount_amount
        string promo_code_used
    }

    BOOKING_TABLES {
        uuid booking_id FK
        uuid table_id FK
    }

    ORDERS {
        uuid id PK
        uuid tenant_id FK
        string order_code UK
        uuid booking_id FK "nullable"
        string customer_name
        string customer_phone
        string note
        enum source "website/whatsapp"
        enum status "pending/confirmed/preparing/ready/served/billed/paid"
        decimal subtotal
        decimal discount_amount
        decimal gst_amount
        decimal total
        string promo_code_used
        uuid assigned_table_id FK
        jsonb payment_info
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        string item_name "snapshot"
        decimal item_price "snapshot"
        int quantity
        decimal line_total
    }

    PROMO_CODES {
        uuid id PK
        uuid tenant_id FK
        string code UK
        enum discount_type "percentage/flat"
        decimal discount_value
        decimal min_order_amount
        date valid_from
        date valid_until
        int max_uses
        int used_count
        bool is_active
    }

    INVOICES {
        uuid id PK
        uuid tenant_id FK
        uuid order_id FK
        string invoice_number
        decimal subtotal
        decimal cgst
        decimal sgst
        decimal igst
        decimal total
        string gst_number
        string pdf_url
        timestamp generated_at
    }

    AI_CONVERSATION_LOGS {
        uuid id PK
        uuid tenant_id FK
        string customer_phone
        string message_in
        string message_out
        string detected_intent
        float confidence_score
        jsonb context "conversation memory"
        timestamp created_at
    }

    TENANTS ||--o{ STAFF : employs
    TENANTS ||--o{ MENU_ITEMS : offers
    TENANTS ||--o{ TABLES : has
    TENANTS ||--o{ BOOKINGS : receives
    TENANTS ||--o{ ORDERS : processes
    TENANTS ||--o{ PROMO_CODES : creates
    TENANTS ||--o{ PLATFORM_COMMISSIONS : accrues
    TENANTS ||--o{ AI_CONVERSATION_LOGS : tracks
    TENANTS ||--|| SUBSCRIPTION_PLANS : subscribes_to
    BOOKINGS ||--|{ BOOKING_TABLES : reserves
    BOOKING_TABLES }|--|| TABLES : maps_to
    ORDERS ||--|{ ORDER_ITEMS : contains
    ORDER_ITEMS }|--|| MENU_ITEMS : references
    ORDERS ||--o| INVOICES : generates
    ORDERS ||--o| BOOKINGS : linked_to
```

---

## 4. Payment & Commission Architecture (Updated)

> [!IMPORTANT]
> **Commission ALWAYS applies** — whether the restaurant uses the platform's Razorpay or their own. This is the core revenue model alongside subscriptions.

### How Commission Collection Works

```mermaid
graph TB
    subgraph "Scenario A: Restaurant uses Platform Razorpay"
        A1["Customer pays ₹1000"] --> A2["Payment lands in<br/>DineBoard's Razorpay"]
        A2 --> A3["Razorpay Route API<br/>auto-splits payment"]
        A3 --> A4["DineBoard keeps 5%: ₹50"]
        A3 --> A5["Restaurant gets: ₹950<br/>(via Linked Account)"]
    end

    subgraph "Scenario B: Restaurant uses OWN Razorpay"
        B1["Customer pays ₹1000"] --> B2["Payment goes to<br/>Restaurant's Razorpay"]
        B2 --> B3["DineBoard logs<br/>commission: ₹50"]
        B3 --> B4["Monthly commission invoice<br/>sent to restaurant"]
        B4 --> B5["Restaurant pays invoice<br/>via Razorpay payment link"]
    end

    subgraph "Commission Tracking (Both Scenarios)"
        CT1["Every order/booking<br/>logged in PLATFORM_COMMISSIONS"]
        CT2["Status: pending → collected/invoiced"]
        CT3["Monthly report visible<br/>in both admin panels"]
    end

    style A4 fill:#2d5a2d
    style B3 fill:#5a4a2d
```

**Commission collection methods:**

| Restaurant Payment Setup | Commission Method | How |
|---|---|---|
| Uses **Platform's Razorpay** | **Auto-deducted** via Razorpay Route | Split happens instantly on every payment |
| Uses **Own Razorpay keys** | **Monthly Invoice** | Platform tracks commissions, generates monthly invoice, sends Razorpay payment link |

### Subscription Plans

| Plan | Monthly | Yearly | Commission Rate | Booking Commission | Features |
|---|---|---|---|---|---|
| **Starter** | ₹999 | ₹9,999 | 5% per order | 3% per booking | Menu + Orders + Basic Booking |
| **Pro** | ₹2,499 | ₹24,999 | 3% per order | 2% per booking | + AI Chatbot + Staff Mgmt + Promos |
| **Enterprise** | ₹4,999 | ₹49,999 | 1.5% per order | 1% per booking | + Custom Branding + Priority Support + API Access |

---

## 5. AI-Powered WhatsApp Chatbot Architecture

> [!NOTE]
> The chatbot uses **Google Gemini API** for natural language understanding, making conversations feel human-like rather than rigid menu-driven flows.

### Architecture

```mermaid
graph TB
    subgraph "Customer WhatsApp"
        CM["Customer sends message<br/>to Restaurant's WhatsApp"]
    end

    subgraph "Wati BSP (Multi-Number)"
        WR["Webhook Receiver"]
        WS["Message Sender"]
    end

    subgraph "DineBoard Backend"
        MR["Message Router<br/>(identifies restaurant<br/>from phone number)"]
        
        subgraph "AI Engine"
            GEM["Google Gemini API"]
            CTX["Conversation Context<br/>(Redis - last 10 messages)"]
            SYS["System Prompt<br/>(Restaurant-specific:<br/>menu, timings, tables)"]
        end
        
        subgraph "Intent Handlers"
            I1["📋 view_menu"]
            I2["🛒 place_order"]
            I3["📅 book_table"]
            I4["💰 request_bill"]
            I5["➕ add_to_order"]
            I6["ℹ️ restaurant_info"]
            I7["📊 owner_report"]
            I8["🍽️ recommend_food"]
            I9["💬 general_chat"]
        end
    end

    CM --> WR --> MR
    MR --> GEM
    GEM --> CTX
    SYS --> GEM
    GEM --> I1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9
    I1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9 --> WS --> CM
```

### How AI Chatbot Works

**Step 1: Message arrives** → Wati webhook sends to our backend

**Step 2: Identify restaurant** → Match incoming WhatsApp number to `tenants.wati_phone_id`

**Step 3: Build AI context** → Gemini receives:
- **System prompt** with restaurant's menu, timings, tables, policies
- **Conversation history** (last 10 messages from Redis)
- **Current order state** (if customer has an active order)

**Step 4: Gemini responds with structured output:**
```json
{
  "intent": "place_order",
  "confidence": 0.95,
  "entities": {
    "items": [{"name": "Paneer Tikka", "qty": 1}, {"name": "Dal Makhani", "qty": 2}]
  },
  "response_text": "Great choice! I've added 1 Paneer Tikka (₹280) and 2 Dal Makhani (₹440) to your order. Your total is ₹720. Would you like to add anything else, or shall I confirm?",
  "action": "confirm_or_add_more"
}
```

**Step 5: Execute action** → Backend handler processes the intent and sends response

### AI Capabilities

| Capability | Example Customer Message | AI Response |
|---|---|---|
| **Natural Ordering** | "bhai 2 butter naan aur 1 paneer butter masala bhej do" | Understands Hindi, maps to menu items, confirms order |
| **Smart Recommendations** | "kuch accha suggest karo veg me" | Recommends top-rated veg items from the menu |
| **Context-Aware** | "usse hata do" (referring to previous item) | Understands context from conversation history |
| **Restaurant FAQ** | "timing kya hai?" / "parking hai?" | Answers from restaurant's stored details |
| **Booking Help** | "kal 4 logo ke liye table chahiye" | Checks availability, suggests times, books table |
| **Order Modifications** | "1 aur raita add kar do order me" | Adds to existing active order |
| **Bill Request** | "bill bhej do" | Generates bill, sends payment link |
| **Owner Reports** | "aaj ki sale batao" (from owner's number) | Generates and sends report PDF |
| **Multilingual** | Hindi, English, Hinglish — all supported | Gemini handles multilingual naturally |

### Per-Restaurant WhatsApp Number Setup

```mermaid
sequenceDiagram
    participant RO as Restaurant Owner
    participant DB as DineBoard Admin
    participant WT as Wati Dashboard
    participant META as Meta Business Suite

    RO->>DB: Registers restaurant on DineBoard
    DB->>RO: "Please provide your WhatsApp Business number"
    RO->>META: Verifies business on Meta Business Suite
    RO->>WT: Adds their phone number to Wati (under DineBoard's Wati account)
    WT->>META: Registers number via WhatsApp Cloud API
    META-->>WT: Number verified + approved
    WT-->>DB: Phone ID returned
    DB->>DB: Store wati_phone_id in tenants table
    Note over DB: Now all messages to this number<br/>route to this restaurant's chatbot
```

> [!IMPORTANT]
> **Each restaurant needs their own WhatsApp Business number.** All numbers are managed under DineBoard's single Wati account (multi-number support). This way:
> - Customers message the **restaurant's own number** (feels branded)
> - DineBoard's backend routes messages to the **correct restaurant's chatbot**
> - All managed centrally without restaurant owners needing Wati access

---

## 6. AWS Deployment Architecture

```mermaid
graph TB
    subgraph "AWS Cloud"
        subgraph "Networking"
            CF["CloudFront CDN<br/>(Static assets, images)"]
            ALB["Application Load Balancer"]
            R53["Route 53 DNS<br/>dineboard.in"]
        end
        
        subgraph "Compute (ECS Fargate)"
            API["API Service<br/>(Node.js + Express)<br/>2-4 tasks auto-scaling"]
            WKR["Worker Service<br/>(BullMQ Workers)<br/>1-2 tasks"]
            NEXT["Next.js Frontend<br/>(Landing + Admin)<br/>2 tasks"]
        end
        
        subgraph "Data"
            RDS["RDS PostgreSQL<br/>(db.t3.medium)<br/>Multi-AZ"]
            EC["ElastiCache Redis<br/>(cache.t3.small)"]
            S3B["S3 Bucket<br/>(Logos, PDFs, Videos)"]
        end
        
        subgraph "Monitoring"
            CW["CloudWatch<br/>(Logs + Metrics)"]
            SNS["SNS Alerts"]
        end
    end
    
    subgraph "External Services"
        RZ["Razorpay"]
        WT["Wati (WhatsApp)"]
        GM["Google Gemini API"]
    end

    R53 --> CF & ALB
    CF --> S3B & NEXT
    ALB --> API & NEXT
    API --> RDS & EC & RZ & WT & GM
    WKR --> RDS & EC & WT & GM
    CW --> SNS
```

### AWS Cost Estimate (Starting)

| Service | Config | Monthly Cost (est.) |
|---|---|---|
| ECS Fargate (API) | 2 tasks × 0.5 vCPU, 1GB | ~₹3,500 |
| ECS Fargate (Worker) | 1 task × 0.25 vCPU, 0.5GB | ~₹1,200 |
| ECS Fargate (Next.js) | 2 tasks × 0.5 vCPU, 1GB | ~₹3,500 |
| RDS PostgreSQL | db.t3.medium, 50GB | ~₹4,000 |
| ElastiCache Redis | cache.t3.small | ~₹2,000 |
| S3 + CloudFront | 50GB storage | ~₹500 |
| Route 53 | 1 hosted zone | ~₹50 |
| **Total** | | **~₹14,750/mo** |

---

## 7. API Architecture

```
/api
├── /auth
│   ├── POST /register                  # New restaurant owner signup
│   ├── POST /login                     # Staff/Owner login (returns JWT)
│   └── POST /forgot-password           # Password reset
│
├── /platform                            # Landing page data
│   ├── GET  /plans                      # Public: list subscription plans
│   ├── POST /contact                    # Contact form submission
│   └── GET  /demo-video                 # Demo video URL
│
├── /restaurants
│   ├── GET  /by-slug/:slug             # Public: get restaurant info
│   ├── PUT  /settings                  # Owner: update restaurant details
│   ├── PUT  /payment-config            # Owner: set own Razorpay keys
│   └── PUT  /whatsapp-config           # Owner: configure WhatsApp number
│
├── /menu
│   ├── GET  /by-slug/:slug             # Public: get menu items
│   ├── POST /items                     # Owner/Manager: add item
│   ├── PUT  /items/:id                 # Owner/Manager: update item
│   └── DELETE /items/:id               # Owner/Manager: delete item
│
├── /tables
│   ├── GET  /                          # Admin: list all tables
│   ├── POST /                          # Admin: add table
│   ├── PUT  /:id                       # Admin: update table
│   └── PUT  /:id/status                # Admin: manual availability toggle
│
├── /bookings
│   ├── POST /check-availability        # Public: check table availability
│   ├── POST /confirm                   # Public: confirm booking (no login)
│   ├── GET  /                          # Admin: list all bookings
│   ├── PUT  /:id/status                # Admin: update booking status
│   └── GET  /reports                   # Admin: booking reports
│
├── /orders
│   ├── POST /create                    # Public: place order (no login)
│   ├── GET  /                          # Admin: list all orders
│   ├── PUT  /:id                       # Admin: modify order
│   ├── PUT  /:id/status                # Admin: update order status
│   ├── POST /:id/add-items             # Customer: add more items
│   ├── POST /:id/send-bill             # Admin: manually send bill
│   └── POST /:id/request-bill          # Customer: request bill
│
├── /staff
│   ├── GET  /                          # Owner: list staff
│   ├── POST /                          # Owner: add staff with role
│   ├── PUT  /:id                       # Owner: update staff
│   └── DELETE /:id                     # Owner: remove staff
│
├── /promos
│   ├── GET  /                          # Admin: list promo codes
│   ├── POST /                          # Admin: create promo code
│   ├── PUT  /:id                       # Admin: update promo
│   └── POST /validate                  # Public: validate promo code
│
├── /invoices
│   ├── POST /generate/:orderId         # Admin: generate invoice with GST
│   ├── GET  /:id/pdf                   # Public: download invoice PDF
│   └── POST /:orderId/send             # Admin: send invoice to customer
│
├── /reports
│   ├── GET  /dashboard                 # Admin: overview stats
│   ├── GET  /orders                    # Admin: order reports
│   ├── GET  /revenue                   # Admin: revenue reports
│   ├── GET  /bookings                  # Admin: booking reports
│   └── GET  /export/pdf                # Admin: export as PDF
│
├── /payments
│   ├── POST /create-link               # Generate Razorpay payment link
│   ├── POST /webhook                   # Razorpay payment webhook
│   └── GET  /commissions               # Admin: view commission history
│
├── /whatsapp
│   ├── POST /webhook                   # Incoming WhatsApp messages (Wati)
│   ├── POST /send                      # Outgoing messages
│   └── POST /ai/process                # AI message processing
│
├── /ai
│   ├── POST /recommend                 # AI food recommendations
│   └── GET  /conversation/:phone       # Get conversation history
│
└── /superadmin
    ├── GET  /tenants                    # List all restaurants
    ├── GET  /revenue                    # Platform revenue report
    ├── GET  /commissions                # All commission records
    ├── POST /commissions/invoice        # Generate monthly commission invoice
    ├── POST /plans                      # Manage subscription plans
    └── PUT  /tenants/:id/status         # Suspend/activate restaurant
```

---

## 8. End-to-End Flows

### Flow 1: Restaurant Owner Registration (via Landing Page)

```mermaid
sequenceDiagram
    participant RO as Restaurant Owner
    participant LP as DineBoard Landing Page
    participant API as Backend API
    participant RZ as Razorpay
    participant WT as Wati
    participant DB as Database

    RO->>LP: Visits dineboard.in
    LP-->>RO: Sees hero, demo video, features, pricing
    RO->>LP: Clicks "Start Free Trial"
    LP->>LP: Multi-step form:<br/>1. Owner name, email, phone<br/>2. Restaurant name, address, cuisine<br/>3. Select plan (14-day free trial)
    LP->>API: POST /auth/register
    API->>DB: Create tenant (status: trial)<br/>Create owner staff record
    API->>RZ: Create Subscription (trial period)
    API-->>RO: "Welcome! Set up your restaurant"
    
    Note over RO: After trial, Razorpay auto-charges
    RZ->>API: Webhook: subscription.charged
    API->>DB: Activate tenant

    Note over RO: Owner adds WhatsApp number
    RO->>API: PUT /restaurants/whatsapp-config
    API->>WT: Register number under DineBoard's Wati account
    WT-->>API: phone_id returned
    API->>DB: Store wati_phone_id
    Note over RO: Chatbot now active on this number!
```

### Flow 2: Customer Orders via AI WhatsApp Chatbot

```mermaid
sequenceDiagram
    participant C as Customer
    participant WA as Restaurant's WhatsApp
    participant WT as Wati Webhook
    participant AI as Gemini AI + Backend
    participant DB as Database
    participant RZ as Razorpay

    C->>WA: "Hi, menu dikhao"
    WA->>WT: Incoming message
    WT->>AI: Webhook: {from: customer_phone, to: resto_phone, msg: "Hi, menu dikhao"}
    AI->>AI: 1. Identify restaurant from resto_phone<br/>2. Load menu from DB<br/>3. Build Gemini prompt with context
    AI->>AI: Gemini detects intent: view_menu
    AI-->>C: "🍽️ Tina's Fusion Menu\n\n🥬 VEG:\n1. Paneer Tikka - ₹280\n2. Dal Makhani - ₹220\n3. Veg Biryani - ₹250\n\n🍗 NON-VEG:\n4. Butter Chicken - ₹320\n5. Fish Tikka - ₹350\n\nReply with what you'd like to order!"

    C->>WA: "2 butter chicken aur 1 dal makhani dedo"
    WT->>AI: Process message
    AI->>AI: Gemini parses: [{Butter Chicken, qty:2}, {Dal Makhani, qty:1}]
    AI->>DB: Create order (source: whatsapp)
    AI->>AI: Auto-assign table if available
    AI-->>C: "✅ Order placed!\n📋 Order: ORD-X7K2\n🍗 2× Butter Chicken: ₹640\n🥘 1× Dal Makhani: ₹220\n💰 Total: ₹860\n🪑 Table: Garden 3\n\nWant to add anything else?"

    C->>WA: "haan 1 gulab jamun bhi add karo"
    AI->>DB: POST /orders/{id}/add-items
    AI-->>C: "Added! 🍮 1× Gulab Jamun: ₹80\nNew total: ₹940"

    C->>WA: "bill bhej do"
    AI->>RZ: Create payment link
    AI-->>C: "💰 Your bill: ₹940\nPay here: https://rzp.io/abc123\n\nThank you for dining with us! 😊"

    C->>RZ: Pays via link
    RZ->>AI: Webhook: payment.captured
    AI->>DB: Mark order as paid
    AI->>DB: Log commission in PLATFORM_COMMISSIONS
    AI-->>C: "✅ Payment received! Thank you! 🎉"
```

### Flow 3: Table Booking with Smart Slots

```mermaid
graph TD
    A["Customer requests<br/>Table for 4 at 7:00 PM"] --> B{"Check availability<br/>for 7:00 - 8:00 PM slot<br/>(configurable by owner)"}
    
    B -->|"Tables available"| C["Find tables with<br/>total capacity >= 4"]
    B -->|"No tables"| D["AI suggests alternatives:<br/>'Tables free at 6PM & 8PM.<br/>Contact owner: +91XXXXX'"]
    
    C --> E["Auto-suggest best<br/>combination of tables"]
    E --> F["Customer confirms<br/>(web or WhatsApp)"]
    F --> G["Lock tables for<br/>7:00 PM - 8:00 PM"]
    
    G --> H["📱 WhatsApp confirmation sent"]
    H --> I["⏰ Reminder at 6:00 PM<br/>(1 hour before)"]
    I --> J["⏰ Reminder at 6:30 PM<br/>(30 min before)"]
    
    J --> K{"At 7:45 PM<br/>(dining_minutes over)"}
    K --> L["Mark table: 'cleaning'<br/>for 15 min"]
    L --> M["At 8:00 PM<br/>Mark table: 'available'"]
    
    style D fill:#5a3a3a
    style G fill:#2d5a2d
    style M fill:#2d5a2d
```

---

## 9. Tenant Admin Panel (Next.js)

| Module | Features |
|---|---|
| **Dashboard** | Today's orders, revenue, bookings at a glance, live order feed |
| **Restaurant Setup** | Logo, name, tagline, address, timing, primary color, description, WhatsApp number |
| **Menu Management** | Add/edit/delete items, categories, veg/non-veg, pricing, availability toggle, images |
| **Table Management** | Add tables, set capacity, sections, change seating combinations, manual status toggle |
| **Booking Management** | View bookings, confirm/cancel, calendar view, adjust slot timings (dining + cleaning mins) |
| **Order Management** | Live orders, update status, modify items, apply discounts, send bill, view payment status |
| **Staff Management** | Add staff: owner/manager/waiter/chef/cashier, role-based permissions |
| **Promo Codes** | Create/edit codes, % or flat discount, validity dates, max uses, min order amount |
| **Invoice & GST** | Add GSTIN + CGST/SGST rates, auto-generate invoices, download PDF, send to customer |
| **Reports** | Revenue, orders, bookings, table utilization — filterable, export PDF, WhatsApp delivery |
| **Payment Settings** | Add own Razorpay keys or use platform's, view commission history |
| **AI Chatbot Logs** | View all WhatsApp conversations, AI accuracy, customer interactions |

---

## 10. Background Jobs (BullMQ + Redis)

| Job | Trigger | Action |
|---|---|---|
| `booking-reminder-1hr` | Cron every 5 min | Send WhatsApp reminder 1hr before booking |
| `booking-reminder-30min` | Cron every 5 min | Send WhatsApp reminder 30 min before booking |
| `table-status-cleaning` | After dining_minutes | Change table to "cleaning" |
| `table-status-available` | After cleaning_minutes | Change table back to "available" |
| `generate-invoice-pdf` | On bill request | Generate PDF with GST, upload to S3 |
| `send-payment-link` | On bill request | Create Razorpay link, send via WhatsApp |
| `commission-track` | On payment captured | Log commission in PLATFORM_COMMISSIONS |
| `commission-route-split` | On payment (platform Razorpay) | Razorpay Route auto-split |
| `commission-monthly-invoice` | 1st of every month | Generate commission invoice for own-Razorpay restaurants |
| `subscription-check` | Daily | Check expired/failed subscriptions |
| `report-generation` | On WhatsApp request | Generate PDF report, send via WhatsApp |
| `ai-context-cleanup` | Hourly | Clear stale conversation contexts from Redis |

---

## 11. Folder Structure

```
dineboard/
├── backend/
│   ├── src/
│   │   ├── config/           # DB, Redis, Razorpay, Wati, Gemini config
│   │   ├── middleware/        # Auth, tenant-context, rate-limiting
│   │   ├── routes/            # Express route handlers
│   │   │   ├── auth.js
│   │   │   ├── platform.js    # Landing page APIs
│   │   │   ├── restaurants.js
│   │   │   ├── menu.js
│   │   │   ├── tables.js
│   │   │   ├── bookings.js
│   │   │   ├── orders.js
│   │   │   ├── staff.js
│   │   │   ├── promos.js
│   │   │   ├── invoices.js
│   │   │   ├── reports.js
│   │   │   ├── payments.js
│   │   │   ├── whatsapp.js
│   │   │   ├── ai.js
│   │   │   └── superadmin.js
│   │   ├── services/          # Business logic
│   │   │   ├── booking.service.js
│   │   │   ├── order.service.js
│   │   │   ├── table.service.js
│   │   │   ├── payment.service.js
│   │   │   ├── commission.service.js   # NEW
│   │   │   ├── whatsapp.service.js
│   │   │   ├── ai.service.js           # NEW - Gemini integration
│   │   │   ├── invoice.service.js
│   │   │   └── report.service.js
│   │   ├── jobs/              # BullMQ workers
│   │   │   ├── reminder.worker.js
│   │   │   ├── table-status.worker.js
│   │   │   ├── invoice.worker.js
│   │   │   ├── commission.worker.js    # NEW
│   │   │   └── ai-cleanup.worker.js    # NEW
│   │   ├── ai/                # AI module
│   │   │   ├── gemini.client.js        # Gemini API wrapper
│   │   │   ├── prompts/               # System prompts per intent
│   │   │   │   ├── base-system.txt
│   │   │   │   ├── order-flow.txt
│   │   │   │   └── booking-flow.txt
│   │   │   ├── intent-router.js        # Routes AI output to handlers
│   │   │   └── context-manager.js      # Redis conversation memory
│   │   ├── utils/
│   │   └── app.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── customer/              # Tenant-branded customer page
│   │   └── index.html         # (Enhanced from your template)
│   │
│   └── web/                   # Next.js app (Landing + Admin + SuperAdmin)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (landing)/          # Public landing pages
│       │   │   │   ├── page.tsx        # Home
│       │   │   │   ├── features/
│       │   │   │   ├── pricing/
│       │   │   │   ├── about/
│       │   │   │   ├── demo/
│       │   │   │   ├── contact/
│       │   │   │   ├── privacy/
│       │   │   │   ├── terms/
│       │   │   │   ├── refund/
│       │   │   │   ├── register/
│       │   │   │   └── login/
│       │   │   ├── admin/              # Tenant admin panel
│       │   │   │   ├── dashboard/
│       │   │   │   ├── menu/
│       │   │   │   ├── tables/
│       │   │   │   ├── bookings/
│       │   │   │   ├── orders/
│       │   │   │   ├── staff/
│       │   │   │   ├── promos/
│       │   │   │   ├── invoices/
│       │   │   │   ├── reports/
│       │   │   │   ├── settings/
│       │   │   │   └── ai-logs/
│       │   │   └── superadmin/         # Platform admin panel
│       │   │       ├── tenants/
│       │   │       ├── revenue/
│       │   │       ├── commissions/
│       │   │       └── plans/
│       │   ├── components/
│       │   └── lib/
│       └── package.json
│
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.worker
├── Dockerfile.web
├── README.md
└── .env.example
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Project setup (monorepo with backend + Next.js frontend)
- PostgreSQL schema with Prisma + RLS policies
- Auth system (JWT, bcrypt)
- Multi-tenant middleware
- Restaurant CRUD APIs
- **Landing page** (Home, About, Pricing, Register, Login, Privacy, Terms)

### Phase 2: Core Features (Week 3-4)
- Menu management (CRUD + categories)
- Table management with slot system
- Booking flow with availability check + suggestions
- Order flow with auto table assignment
- Enhanced customer web page (from your index.html template)

### Phase 3: Payments & Commission (Week 5)
- Razorpay Subscription integration
- Razorpay Route for auto-split (platform Razorpay users)
- Commission tracking for own-Razorpay users
- Monthly commission invoice generation
- Payment link generation for customer bills

### Phase 4: WhatsApp + AI (Week 6-7)
- Wati webhook integration (multi-number)
- Google Gemini AI integration
- Chatbot conversation flows (order, book, bill, info)
- Context management (Redis)
- AI food recommendations
- WhatsApp template messages (confirmation, reminders, bills)

### Phase 5: Admin Panels (Week 8-9)
- Tenant admin dashboard (Next.js)
- All management modules (menu, tables, bookings, orders, staff, promos)
- Invoice & GST module
- Super admin dashboard

### Phase 6: Notifications & Reports (Week 10)
- WhatsApp booking reminders (1hr + 30min)
- Auto table status updates (dining → cleaning → available)
- Report generation + PDF export
- WhatsApp report delivery for owners

### Phase 7: Polish & Deploy (Week 11-12)
- AWS infrastructure setup (ECS, RDS, ElastiCache, S3, CloudFront)
- CI/CD pipeline
- Security hardening
- Performance testing
- Documentation

---

## Verification Plan

### Automated Tests
```bash
npm run test:unit          # Unit tests (slot logic, commission calc, AI parsing)
npm run test:integration   # API endpoint tests
npm run test:e2e           # Full order + booking flows
```

### Manual Verification
- Multi-tenant isolation (Restaurant A can't see Restaurant B's data)
- WhatsApp AI chatbot conversations (Hindi, English, Hinglish)
- Razorpay payment flows in test mode
- Commission tracking for both payment scenarios
- Customer web page on mobile devices
- Landing page on all devices + SEO audit
- Load test table booking during simulated peak hours
