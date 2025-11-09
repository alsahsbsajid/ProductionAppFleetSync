import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PaymentService } from '@/lib/data-service';
import { PaymentUpdate } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';

// Stripe webhook configuration
const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

// Interface for Stripe payment notification
interface StripePaymentEvent {
  id: string;
  object: string;
  type: string;
  data: {
    object: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      metadata: {
        rental_id?: string;
        customer_name?: string;
      };
      payment_method_details?: {
        type: string;
      };
      receipt_email?: string;
      created: number;
    };
  };
}

// Verify Stripe webhook signature
function verifyStripeSignature(payload: string, signature: string): boolean {
  try {
    const elements = signature.split(',');
    const signatureHash = elements
      .find(element => element.startsWith('v1='))
      ?.split('=')[1];

    if (!signatureHash) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying Stripe signature:', error);
    return false;
  }
}

// Helper function to extract vehicle reference number from payment data
function extractVehicleReference(event: any): number | null {
  // Try to get reference from metadata first
  if (event.data?.object?.metadata?.vehicleReference) {
    const ref = parseInt(event.data.object.metadata.vehicleReference);
    return !isNaN(ref) ? ref : null;
  }

  // Try to extract from description using patterns
  const description = event.data?.object?.description || '';

  // Look for patterns like "Vehicle Ref: 12", "Reference: 25", "Ref 42", etc.
  const patterns = [
    /vehicle\s*ref(?:erence)?[:\s]*(\d+)/i,
    /ref(?:erence)?[:\s]*(\d+)/i,
    /vehicle[:\s]*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const ref = parseInt(match[1]);
      return !isNaN(ref) && ref >= 0 && ref <= 50 ? ref : null;
    }
  }

  return null;
}

// Extract rental ID from Stripe payment metadata or description
function extractRentalId(stripePayment: any): string | null {
  // First check metadata
  if (stripePayment.metadata?.rental_id) {
    return stripePayment.metadata.rental_id;
  }

  // Then check description for pattern like "RENT-r1", "FLEET-r1", or "STR-R1-NSW123-445"
  if (stripePayment.description) {
    const fleetMatch = stripePayment.description.match(/FLEET-([^-]+)-/);
    if (fleetMatch) {
      return fleetMatch[1];
    }

    const rentMatch = stripePayment.description.match(/RENT-([^\s]+)/);
    if (rentMatch) {
      return rentMatch[1];
    }

    const stripeMatch = stripePayment.description.match(/STR-([^-]+)-/);
    if (stripeMatch) {
      return stripeMatch[1];
    }
  }

  return null;
}

function extractStripeReferenceFromDescription(
  description: string | null
): string | null {
  if (!description) return null;

  // Look for Stripe reference pattern like "STR-R1-NSW123-445"
  const match = description.match(/(STR-[^\s]+)/);
  return match ? match[1] : null;
}

// Convert Stripe payment to PaymentUpdate format
function convertToPaymentUpdate(
  stripeEvent: StripePaymentEvent
): PaymentUpdate | null {
  const payment = stripeEvent.data.object;
  const rentalId = extractRentalId(payment);

  if (!rentalId) {
    return null;
  }

  return {
    rentalId,
    transactionId: payment.id,
    amount: payment.amount / 100, // Convert from cents to dollars
    paymentMethod: `Stripe ${payment.payment_method_details?.type || 'Card'}`,
    paidDate: new Date(payment.created * 1000).toISOString().split('T')[0],
    payerName:
      payment.metadata?.customer_name || payment.receipt_email || 'Unknown',
    payerAccount: payment.id, // Use Stripe payment ID as account reference
  };
}

// Handle payment webhook POST requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    console.log('Received payment webhook event:', event.type);

    // Handle different payment event types
    switch (event.type) {
      case 'payment.succeeded':
      case 'payment.failed':
      case 'payment.pending': {
        // Extract vehicle reference number from the event
        const vehicleReference = extractVehicleReference(event);

        if (vehicleReference === null) {
          console.warn(
            'No valid vehicle reference found in webhook event (must be 0-50)'
          );
          return NextResponse.json({
            received: true,
            warning: 'No valid vehicle reference found',
          });
        }

        // Determine payment status based on event type
        let status: 'succeeded' | 'failed' | 'requires_action';
        if (event.type === 'payment.succeeded') {
          status = 'succeeded';
        } else if (event.type === 'payment.failed') {
          status = 'failed';
        } else {
          status = 'requires_action';
        }

        // Update payment status using PaymentService
        const supabase = createAdminClient();
        const paymentService = new PaymentService(supabase);
        const result = await paymentService.updatePaymentFromExternal({
          referenceNumber: vehicleReference,
          status,
          amount: event.data?.object?.amount
            ? event.data.object.amount / 100
            : undefined,
          currency: event.data?.object?.currency || 'AUD',
          paymentMethod: event.data?.object?.payment_method || 'unknown',
        });

        console.log('Payment update result:', result);
        console.log(
          `Processed payment for vehicle reference: ${vehicleReference}`
        );

        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

// Handle Stripe webhook verification (GET requests)
export async function GET(request: NextRequest) {
  // Stripe might send verification requests
  const challenge = request.nextUrl.searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}
