# PerfectFit Backend API

> Complete backend for PerfectFit - AI-powered tailoring and e-commerce platform

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Docker & Docker Compose (for local development)
- Razorpay account (for payments)

### Local Development Setup

#### 1. Clone and Setup Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

The backend starts with a local SQLite database by default (`perfectfit.db`), so
the core API can be run immediately. Set `DATABASE_URL` to PostgreSQL before a
production deployment.

#### 2. Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Backend, Celery)
docker-compose up -d

# Run database migrations (if using Alembic)
docker-compose exec backend alembic upgrade head

# Access API at http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

#### 3. Manual Setup (Without Docker)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install PostgreSQL locally
# Configure DATABASE_URL in .env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000

# In another terminal, start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info

# In another terminal, start Celery beat
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

#### Authentication
```
POST   /auth/register          - Create new user account
POST   /auth/login             - Login user
POST   /auth/refresh           - Refresh access token
POST   /auth/logout            - Logout user
POST   /auth/forgot-password   - Request password reset
POST   /auth/reset-password    - Reset password with token
GET    /auth/verify-email/{token} - Verify email address
```

#### Users
```
GET    /users/me               - Get current user profile
PUT    /users/me               - Update current user profile
GET    /users/{user_id}        - Get public user profile
DELETE /users/me               - Delete current user account
GET    /users/{user_id}/measurements - Get user measurements
```

#### Products
```
GET    /products              - Get all products (with filtering)
GET    /products/{product_id} - Get product details
POST   /products              - Create product (Admin)
PUT    /products/{product_id} - Update product (Admin)
DELETE /products/{product_id} - Delete product (Admin)
POST   /products/{product_id}/rating - Rate product
```

#### Orders
```
POST   /orders                 - Create new order
GET    /orders                 - Get user orders
GET    /orders/{order_id}      - Get order details
PUT    /orders/{order_id}/status - Update order status
GET    /orders/{order_id}/tracking - Get order tracking
POST   /orders/{order_id}/cancel - Cancel order
```

#### Payments (Razorpay)
```
POST   /payments/razorpay/create-order  - Create Razorpay order
POST   /payments/razorpay/verify        - Verify payment signature
GET    /payments/{payment_id}           - Get payment details
POST   /payments/{payment_id}/refund    - Refund payment
POST   /payments/razorpay/webhook       - Razorpay webhook
```

---

## 🔐 Authentication

All endpoints except `/auth/*` require authentication using JWT Bearer tokens.

### Login Flow
```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response includes access_token and refresh_token

# 2. Use access_token in Authorization header
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"

# 3. Refresh token when access token expires
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -d '{"token": "<refresh_token>"}'
```

---

## 💳 Razorpay Integration

### Setup Steps

1. **Create Razorpay Account**
   - Go to https://razorpay.com
   - Sign up and verify your account
   - Complete KYC (Know Your Customer) verification

2. **Get API Keys**
   - Login to Razorpay Dashboard
   - Navigate to Settings → API Keys
   - Copy Key ID and Key Secret

3. **Update .env**
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   ```

### Payment Flow

```javascript
// Frontend (Next.js)
// 1. Create order
const orderResponse = await fetch('/api/v1/payments/razorpay/create-order', {
  method: 'POST',
  body: JSON.stringify({ order_id: 'order-uuid' }),
});

const orderData = await orderResponse.json();

// 2. Open Razorpay checkout
const options = {
  key: orderData.key_id,
  amount: orderData.amount * 100,
  currency: "INR",
  order_id: orderData.razorpay_order_id,
  handler: async function(response) {
    // 3. Verify payment on backend
    await fetch('/api/v1/payments/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      }),
    });
  },
};

