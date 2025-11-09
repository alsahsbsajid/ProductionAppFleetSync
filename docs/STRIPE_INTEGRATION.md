# Stripe Payment Integration

This document outlines the Stripe payment integration for FleetSync Dashboard, providing an easy-to-use alternative to traditional bank transfer methods.

## Overview

The Stripe integration allows for:
- **Easy Setup**: Simple API key configuration
- **Automatic Payment Processing**: Real-time webhook notifications
- **Multiple Payment Methods**: Credit cards, bank transfers, digital wallets
- **Test Mode**: Safe testing environment with test keys
- **Global Support**: Accept payments from customers worldwide
- **Built-in Security**: PCI compliance and fraud protection

## Components

### 1. Payment Service (`lib/payment-service.ts`)

Handles payment processing logic:
- **Payment Tracking**: Manages rental payment status
- **Automatic Updates**: Updates payment status when Stripe webhooks are received
- **Validation**: Verifies payment amounts and rental IDs
- **Notifications**: Sends alerts to fleet managers

### 2. Stripe Webhook (`app/api/webhooks/stripe/route.ts`)

API endpoint that receives payment notifications from Stripe:
- **Webhook Verification**: Validates incoming requests using Stripe signatures
- **Payment Processing**: Extracts rental information from payment metadata
- **Status Updates**: Automatically marks payments as paid when received
- **Error Handling**: Manages failed payments and invalid references

### 3. Settings Configuration (`app/settings/page.tsx`)

User interface for configuring Stripe integration:
- **API Keys**: Configure publishable and secret keys
- **Webhook Setup**: Configure webhook URL and signing secret
- **Test Mode**: Toggle between test and live environments
- **Status Monitoring**: Real-time integration status

## Setup Instructions

### 1. Stripe Account Setup

1. **Create Stripe Account**:
   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete account verification for your business
   - Note: You can start testing immediately with test keys

2. **Get API Keys**:
   - Navigate to Stripe Dashboard → Developers → API keys
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2. Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe webhook secret (get this after creating webhook)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Webhook Configuration

1. **Create Webhook in Stripe Dashboard**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `charge.succeeded`

2. **Get Webhook Secret**:
   - After creating the webhook, click on it
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add this to your environment variables

### 4. Application Configuration

1. **Configure Settings Page**:
   - Navigate to Settings → Payments tab
   - Enter your Stripe Publishable Key
   - Enter your Stripe Secret Key
   - Set webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - Enter your webhook signing secret
   - Enable test mode for development

## Payment Flow

### 1. Payment Creation

When creating a payment in your application:

```javascript
// Include rental ID in payment metadata
const paymentIntent = await stripe.paymentIntents.create({
  amount: 62300, // Amount in cents ($623.00)
  currency: 'aud',
  metadata: {
    rental_id: 'r1',
    customer_name: 'John Smith'
  },
  description: 'RENT-r1-JOHNSMITH' // Fallback for rental ID extraction
})
```

### 2. Automatic Processing

1. **Customer Payment**: Customer completes payment through Stripe
2. **Webhook Notification**: Stripe sends payment notification to your webhook
3. **Automatic Processing**: System validates and processes the payment
4. **Status Update**: Payment status automatically changes to "paid"
5. **Notifications**: Fleet managers receive payment confirmation

## Webhook Security

All webhook requests are verified using Stripe's signature verification:

1. Stripe signs the payload using your webhook secret
2. Your system verifies the signature before processing
3. Invalid signatures are rejected with 401 Unauthorized

## Testing

### 1. Test Mode

- Use test API keys (starting with `pk_test_` and `sk_test_`)
- Enable "Test Mode" in settings
- Use Stripe's test card numbers:
  - `4242424242424242` (Visa)
  - `5555555555554444` (Mastercard)
  - `4000000000000002` (Card declined)

### 2. Webhook Testing

1. **Stripe CLI** (Recommended):
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login to your account
   stripe login
   
   # Forward webhooks to local development
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Manual Testing**:
   - Create test payments in Stripe Dashboard
   - Monitor webhook delivery in Stripe Dashboard
   - Check application logs for processing results

