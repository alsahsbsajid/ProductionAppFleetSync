# Automatic Payment Checking System

This document explains how the automatic payment checking system works with CommBank integration for the FleetSync Dashboard.

## Overview

The system automatically updates payment statuses when payments are received through CommBank, eliminating the need for manual payment tracking and reducing administrative overhead.

## Components

### 1. Payment Service (`lib/payment-service.ts`)

The core service that manages all payment-related operations:

- **Payment Data Management**: Stores and retrieves rental payment information
- **Automatic Updates**: Processes incoming payment notifications from CommBank
- **Payment Statistics**: Calculates collection rates, overdue amounts, etc.
- **Payment Validation**: Verifies payment amounts and references
- **Notification System**: Sends alerts when payments are received

### 2. CommBank Webhook (`app/api/webhooks/commbank/route.ts`)

API endpoint that receives payment notifications from CommBank:

- **Webhook Verification**: Validates incoming requests using HMAC signatures
- **Payment Processing**: Extracts rental information from payment references
- **Status Updates**: Automatically marks payments as paid when received
- **Error Handling**: Manages failed payments and invalid references

### 3. Payment Management Page (`app/fleet/payments/page.tsx`)

Dedicated interface for managing fleet payments:

- **Real-time Dashboard**: Shows current payment status across the fleet
- **Payment Statistics**: Displays collection rates and overdue amounts
- **Search & Filter**: Find specific payments by customer, vehicle, or status
- **Export Functionality**: Download payment data as CSV
- **Manual Updates**: Override payment status when needed

### 4. Weekly Payment Checker (`components/weekly-payment-checker.tsx`)

Automated monitoring component:

- **Scheduled Checks**: Runs hourly to identify overdue payments
- **Alert System**: Highlights payments requiring attention
- **Status Tracking**: Monitors payment due dates and follow-up requirements

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# CommBank webhook secret (provided by CommBank)
COMMBANK_WEBHOOK_SECRET=your-actual-webhook-secret-here

# Optional: Database connection (for production)
DATABASE_URL=your-database-connection-string
```

### 2. CommBank Webhook Configuration

Configure CommBank to send payment notifications to your webhook endpoint:

**Webhook URL**: `https://yourdomain.com/api/webhooks/commbank`

**Required Headers**:
- `Content-Type: application/json`
- `x-commbank-signature: <HMAC-SHA256-signature>`

**Payment Reference Format**:
Payments must include a reference in the format: `FLEET-{rentalId}-{customerName}`

Example: `FLEET-r2-MICHAELCHEN`

### 3. Payment Reference Generation

When creating invoices or payment requests, use the PaymentService to generate proper references:

```typescript
import { PaymentService } from '@/lib/payment-service'

const reference = PaymentService.generatePaymentReference('r2', 'Michael Chen')
// Returns: "FLEET-R2-MICHAELCHEN"
```

## How It Works

### 1. Payment Flow

1. **Invoice Generation**: System generates invoice with proper payment reference
2. **Customer Payment**: Customer pays through CommBank using the reference
3. **Webhook Notification**: CommBank sends payment notification to your webhook
4. **Automatic Processing**: System validates and processes the payment
5. **Status Update**: Payment status automatically changes to "paid"
6. **Notifications**: Fleet managers receive payment confirmation

### 2. Payment Reference Validation

The system validates payment references to ensure they match existing rentals:

```typescript
// Valid reference format
const reference = "FLEET-r2-MICHAELCHEN"
const validation = PaymentService.validatePaymentReference(reference)
// Returns: { valid: true, rentalId: "r2" }

// Invalid reference
const invalidRef = "INVALID-FORMAT"
const validation = PaymentService.validatePaymentReference(invalidRef)
// Returns: { valid: false, rentalId: undefined }
```

### 3. Webhook Security

All webhook requests are verified using HMAC-SHA256 signatures:

1. CommBank signs the payload using your webhook secret
2. Your system verifies the signature before processing
3. Invalid signatures are rejected with 401 Unauthorized

## Testing

### 1. Test Script

Use the provided test script to simulate CommBank payments:

```bash
# Test all sample payments
node scripts/test-commbank-webhook.js

# Test specific payment
node scripts/test-commbank-webhook.js r2 "Michael Chen" 623.00
```

