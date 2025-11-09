import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Simple health check without database dependency
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    // All checks passed
    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for more detailed health checks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkServices = false } = body;

    const healthData: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (checkServices) {
      // Add service checks here if needed
      healthData.services = {
        api: 'running',
        // Add other service checks
      };
    }

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Detailed health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
