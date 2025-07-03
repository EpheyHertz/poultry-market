# Poultry Marketplace - Multi-Role E-commerce Platform

A comprehensive Next.js 14 full-stack application for a poultry marketplace supporting multiple user roles: Customers, Sellers, Companies, and Admins.

## 🚀 Features

### User Roles & Capabilities

#### 👤 **Customer**
- Browse and purchase eggs, chicken meat, and feeds
- Apply for hatching eggs
- Submit applications to become seller/company
- Track orders and deliveries
- View order history

#### 🏪 **Seller**
- Sell eggs and chicken meat only
- Manage product inventory (CRUD)
- Create and manage vouchers/discounts
- Apply for sponsorships from companies
- Get verified tags from admin
- Custom dashboard with unique URL
- QR code sharing for store

#### 🏢 **Company**
- Sell chicken feeds, chicks, and hatching eggs
- Full product management
- Create vouchers and promotional campaigns
- Offer sponsorships to sellers
- Custom domain support
- Advanced analytics dashboard

#### 👨‍💼 **Admin**
- Central dashboard for all operations
- Approve/reject user applications
- Manage user tags and verification
- Monitor all orders and transactions
- User management and role assignments
- System analytics and reporting

### 🛒 Core Features
- **Product Management**: Full CRUD operations with image support
- **Order System**: Complete order lifecycle with status tracking
- **Delivery Tracking**: Real-time delivery status updates
- **Voucher System**: Discount codes with expiration and usage limits
- **Sponsorship Program**: Companies can sponsor sellers
- **Application System**: Role upgrade applications with admin approval
- **Tag System**: Verification badges (Verified, Trusted, Recommended, etc.)
- **Custom Domains**: Personalized store URLs for sellers/companies
- **QR Code Generation**: Easy store sharing

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with HTTP-only cookies
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)
- **Forms**: React Hook Form with Zod validation

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon Database)
- npm or yarn

### 1. Clone & Install
```bash
git clone <repository-url>
cd poultry-marketplace
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/poultry_marketplace"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🔐 Demo Accounts

After running the seed script, you can use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@poultry.com | password123 |
| Company | company@poultry.com | password123 |
| Seller | seller@poultry.com | password123 |
| Customer | customer@poultry.com | password123 |

## 📁 Project Structure

```
poultry-marketplace/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── products/             # Product CRUD operations
│   │   ├── orders/               # Order management
│   │   └── vouchers/             # Voucher system
│   ├── auth/                     # Authentication pages
│   ├── customer/                 # Customer dashboard & pages
│   ├── seller/                   # Seller dashboard & pages
│   ├── company/                  # Company dashboard & pages
│   ├── admin/                    # Admin dashboard & pages
│   └── globals.css               # Global styles
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   └── layout/                   # Layout components
├── lib/                          # Utility functions
│   ├── auth.ts                   # Authentication utilities
│   ├── prisma.ts                 # Database client
│   └── utils.ts                  # General utilities
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Database seeding
└── public/                       # Static assets
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with filters)
- `POST /api/products` - Create product (Seller/Company only)
- `GET /api/products/[id]` - Get product details
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Orders
- `GET /api/orders` - List orders (role-based filtering)
- `POST /api/orders` - Create order (Customer only)
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]` - Update order status

### Vouchers
- `GET /api/vouchers` - List vouchers
- `POST /api/vouchers` - Create voucher (Seller/Company only)
- `POST /api/vouchers/validate` - Validate voucher code

## 🎨 UI Components

The application uses shadcn/ui components for a consistent, accessible design:

- **Forms**: Input, Label, Button, Select, Textarea
- **Layout**: Card, Sheet, Dialog, Tabs
- **Feedback**: Alert, Toast, Badge, Progress
- **Navigation**: Dropdown Menu, Navigation Menu
- **Data Display**: Table, Avatar, Separator

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **HTTP-only Cookies**: Prevents XSS attacks
- **Role-based Access Control**: Route and API protection
- **Input Validation**: Server-side validation with Zod
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **Password Hashing**: bcrypt for secure password storage

## 📱 Mobile App Ready

All API endpoints are designed to be consumed by a React Native mobile application:

- RESTful API design
- Consistent JSON responses
- Proper HTTP status codes
- Authentication via JWT tokens
- Role-based data filtering

## 🚀 Deployment

### Database (Neon)
1. Create a Neon database
2. Update `DATABASE_URL` in environment variables
3. Run migrations: `npm run db:push`
4. Seed data: `npm run db:seed`

### Application (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Email: support@poultrymarket.com
- Documentation: [Wiki](link-to-wiki)

---

**Built with ❤️ using Next.js 14, TypeScript, and modern web technologies.**