### 2. Manual Testing

1. Start the development server: `npm run dev`
2. Open the payments page: `http://localhost:3000/fleet/payments`
3. Run the test script in another terminal
4. Verify that payment statuses update automatically
5. Check browser console for payment notifications

## Monitoring & Alerts

### 1. Payment Alerts

The system provides several types of alerts:

- **Overdue Payments**: Payments past their due date
- **Pending Follow-up**: Payments due within 3 days
- **Failed Processing**: Payments that couldn't be processed
- **Amount Mismatches**: Payments with incorrect amounts

### 2. Dashboard Metrics

Key metrics displayed on the payment dashboard:

- **Collection Rate**: Percentage of payments received on time
- **Total Outstanding**: Amount of unpaid invoices
- **Overdue Amount**: Value of overdue payments
- **Average Payment Time**: Time from invoice to payment

### 3. Weekly Reports

The system automatically generates weekly payment reports including:

- Payment status summary
- Overdue payment list
- Collection rate trends
- Customer payment patterns

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Payments**
   - Check webhook URL configuration in CommBank
   - Verify webhook secret matches environment variable
   - Check server logs for incoming requests

2. **Payment Reference Not Found**
   - Ensure reference follows correct format: `FLEET-{rentalId}-{customerName}`
   - Verify rental ID exists in the system
   - Check for typos in customer name

3. **Amount Mismatches**
   - Payment amount doesn't match expected rental amount
   - Check for currency conversion issues
   - Verify invoice amount is correct

4. **Signature Verification Failed**
   - Webhook secret doesn't match CommBank configuration
   - Check environment variable `COMMBANK_WEBHOOK_SECRET`
   - Verify HMAC-SHA256 signature calculation

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=payment:*
```

This will log detailed information about:
- Incoming webhook requests
- Payment processing steps
- Validation results
- Error details

## Production Deployment

### 1. Database Integration

For production, replace the in-memory storage with a proper database:

```typescript
// Example with Prisma
import { prisma } from '@/lib/prisma'

export class PaymentService {
  static async updatePaymentFromCommBank(paymentUpdate: PaymentUpdate) {
    const rental = await prisma.rental.findUnique({
      where: { id: paymentUpdate.rentalId }
    })
    
    if (!rental) {
      return { success: false, message: 'Rental not found' }
    }
    
    const updatedRental = await prisma.rental.update({
      where: { id: paymentUpdate.rentalId },
      data: {
        paymentStatus: 'paid',
        paidDate: new Date(paymentUpdate.paidDate),
        transactionId: paymentUpdate.transactionId,
        paymentMethod: paymentUpdate.paymentMethod
      }
    })
    
    return { success: true, updatedPayment: updatedRental }
  }
}
```

### 2. Security Considerations

- Use HTTPS for all webhook endpoints
- Implement rate limiting on webhook endpoints
- Store webhook secrets securely (use environment variables)
- Log all payment transactions for audit purposes
- Implement proper error handling and monitoring

### 3. Monitoring

Set up monitoring for:
- Webhook endpoint availability
- Payment processing success rates
- Failed payment notifications
- System performance metrics

## API Reference

### PaymentService Methods

```typescript
// Get all payments
PaymentService.getAllPayments(): RentalPayment[]

// Update payment from CommBank
PaymentService.updatePaymentFromCommBank(update: PaymentUpdate): Promise<UpdateResult>

// Check overdue payments
PaymentService.checkOverduePayments(): RentalPayment[]

// Get payment statistics
PaymentService.getPaymentStatistics(): PaymentStatistics

// Generate payment reference
PaymentService.generatePaymentReference(rentalId: string, customerName: string): string

// Validate payment reference
PaymentService.validatePaymentReference(reference: string): ValidationResult
```

### Webhook Endpoints

```typescript
// Process payment notification
POST /api/webhooks/commbank
Headers: {
  'Content-Type': 'application/json',
  'x-commbank-signature': 'sha256=...'
}

// Webhook verification (for CommBank setup)
GET /api/webhooks/commbank
```

## Support

For technical support or questions about the payment automation system:

1. Check the troubleshooting section above
2. Review server logs for error details
3. Test with the provided test script
4. Contact the development team with specific error messages

---

*Last updated: January 2024*