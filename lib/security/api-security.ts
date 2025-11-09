// lib/security/api-security.ts
// Production API Security Middleware

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createClientFromRequest } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
};

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': process.env.NODE_ENV === 'production'
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com;"
    : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co https://api.stripe.com ws://localhost:*;"
};

// Re-export client-safe validation utilities
export { validateInput, sanitizeInput } from '@/lib/client-validation';

// Rate limiting implementation
export class RateLimiter {
  private static async checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      const supabase = createAdminClient();
      const windowStart = new Date(Date.now() - config.windowMs);
      const currentWindow = new Date();
      
      // Clean up old records
      await supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', windowStart.toISOString());
      
      // Get current count for this identifier and endpoint
      const { data: existing, error } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Rate limit check error:', error);
        return { allowed: true, remaining: config.maxRequests, resetTime: currentWindow };
      }
      
      const currentCount = existing?.request_count || 0;
      
      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Date.now() + config.windowMs)
        };
      }
      
      // Increment counter
      if (existing) {
        await supabase
          .from('rate_limits')
          .update({ request_count: currentCount + 1 })
          .eq('identifier', identifier)
          .eq('endpoint', endpoint)
          .gte('window_start', windowStart.toISOString());
      } else {
        await supabase
          .from('rate_limits')
          .insert({
            identifier,
            endpoint,
            request_count: 1,
            window_start: currentWindow.toISOString()
          });
      }
      
      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetTime: new Date(Date.now() + config.windowMs)
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open for availability
      return { allowed: true, remaining: config.maxRequests, resetTime: new Date() };
    }
  }
  
  static async middleware(
    request: NextRequest,
    endpoint: string,
    config?: RateLimitConfig
  ): Promise<NextResponse | null> {
    if (process.env.NODE_ENV !== 'production' || process.env.API_RATE_LIMIT_ENABLED !== 'true') {
      return null;
    }
    
    const identifier = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const result = await this.checkRateLimit(identifier, endpoint, config);
    
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: result.resetTime },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': (config?.maxRequests || DEFAULT_RATE_LIMIT.maxRequests).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toISOString()
          }
        }
      );
    }
    
    return null;
  }
}

// Authentication middleware
export class AuthMiddleware {
  static async validateUser(request: NextRequest): Promise<{ user: any; error?: string }> {
    try {
      const { supabase } = createClientFromRequest(request);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { user: null, error: 'Authentication required' };
      }
      
      // Check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .single();
      
      if (userError || !userData) {
        return { user: null, error: 'User not found' };
      }
      
      return { user: userData };
    } catch (error) {
      console.error('Auth validation error:', error);
      return { user: null, error: 'Authentication failed' };
    }
  }
  
  static async requireAuth(request: NextRequest): Promise<NextResponse | { user: any }> {
    const { user, error } = await this.validateUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }
    
    return { user };
  }
  
  static async requireAdmin(request: NextRequest): Promise<NextResponse | { user: any }> {
    const { user, error } = await this.validateUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return { user };
  }
}

// Security logging
export class SecurityLogger {
  static async logSecurityEvent(
    eventType: string,
    description: string,
    request: NextRequest,
    userId?: string
  ): Promise<void> {
    try {
      if (process.env.ENABLE_AUDIT_LOGGING !== 'true') return;
      
      const supabase = createAdminClient();
      const ip = (request as any).ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const userAgent = request.headers.get('user-agent');
      
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_description: description,
        p_user_id: userId || null,
        p_ip_address: ip,
        p_user_agent: userAgent
      });
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }
}

// Main security middleware wrapper
export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: RateLimitConfig;
    endpoint?: string;
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Add security headers
      const response = NextResponse.next();
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Rate limiting
      if (options.rateLimit || process.env.API_RATE_LIMIT_ENABLED === 'true') {
        const rateLimitResponse = await RateLimiter.middleware(
          request,
          options.endpoint || request.nextUrl.pathname,
          options.rateLimit
        );
        if (rateLimitResponse) return rateLimitResponse;
      }
      
      // Authentication
      let user = null;
      if (options.requireAuth || options.requireAdmin) {
        const authResult = options.requireAdmin 
          ? await AuthMiddleware.requireAdmin(request)
          : await AuthMiddleware.requireAuth(request);
        
        if (authResult instanceof NextResponse) {
          return authResult;
        }
        user = authResult.user;
      }
      
      // Call the actual handler
      const result = await handler(request, { ...context, user });
      
      // Add security headers to the response
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        result.headers.set(key, value);
      });
      
      return result;
    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Log security incident
      await SecurityLogger.logSecurityEvent(
        'MIDDLEWARE_ERROR',
        `Security middleware error: ${error}`,
        request
      );
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Export utility functions
export { SECURITY_HEADERS, DEFAULT_RATE_LIMIT };