const rzp1 = new Razorpay(options);
rzp1.open();
```

---

## 📊 Database Schema

### Core Tables
- **users** - User accounts and profiles
- **products** - Product catalog
- **orders** - Customer orders
- **order_items** - Items in each order
- **payments** - Payment transactions
- **measurements** - Body measurements
- **tailors** - Tailor profiles
- **messages** - User messages
- **rewards** - Loyalty points
- **wallets** - User wallets
- **subscriptions** - Subscription plans
- **notifications** - User notifications
- **returns** - Return requests

### Create Tables

```bash
# Using Docker Compose
docker-compose exec backend python -c "from app.db.database import init_db; init_db()"

# Manual setup
python -c "from app.db.database import init_db; init_db()"
```

---

## 🧪 Testing

### Run Tests
```bash
# All tests
pytest

# Specific test file
pytest tests/test_auth.py

# With coverage
pytest --cov=app
```

### Test Examples
```python
# tests/test_auth.py
def test_user_registration():
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "first_name": "John",
    })
    assert response.status_code == 201
```

---

## 📧 Email Configuration

### Gmail Setup (Development)

1. **Enable 2-Factor Authentication**
   - Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Google Account → Security → App Passwords
   - Select Mail and Windows Computer
   - Copy the generated password

3. **Update .env**
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

### SendGrid Setup (Production)

```bash
# Install SendGrid
pip install sendgrid

# Update .env
SENDGRID_API_KEY=your-api-key
```

---

## 🔄 Background Tasks (Celery)

### Available Tasks
```python
# Send emails
send_email_task.delay(to_email, subject, body)

# Extract measurements from image
process_measurement_extraction.delay(measurement_id, image_url)

# Generate fit recommendations
generate_fit_recommendation.delay(user_id, product_id)

# Send notifications
send_order_confirmation.delay(order_id, user_email)
```

### Monitor Tasks
```bash
# Using Flower (Celery monitoring)
pip install flower
flower -A app.tasks.celery_app --port=5555

# Access at http://localhost:5555
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Update SECRET_KEY with a long random string
- [ ] Set DEBUG=False
- [ ] Configure production database
- [ ] Set up Redis cache
- [ ] Configure AWS S3 for file uploads
- [ ] Set up email service (SendGrid)
- [ ] Configure Razorpay production keys
- [ ] Set up CORS for frontend URL
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure logging and monitoring

### Deploy with Docker

```bash
# Build image
docker build -t perfectfit-backend:latest .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/perfectfit_db \
  -e SECRET_KEY=your-secret-key \
  perfectfit-backend:latest

# Or use docker-compose for production
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── config.py               # Configuration settings
│   ├── core/
│   │   ├── security.py         # JWT authentication
│   │   └── exceptions.py       # Custom exceptions
│   ├── db/
│   │   └── database.py         # Database setup
│   ├── models/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── order.py
│   │   ├── additional.py
│   │   └── __init__.py
│   ├── schemas/
│   │   └── schemas.py          # Pydantic models
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── products.py
│   │       ├── orders.py
│   │       ├── payments.py
│   │       └── __init__.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── email_service.py
│   │   ├── payment_service.py
│   │   └── ai_service.py
│   ├── tasks/
│   │   └── celery_app.py       # Background tasks
│   ├── websockets/
│   │   ├── manager.py
│   │   └── notifications.py
│   └── ml/
│       └── measurement_model.py
├── tests/
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── README.md
└── BACKEND_SPECIFICATION.md
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose logs postgres

# Check connection string in .env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Celery Worker Not Starting
```bash
# Check Redis connection
redis-cli ping

# View worker logs
celery -A app.tasks.celery_app worker --loglevel=debug
```

### Import Errors
```bash
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt

# Check Python path
python -m app.main
```

---

## 📞 Support

- **Documentation**: See `BACKEND_SPECIFICATION.md`
- **API Docs**: http://localhost:8000/docs
- **Issues**: Check GitHub issues
- **Email**: support@perfectfit.com

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

See `CONTRIBUTING.md` for detailed guidelines.

---

**Built with ❤️ for PerfectFit**
