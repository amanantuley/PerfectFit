# PerfectFit Backend Specification

## Executive Summary
This document outlines the complete backend infrastructure needed for PerfectFit, a full-stack e-commerce and AI-powered tailoring platform.

---

## 1. TECHNOLOGY STACK

### Selected Stack
- **Language**: Python 3.10+
- **Framework**: FastAPI (async, high-performance)
- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy
- **Real-time**: python-socketio (WebSocket support)
- **Authentication**: JWT + OAuth2
- **File Storage**: Local filesystem (dev), AWS S3 (production)
- **Payment Gateway**: Razorpay
- **Email**: Gmail SMTP (Nodemailer replacement - use aiosmtplib)
- **Task Queue**: Celery + Redis
- **Container**: Docker & Docker Compose

---

## 2. DATABASE SCHEMA

### Core Models

#### Users
```
- id (UUID primary key)
- email (unique)
- phone (unique)
- password_hash
- first_name
- last_name
- profile_image_url
- gender
- date_of_birth
- address
- city
- state
- postal_code
- country
- measurements (JSON - chest, waist, hip, shoulder, inseam, sleeve)
- preferred_style (JSON array)
- auth_provider (email, google, etc.)
- is_verified
- created_at
- updated_at
- is_active
- role (customer, tailor, admin)
```

#### Products/Garments
```
- id (UUID)
- name
- type (shirt, jeans, suit, sherwani, etc.)
- description
- price (buy price)
- rent_price
- image_url
- data_ai_hint (for ML model)
- available_sizes (JSON array)
- available_colors (JSON array)
- stock_quantity
- rating
- review_count
- in_stock
- created_at
- updated_at
- created_by (tailor_id)
```

#### Orders
```
- id (UUID)
- user_id (FK)
- items (relationship to OrderItem)
- total_amount
- discount_applied
- tax_amount
- shipping_amount
- final_amount
- status (pending, processing, shipped, delivered, cancelled, returned)
- payment_status (pending, completed, failed, refunded)
- shipping_address (JSON)
- tracking_number
- notes
- customization_notes
- created_at
- updated_at
- delivered_at
```

#### OrderItems
```
- id (UUID)
- order_id (FK)
- product_id (FK)
- quantity
- unit_price
- purchase_type (buy, rent)
- customization_details (JSON)
- size
- color
- rental_start_date
- rental_end_date
```

#### Measurements
```
- id (UUID)
- user_id (FK)
- image_url (captured body image)
- chest
- waist
- hip
- shoulder
- inseam
- sleeve_length
- neck
- confidence_score (from ML model)
- model_version
- created_at
- notes
```

#### Tailors
```
- id (UUID)
- user_id (FK)
- shop_name
- shop_image
- bio
- specialization (JSON array - suits, casual, formal, etc.)
- verified
- rating
- review_count
- address
- city
- state
- postal_code
- phone
- availability (JSON - working hours)
- price_range (JSON - min, max)
- created_at
- updated_at
```

#### Messages
```
- id (UUID)
- sender_id (FK - User)
- receiver_id (FK - User)
- content
- is_read
- read_at
- created_at
- attachments (JSON - file URLs)
- message_type (text, order_update, notification)
```

#### Rewards & Wallet
```
Rewards:
- id (UUID)
- user_id (FK)
- points_earned
- points_used
- current_balance
- tier (bronze, silver, gold, platinum)
- last_updated

Wallet:
- id (UUID)
- user_id (FK)
- balance
- currency (INR, USD)
- transaction_history (relationship)
```

#### Transactions
```
- id (UUID)
- wallet_id (FK)
- amount
- type (credit, debit)
- description
- reference_id (order_id, payment_id)
- created_at
```

#### Subscriptions
```
- id (UUID)
- user_id (FK)
- plan_type (basic, premium, vip)
- status (active, cancelled, expired)
- start_date
- end_date
- renewal_date
- price
- auto_renew
- created_at
- cancelled_at
```

#### Returns
```
- id (UUID)
- order_id (FK)
- user_id (FK)
- reason
- status (requested, approved, rejected, shipped_back, completed)
- refund_amount
- created_at
- approved_at
- completed_at
- notes
```

#### Payments
```
- id (UUID)
- order_id (FK)
- user_id (FK)
- amount
- currency
- payment_method (razorpay, wallet, etc.)
- razorpay_payment_id
- razorpay_order_id
- razorpay_signature
- status (pending, completed, failed)
- created_at
- updated_at
```

#### Notifications
```
- id (UUID)
- user_id (FK)
- type (order_update, message, reward, promotion)
- title
- message
- data (JSON)
- is_read
- created_at
- expires_at
```

---

