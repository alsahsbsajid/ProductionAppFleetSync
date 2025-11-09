# FleetSync Dashboard

A modern, modular fleet management dashboard built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Vehicle Management**: Track and manage your fleet vehicles
- **Customer Management**: Maintain customer records and information
- **Rental Management**: Handle vehicle rentals and bookings
- **Payment Processing**: Process and track rental payments
- **Dashboard Analytics**: View fleet statistics and insights
- **Notification System**: Real-time notifications for important events

## 📁 Project Structure

```
fleetsync-dashboard/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── index.ts          # Component exports
├── hooks/                # Custom React hooks
│   ├── use-data.ts       # Data fetching hooks
│   ├── use-form.ts       # Form management hooks
│   ├── use-local-storage.ts # Local storage hooks
│   ├── use-notifications.ts # Notification hooks
│   └── index.ts          # Hook exports
├── lib/                  # Core library modules
│   ├── constants.ts      # Application constants
│   ├── types.ts          # TypeScript type definitions
│   ├── helpers.ts        # Utility helper functions
│   ├── validation.ts     # Form validation logic
│   ├── data-service.ts   # API service layer
│   ├── notification-service.ts # Notification management
│   ├── payment-service.ts # Payment processing
│   ├── utils.ts          # General utilities
│   └── index.ts          # Library exports
├── public/               # Static assets
└── scripts/              # Build and utility scripts
```

## 🏗️ Architecture

### Modular Design

The codebase follows a modular architecture with clear separation of concerns:

#### **Services Layer** (`lib/`)
- **Data Service**: Centralized API interactions with type safety
- **Notification Service**: Singleton pattern for app-wide notifications
- **Payment Service**: Specialized payment processing logic
- **Validation**: Reusable form validation functions
- **Helpers**: Utility functions for common operations

#### **Hooks Layer** (`hooks/`)
- **Data Hooks**: Standardized data fetching with loading states
- **Form Hooks**: Consistent form management across components
- **Storage Hooks**: Persistent state management
- **Notification Hooks**: React integration for notifications

#### **Components Layer** (`components/`)
- **UI Components**: Reusable, styled components
- **Feature Components**: Business logic components
- **Layout Components**: Page structure components

### Key Improvements

1. **Type Safety**: Comprehensive TypeScript types for all data structures
2. **Centralized Constants**: All magic strings and configuration in one place
3. **Reusable Utilities**: Common operations abstracted into helper functions
4. **Consistent Error Handling**: Standardized error management across the app
5. **Performance Optimized**: Debounced operations and efficient re-renders
6. **Accessibility**: ARIA labels and keyboard navigation support

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fleetsync-dashboard

# Install dependencies
npm install
```

### 1. Database Setup

**Important**: Before running the application, you need to set up the database schema in Supabase.

#### Option A: Automatic Setup (Recommended)

Run the database setup script:

```bash
node scripts/setup-database.js
```

#### Option B: Manual Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Execute the SQL script

#### Option C: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

### 2. Environment Configuration

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional: for database setup script
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run the Development Server

```bash
# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run type-check # Run TypeScript compiler
```

## 📚 Usage Examples

### Using Data Services

```typescript
import { dataService, notify } from '@/lib'

// Fetch all vehicles
const vehicles = await dataService.vehicles.getAllVehicles()

// Create a new customer
const customer = await dataService.customers.createCustomer({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  licenseNumber: 'DL123456'
})

// Show notification
notify.success('Customer Created', 'John Doe has been added successfully')
```

### Using Custom Hooks

```typescript
import { useVehicles, useCustomerForm, useMutation } from '@/hooks'

function VehicleList() {
  const { data: vehicles, loading, error } = useVehicles()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {vehicles?.map(vehicle => (
        <div key={vehicle.id}>{vehicle.make} {vehicle.model}</div>
      ))}
    </div>
  )
}

function CustomerForm() {
  const form = useCustomerForm()
  
  return (
    <form onSubmit={form.handleSubmit}>
      <input
        value={form.values.firstName}
        onChange={(e) => form.setValue('firstName', e.target.value)}
        onBlur={form.handleBlur('firstName')}
      />
      {form.errors.firstName && <span>{form.errors.firstName}</span>}
    </form>
  )
}
```

### Using Utilities

```typescript
import { dateUtils, currencyUtils, stringUtils } from '@/lib'

// Format dates
const formatted = dateUtils.formatForDisplay('2024-01-15')
const isOverdue = dateUtils.isOverdue('2024-01-01')

// Format currency
const price = currencyUtils.format(1500) // "$1,500.00"

// String utilities
const id = stringUtils.generateId('CUST') // "CUST_abc123_def456"
const slug = stringUtils.slugify('Hello World') // "hello-world"
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_NAME=FleetSync Dashboard
```

### TypeScript Configuration

The project uses optimized TypeScript settings for better performance:

- Incremental compilation
- Skip library checks
- Strict type checking
- Path mapping for clean imports

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Building for Production

### Standard Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Build (Recommended)

The project includes Docker configuration for easy deployment:

```bash
# Build Docker image
docker build -t fleetsync-dashboard .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  -e STRIPE_SECRET_KEY=your_stripe_secret_key \
  -e STRIPE_WEBHOOK_SECRET=your_webhook_secret \
  fleetsync-dashboard
```

### Docker Compose (Recommended for Production)

```bash
# Copy environment file
cp .env.example .env.local

# Edit .env.local with your actual values
# Then start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

For detailed Docker deployment instructions, see [DOCKER-DEPLOYMENT-GUIDE.md](./DOCKER-DEPLOYMENT-GUIDE.md).

### Dokploy Deployment (Recommended for Self-Hosted)

Dokploy is a self-hosted platform for streamlined Docker container management. It's the easiest way to deploy this application:

```bash
# 1. Install Dokploy on your server
curl -sSL https://dokploy.com/install.sh | sh

# 2. Access Dokploy dashboard and create new application
# 3. Select "Docker" as source provider
# 4. Select "Dockerfile" as build type
# 5. Upload your project files
# 6. Add environment variables
# 7. Deploy!
```

**Quick Steps:**
1. Upload project files to Dokploy
2. Configure Provider: **Docker**
3. Configure Build Type: **Dockerfile**
4. Add environment variables from `.env.example`
5. Set port to `3000`
6. Deploy and monitor

For complete step-by-step instructions, see [DOKPLOY-DEPLOYMENT.md](./DOKPLOY-DEPLOYMENT.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes following the established patterns
4. Add tests for new functionality
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the established folder structure
- Use the custom hooks for data fetching and form management
- Implement proper error handling
- Add JSDoc comments for complex functions
- Use semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the code examples in this README

---

**Built with ❤️ using modern web technologies**