## Monitoring and Alerts

### Payment Status Dashboard

The settings page provides real-time monitoring:
- **Stripe Connection**: Shows if API keys are configured
- **Mode Indicator**: Displays test/live mode status
- **Webhook Status**: Shows if webhook secret is configured
- **Recent Activity**: Last payment received and daily totals

### Webhook Monitoring

- **Delivery Status**: Monitor webhook delivery in Stripe Dashboard
- **Response Codes**: Check for successful processing (200 status)
- **Retry Logic**: Stripe automatically retries failed webhooks
- **Error Logs**: Check application logs for processing errors

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Payments**
   - Check webhook URL configuration in Stripe Dashboard
   - Verify webhook secret matches environment variable
   - Ensure endpoint is publicly accessible (use ngrok for local testing)
   - Check server logs for incoming requests

2. **Payment Not Found**
   - Ensure rental ID is included in payment metadata
   - Check payment description for rental ID pattern
   - Verify rental ID exists in the system

3. **Amount Mismatches**
   - Payment amount doesn't match expected rental amount
   - Check for currency conversion issues
   - Verify invoice amount is correct

4. **Signature Verification Failed**
   - Webhook secret doesn't match Stripe configuration
   - Check environment variable `STRIPE_WEBHOOK_SECRET`
   - Ensure webhook endpoint URL is correct

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=stripe:*
```

This will log detailed information about:
- Incoming webhook requests
- Payment processing steps
- Validation results
- Error details

## Production Deployment

### 1. Environment Setup

- Use live API keys (`pk_live_` and `sk_live_`)
- Disable test mode in settings
- Update webhook URL to production domain
- Use HTTPS for all webhook endpoints

### 2. Security Considerations

- Store API keys securely (use environment variables)
- Implement rate limiting on webhook endpoints
- Log all payment transactions for audit purposes
- Monitor webhook delivery and processing
- Set up alerts for failed payments

### 3. Monitoring

Set up monitoring for:
- Webhook endpoint availability
- Payment processing success rates
- Failed payment notifications
- API response times
- Error rates

## API Reference

### Webhook Endpoints

```typescript
// Process payment notification
POST /api/webhooks/stripe
Headers: {
  'Content-Type': 'application/json',
  'stripe-signature': 't=timestamp,v1=signature'
}

// Webhook verification (for Stripe setup)
GET /api/webhooks/stripe
```

### PaymentService Methods

```typescript
// Update payment from Stripe webhook
PaymentService.updatePaymentFromStripe(paymentUpdate: PaymentUpdate)

// Get payment by rental ID
PaymentService.getPaymentByRentalId(rentalId: string)

// Manual payment status update
PaymentService.updatePaymentStatus(rentalId: string, status: string)
```

## Benefits Over Traditional Methods

### Compared to Bank Transfers:
- **Instant Processing**: Real-time payment confirmation
- **Multiple Payment Methods**: Cards, bank transfers, digital wallets
- **Global Reach**: Accept international payments
- **Automatic Reconciliation**: No manual payment matching
- **Better UX**: Seamless checkout experience

### Compared to CommBank Integration:
- **Easier Setup**: No complex bank API integration
- **Better Documentation**: Comprehensive Stripe docs
- **More Payment Options**: Not limited to bank transfers
- **Built-in Testing**: Robust test environment
- **Global Support**: Works worldwide, not just Australia

## Support

For technical support:
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available 24/7 via dashboard
- **Community**: [Stripe Discord](https://discord.gg/stripe)
- **Application Issues**: Check application logs and webhook delivery status

## Migration from CommBank

If migrating from the previous CommBank integration:

1. **Update Environment Variables**: Replace CommBank variables with Stripe
2. **Configure Webhooks**: Set up Stripe webhooks instead of CommBank
3. **Update Payment References**: Use Stripe metadata instead of payment references
4. **Test Integration**: Thoroughly test with Stripe test mode
5. **Update Documentation**: Inform customers of new payment methods

The new Stripe integration provides a more robust, user-friendly, and globally accessible payment solution for your fleet management system.