## 3. API ENDPOINTS STRUCTURE

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/verify-email
```

### Users
```
GET    /api/v1/users/me
PUT    /api/v1/users/me
GET    /api/v1/users/{user_id}
PUT    /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}
GET    /api/v1/users/{user_id}/measurements
POST   /api/v1/users/{user_id}/measurements
GET    /api/v1/users/{user_id}/measurements/{measurement_id}
```

### Products
```
GET    /api/v1/products
GET    /api/v1/products/{product_id}
POST   /api/v1/products (admin/tailor)
PUT    /api/v1/products/{product_id} (admin/tailor)
DELETE /api/v1/products/{product_id} (admin/tailor)
GET    /api/v1/products/search
GET    /api/v1/products/filter
```

### Cart
```
GET    /api/v1/cart
POST   /api/v1/cart/items
PUT    /api/v1/cart/items/{item_id}
DELETE /api/v1/cart/items/{item_id}
POST   /api/v1/cart/clear
GET    /api/v1/cart/total
```

### Orders
```
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/{order_id}
PUT    /api/v1/orders/{order_id}/status (admin)
GET    /api/v1/orders/{order_id}/tracking
```

### Payments
```
POST   /api/v1/payments/razorpay/create-order
POST   /api/v1/payments/razorpay/verify
GET    /api/v1/payments/{payment_id}
```

### Returns
```
POST   /api/v1/returns
GET    /api/v1/returns
GET    /api/v1/returns/{return_id}
PUT    /api/v1/returns/{return_id}/status
```

### Messages
```
GET    /api/v1/messages/{user_id}
POST   /api/v1/messages/{recipient_id}
PUT    /api/v1/messages/{message_id}/read
DELETE /api/v1/messages/{message_id}
```

### Tailors
```
GET    /api/v1/tailors
GET    /api/v1/tailors/{tailor_id}
POST   /api/v1/tailors/register
PUT    /api/v1/tailors/{tailor_id} (tailor profile)
GET    /api/v1/tailors/{tailor_id}/orders (tailor dashboard)
```

### Rewards & Wallet
```
GET    /api/v1/rewards/my-points
GET    /api/v1/rewards/history
GET    /api/v1/wallet/balance
GET    /api/v1/wallet/transactions
POST   /api/v1/wallet/add-money
```

### Subscriptions
```
GET    /api/v1/subscriptions/plans
POST   /api/v1/subscriptions/subscribe
GET    /api/v1/subscriptions/my-subscription
PUT    /api/v1/subscriptions/my-subscription/cancel
```

### Notifications
```
GET    /api/v1/notifications
PUT    /api/v1/notifications/{notification_id}/read
DELETE /api/v1/notifications/{notification_id}
WebSocket: /ws/notifications/{user_id}
```

### AI/Measurements
```
POST   /api/v1/ai/extract-measurements (image upload)
GET    /api/v1/ai/measurement-history
POST   /api/v1/ai/generate-fit-recommendation
```

---

## 4. FEATURE BREAKDOWN

### User Authentication
- Email/Password signup and login
- Google OAuth2 integration
- JWT token management with refresh tokens
- Email verification
- Password reset flow
- Role-based access control (Customer, Tailor, Admin)

### Product Management
- Full product catalog with filtering & search
- Product images with CDN/local storage
- Inventory management
- Product ratings & reviews
- Categorization (shirts, suits, casual, formal, etc.)

### Shopping & Orders
- Shopping cart with persistence
- Order creation with multiple items
- Buy and Rent options with pricing
- Customization notes for tailoring
- Order status tracking
- Order history

### Payment Integration (Razorpay)
- Razorpay order creation
- Payment verification
- Webhook handling for payment updates
- Refund processing
- Payment history

### AI Body Measurements
- Image upload and processing
- Body measurement extraction (ML model)
- Measurement history tracking
- Fit recommendations based on measurements

### Tailor Dashboard
- Tailor registration and verification
- Custom products listing
- Order management for tailors
- Customer measurement access
- Performance analytics
- Tailor ratings and reviews

### Messages & Communication
- User-to-user messaging
- Real-time notifications with WebSockets
- Message read status
- Message attachments

### Rewards & Loyalty
- Points earning system (per purchase)
- Reward tier system (Bronze, Silver, Gold, Platinum)
- Wallet balance management
- Points redemption

### Subscription Management
- Multiple subscription plans
- Auto-renewal management
- Subscription cancellation
- Subscription-exclusive features

### Returns Management
- Return request creation
- Return approval workflow
- Return status tracking
- Refund processing

### Email Notifications
- Order confirmation
- Shipment updates
- Newsletter subscription
- Account notifications
- Promotional emails

---

## 5. RAZORPAY INTEGRATION GUIDE

### Setup Steps:
1. **Create Razorpay Account** at https://razorpay.com
2. **Get API Keys**:
   - Log in to Razorpay Dashboard
   - Navigate to Settings → API Keys
   - Copy Key ID (public key) and Key Secret (private key)
3. **Store in Environment Variables**:
   ```
   RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```

### Backend Implementation:
- Create order via Razorpay API
- Verify payment signature
- Handle webhooks for payment updates
- Process refunds

---

## 6. REAL-TIME FEATURES

### WebSocket Endpoints:
- `/ws/notifications/{user_id}` - Real-time notifications
- `/ws/messages/{user_id}` - Live messaging
- `/ws/tailor/dashboard/{tailor_id}` - Real-time order updates

### Events:
- `order.created`
- `order.status_changed`
- `payment.received`
- `message.new`
- `notification.new`
- `reward.earned`

---

## 7. FILE STRUCTURE

```
perfectfit-backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── core/
│   │   ├── security.py
│   │   ├── settings.py
│   │   └── exceptions.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── models.py
│   ├── models/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── order.py
│   │   ├── payment.py
│   │   ├── tailor.py
│   │   ├── message.py
│   │   ├── reward.py
│   │   └── ...
│   ├── schemas/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── order.py
│   │   └── ...
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── orders.py
│   │   │   ├── payments.py
│   │   │   ├── tailors.py
│   │   │   ├── messages.py
│   │   │   ├── rewards.py
│   │   │   ├── ai.py
│   │   │   └── ...
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── order_service.py
│   │   ├── payment_service.py
│   │   ├── ai_service.py
│   │   ├── email_service.py
│   │   └── ...
│   ├── websockets/
│   │   ├── manager.py
│   │   ├── notifications.py
│   │   └── messages.py
│   ├── tasks/
│   │   ├── celery.py
│   │   ├── email_tasks.py
│   │   └── ai_tasks.py
│   └── ml/
│       ├── measurement_model.py
│       └── recommendation_model.py
├── migrations/
├── tests/
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 8. DEPENDENCIES

