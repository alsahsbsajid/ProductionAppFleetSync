import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withSecurity, validateInput, sanitizeInput, SecurityLogger } from '@/lib/security/api-security';

// Initialize Stripe - lazy initialization to avoid build-time errors
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  // Allow dummy values during build
  if (!secretKey || secretKey === 'dummy_for_build') {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

async function handlePaymentIntent(request: NextRequest, context: { user: any }): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { rentalId, amount, currency = 'aud', customerName, vehicleRegistration } = body;

    // Validate required fields
    if (!rentalId || !amount) {
      await SecurityLogger.logSecurityEvent(
        'INVALID_PAYMENT_REQUEST',
        'Missing required fields in payment intent creation',
        request,
        context.user?.id
      );
      return NextResponse.json(
        { error: 'Missing required fields: rentalId and amount' },
        { status: 400 }
      );
    }

    // Validate input types and formats
    if (!validateInput.uuid(rentalId)) {
      return NextResponse.json(
        { error: 'Invalid rental ID format' },
        { status: 400 }
      );
    }

    if (!validateInput.amount(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Sanitize string inputs
    const sanitizedCustomerName = customerName ? sanitizeInput(customerName) : 'Unknown';
    const sanitizedVehicleRegistration = vehicleRegistration ? sanitizeInput(vehicleRegistration) : 'Unknown';

    // Convert amount to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        rental_id: rentalId,
        customer_name: sanitizedCustomerName,
        vehicle_registration: sanitizedVehicleRegistration,
        user_id: context.user.id,
      },
      description: `RENT-${rentalId}-${sanitizedCustomerName.replace(/\s+/g, '').toUpperCase() || 'CUSTOMER'}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Log successful payment intent creation
    await SecurityLogger.logSecurityEvent(
      'PAYMENT_INTENT_CREATED',
      `Payment intent created for rental ${rentalId}, amount: ${amount}`,
      request,
      context.user.id
    );

    // Generate Stripe reference
    const stripeReference = `STR-${rentalId.toUpperCase()}-${paymentIntent.id.slice(-6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        stripeReference,
        amount: amountInCents,
        currency: currency.toUpperCase(),
      },
      message: 'Payment intent created successfully',
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Log security incident
    await SecurityLogger.logSecurityEvent(
      'PAYMENT_INTENT_ERROR',
      `Payment intent creation failed: ${error}`,
      request,
      context.user?.id
    );
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Payment processing error', 
          message: process.env.NODE_ENV === 'production' ? 'Payment service unavailable' : error.message,
          type: error.type 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export secured endpoint
export const POST = withSecurity(handlePaymentIntent, {
  requireAuth: true,
  endpoint: '/api/stripe/create-payment-intent',
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 payment intents per minute
    skipSuccessfulRequests: false
  }
});

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? process.env.CORS_ORIGIN || 'https://your-domain.com'
        : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}