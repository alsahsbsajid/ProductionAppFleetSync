import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PaymentService } from '@/lib/data-service';
import { PaymentUpdate } from '@/lib/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { SecurityLogger, sanitizeInput } from '@/lib/security/api-security';

// CommBank webhook configuration
const COMMBANK_WEBHOOK_SECRET =
  process.env.COMMBANK_WEBHOOK_SECRET || 'your-webhook-secret';

// Interface for CommBank payment notification
interface CommBankPaymentNotification {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  payerName: string;
  payerAccount: string;
  timestamp: string;
  status: 'completed' | 'failed' | 'pending';
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', COMMBANK_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Extract rental ID from payment reference
function extractRentalId(paymentReference: string): string | null {
  const validation = new PaymentService(createAdminClient()).validatePaymentReference(paymentReference);
  return validation.valid ? validation.rentalId! : null;
}

// Convert CommBank notification to PaymentUpdate
function convertToPaymentUpdate(
  notification: CommBankPaymentNotification,
  rentalId: string
): PaymentUpdate {
  return {
    rentalId,
    transactionId: notification.transactionId,
    amount: notification.amount,
    paymentMethod: `CommBank ${notification.paymentMethod}`,
    paidDate: new Date(notification.timestamp).toISOString().split('T')[0],
    payerName: notification.payerName,
    payerAccount: notification.payerAccount,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-commbank-signature');
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Log webhook attempt
    await SecurityLogger.logSecurityEvent(
      'WEBHOOK_RECEIVED',
      `CommBank webhook received from IP: ${clientIP}`,
      request
    );

    if (!signature) {
      await SecurityLogger.logSecurityEvent(
        'WEBHOOK_SECURITY_VIOLATION',
        'CommBank webhook missing signature header',
        request
      );
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      await SecurityLogger.logSecurityEvent(
        'WEBHOOK_SECURITY_VIOLATION',
        'CommBank webhook invalid signature',
        request
      );
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const paymentData: CommBankPaymentNotification = JSON.parse(body);

    // Sanitize input data
    const sanitizedPaymentData = {
      ...paymentData,
      transactionId: sanitizeInput(paymentData.transactionId),
      paymentReference: sanitizeInput(paymentData.paymentReference),
      payerName: sanitizeInput(paymentData.payerName),
      payerAccount: sanitizeInput(paymentData.payerAccount),
      paymentMethod: sanitizeInput(paymentData.paymentMethod)
    };

    // Only process completed payments
    if (sanitizedPaymentData.status !== 'completed') {
      await SecurityLogger.logSecurityEvent(
        'WEBHOOK_PAYMENT_IGNORED',
        `CommBank webhook payment not completed: ${sanitizedPaymentData.status}`,
        request
      );
      return NextResponse.json(
        { message: 'Payment not completed, ignoring' },
        { status: 200 }
      );
    }

    // Extract rental ID from payment reference
    const rentalId = extractRentalId(sanitizedPaymentData.paymentReference);

    if (!rentalId) {
      await SecurityLogger.logSecurityEvent(
        'WEBHOOK_INVALID_REFERENCE',
        `CommBank webhook invalid payment reference: ${sanitizedPaymentData.paymentReference}`,
        request
      );
      console.warn(
        'Could not extract rental ID from reference:',
        sanitizedPaymentData.paymentReference
      );
      return NextResponse.json(
        { error: 'Invalid payment reference format' },
        { status: 400 }
      );
    }

    // Convert to PaymentUpdate format
    const paymentUpdate = convertToPaymentUpdate(sanitizedPaymentData, rentalId);

    // Update payment status using PaymentService
    const supabase = createAdminClient();
    const paymentService = new PaymentService(supabase);

    const updateResult =
      await paymentService.updatePaymentFromCommBank(paymentUpdate);

    if (!updateResult.success) {
      await SecurityLogger.logSecurityEvent(
        'WEBHOOK_PAYMENT_UPDATE_FAILED',
        `CommBank webhook payment update failed: ${updateResult.message}`,
        request
      );
      console.error('Failed to update payment:', updateResult.message);
      return NextResponse.json(
        { error: updateResult.message },
        { status: 400 }
      );
    }

    // Log successful payment processing
    await SecurityLogger.logSecurityEvent(
      'WEBHOOK_PAYMENT_SUCCESS',
      `CommBank webhook payment processed successfully for rental: ${rentalId}`,
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Payment processed and updated successfully',
      rentalId,
      transactionId: sanitizedPaymentData.transactionId,
    });
  } catch (error) {
    console.error('Error processing CommBank webhook:', error);
    
    // Log critical error
    await SecurityLogger.logSecurityEvent(
      'WEBHOOK_CRITICAL_ERROR',
      `CommBank webhook critical error: ${error}`,
      request
    );
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Log verification attempt
  await SecurityLogger.logSecurityEvent(
    'WEBHOOK_VERIFICATION',
    `CommBank webhook verification from IP: ${clientIP}`,
    request
  );
  
  // CommBank might send verification requests
  const challenge = request.nextUrl.searchParams.get('challenge');

  if (challenge) {
    const sanitizedChallenge = sanitizeInput(challenge);
    return NextResponse.json({ challenge: sanitizedChallenge });
  }

  return NextResponse.json({
    message: 'CommBank webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