### Core
- fastapi
- uvicorn
- sqlalchemy
- psycopg2-binary (PostgreSQL driver)
- alembic (migrations)
- pydantic
- python-dotenv
- python-jose
- passlib
- bcrypt
- email-validator

### Real-time & Communication
- python-socketio
- aiosmtplib
- aiofiles

### Payments
- razorpay

### ML/Image Processing
- opencv-python
- pillow
- numpy
- tensorflow (or pytorch)

### Task Queue
- celery
- redis

### Testing
- pytest
- pytest-asyncio
- httpx

### Production
- gunicorn
- nginx (reverse proxy)

---

## 9. ENVIRONMENT VARIABLES

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/perfectfit_db
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Email
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465

# OAuth
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx

# File Storage
UPLOAD_DIR=uploads/
MAX_FILE_SIZE=10485760 (10MB)

# Frontend
FRONTEND_URL=http://localhost:9002
CORS_ORIGINS=["http://localhost:9002"]

# Environment
ENV=development
DEBUG=True
```

---

## 10. DEVELOPMENT WORKFLOW

### Phase 1: Project Setup
- Initialize FastAPI project with Docker
- Set up PostgreSQL database
- Configure environment variables
- Set up database migrations (Alembic)

### Phase 2: Core Infrastructure
- Database models and schemas
- Authentication system (JWT)
- Error handling and middleware
- CORS configuration

### Phase 3: Core Features
- User management (CRUD, profile)
- Product catalog
- Shopping cart and orders
- Measurements system

### Phase 4: Payment Integration
- Razorpay integration
- Payment endpoints
- Webhook handling

### Phase 5: Advanced Features
- WebSocket implementation (notifications, messaging)
- Tailor dashboard
- Rewards system
- Subscription management
- Returns management

### Phase 6: AI Features
- Body measurement extraction
- Fit recommendations

### Phase 7: Testing & Deployment
- Unit tests
- Integration tests
- Docker deployment
- Production setup

---

## 11. NEXT STEPS

1. ✅ Confirm architecture and tech stack
2. ⏳ Set up project structure and dependencies
3. ⏳ Create database models and migrations
4. ⏳ Implement authentication system
5. ⏳ Build API endpoints
6. ⏳ Integrate Razorpay
7. ⏳ Implement WebSocket features
8. ⏳ Add AI measurement extraction
9. ⏳ Testing and debugging
10. ⏳ Deployment setup

---

**Status**: Ready to implement
**Timeline**: Comprehensive (all features included)
**Testing**: Unit + Integration tests included
