import { NextRequest, NextResponse } from 'next/server';
import { chromium, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { withSecurity, validateInput, sanitizeInput, SecurityLogger } from '@/lib/security/api-security';
import { createClient } from '@/lib/supabase/server';
import { type TollNotice } from '@/lib/toll-service';

export const dynamic = 'force-dynamic'; // Ensure this runs server-side only

async function takeScreenshot(page: Page, name = 'error') {
  try {
    const screenshotDir = path.join(process.cwd(), 'public', 'debug');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `${name}-screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    const htmlPath = path.join(screenshotDir, `${name}-content-${Date.now()}.html`);
    const htmlContent = await page.content();
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(`Debug files saved: ${screenshotPath.replace(process.cwd(), '')} and ${htmlPath.replace(process.cwd(), '')}`);
  } catch (debugError: any) {
    console.error('Failed to save debug files:', debugError.message);
  }
}

const stateMap: { [key: string]: string } = {
  'NSW': 'New South Wales',
  'VIC': 'Victoria',
  'QLD': 'Queensland',
  'WA': 'Western Australia',
  'SA': 'South Australia',
  'TAS': 'Tasmania',
  'ACT': 'Australian Capital Territory',
  'NT': 'Northern Territory',
};

async function saveTollNoticesToDatabase(notices: any[], userId: string, searchSource: string = 'api_search') {
  const supabase = await createClient();
  
  const savedNotices = [];
  const duplicateNotices = [];
  let tableMissing = false;
  
  for (const notice of notices) {
    try {
      // Try to insert the notice
      const { data, error } = await supabase
        .from('toll_notices')
        .insert({
          licence_plate: notice.licencePlate,
          state: notice.state,
          toll_notice_number: notice.tollNoticeNumber || null,
          motorway: notice.motorway,
          issued_date: notice.issuedDate,
          trip_status: notice.tripStatus,
          admin_fee: notice.adminFee,
          toll_amount: notice.tollAmount,
          total_amount: notice.totalAmount,
          due_date: notice.dueDate || notice.issuedDate, // Use issued date if due date not available
          is_paid: notice.isPaid || false,
          vehicle_type: notice.vehicleType || 'car',
          search_source: searchSource,
          user_id: userId
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`Duplicate toll notice skipped: ${notice.licencePlate} - ${notice.motorway} - ${notice.issuedDate}`);
          duplicateNotices.push(notice);
        } else if (error.code === '42P01') { // Table doesn't exist
          console.log('Toll notices table does not exist - migration needed');
          tableMissing = true;
          break; // Exit the loop since table doesn't exist
        } else {
          console.error('Error saving toll notice:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            notice: {
              licencePlate: notice.licencePlate,
              motorway: notice.motorway,
              issuedDate: notice.issuedDate
            }
          });
        }
      } else {
        savedNotices.push(data);
      }
    } catch (err) {
      console.error('Error inserting toll notice:', err);
    }
  }
  
  return { 
    savedNotices, 
    duplicateNotices, 
    tableMissing,
    totalProcessed: notices.length 
  };
}

async function handleTollSearch(request: NextRequest, context: { user: any }): Promise<NextResponse> {
  // Handle both GET (query params) and POST (JSON body) requests
  let licencePlate, state, tollNoticeNumber, isMotorcycle;
  
  if (request.method === 'GET') {
    const url = new URL(request.url);
    licencePlate = url.searchParams.get('licencePlate');
    state = url.searchParams.get('state');
    tollNoticeNumber = url.searchParams.get('tollNoticeNumber');
    isMotorcycle = url.searchParams.get('isMotorcycle') === 'true';
  } else {
    const body = await request.json();
    ({ licencePlate, state, tollNoticeNumber, isMotorcycle } = body);
  }
  let browser;
  let page: Page | undefined;

  // Validate required inputs
  if (!licencePlate || !state) {
    await SecurityLogger.logSecurityEvent(
      'INVALID_TOLL_SEARCH',
      'Missing required fields in toll search',
      request,
      context.user?.id
    );
    return NextResponse.json(
      { error: 'Missing required fields: licencePlate and state' },
      { status: 400 }
    );
  }

  // Validate and sanitize inputs
  const sanitizedLicencePlate = sanitizeInput(licencePlate).toUpperCase();
  const sanitizedState = sanitizeInput(state).toUpperCase();
  const sanitizedTollNoticeNumber = tollNoticeNumber ? sanitizeInput(tollNoticeNumber) : null;

  // Validate license plate format
  if (!validateInput.licensePlate(sanitizedLicencePlate)) {
    return NextResponse.json(
      { error: 'Invalid license plate format' },
      { status: 400 }
    );
  }

  // Validate state
  const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
  if (!validStates.includes(sanitizedState)) {
    return NextResponse.json(
      { error: 'Invalid state code' },
      { status: 400 }
    );
  }

  console.log('Received toll search request:', { 
    licencePlate: sanitizedLicencePlate, 
    state: sanitizedState, 
    tollNoticeNumber: sanitizedTollNoticeNumber,
    userId: context.user.id
  });

  // Retry configuration
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for license plate ${sanitizedLicencePlate}`);
      
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
      });

      const browserContext = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        // Add some human-like behavior
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      page = await browserContext.newPage();

      // Set shorter, more aggressive timeouts
      page.setDefaultTimeout(15000); // 15 second default timeout
      page.setDefaultNavigationTimeout(20000); // 20 second navigation timeout

      console.log('Navigating to Linkt...');
      await page.goto('https://tollnotice.linkt.com.au/Search.asp', { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });
      
      console.log('Navigation complete. Current URL:', page.url());

      // Wait for form to be ready with shorter timeout
      await page.waitForSelector('[name="txtRegistrationNumber"]', { timeout: 10000 });
      
      console.log('Form is ready. Filling details...');
      await page.locator('[name="txtRegistrationNumber"]').fill(sanitizedLicencePlate);

      const stateLabel = stateMap[sanitizedState];
      if (!stateLabel) throw new Error(`Invalid state code: ${sanitizedState}`);
      
      await page.locator('[name="cboStateRegistered"]').selectOption({ label: stateLabel });

      if (sanitizedTollNoticeNumber) {
        await page.locator('[name="txttollNoticeNumber"]').fill(sanitizedTollNoticeNumber);
      }
      
      if (isMotorcycle) {
        await page.locator('[name="chkMotorbike"]').check();
      }

      console.log('Submitting search...');
      
      // Click submit and wait for navigation/results with shorter timeout
      const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes('Search.asp') && response.status() === 200, { timeout: 20000 }),
        page.locator('button[type="submit"]:has-text("Search for toll notices")').click()
      ]);

      console.log('Search submitted, waiting for results...');
      
             // Wait for either results or no results message with shorter timeout
       const resultsSelector = 'table#additionalResults';
       const noResultsSelector = 'text=/no trip.*found/i';
       
       try {
         await page.waitForFunction(
           () => {
             const resultsTable = document.querySelector('table#additionalResults');
             const bodyText = document.querySelector('body')?.textContent?.toLowerCase() || '';
             const noResultsFound = bodyText.includes('no toll notices were found') || 
                                  bodyText.includes('no trip') || 
                                  bodyText.includes('sorry, no trip');
             return resultsTable !== null || noResultsFound === true;
           },
           { timeout: 20000 }
         );
       } catch (waitError) {
        console.log('Timeout waiting for results, checking current page state...');
        
        // Take screenshot for debugging
        if (page && !page.isClosed()) {
          await takeScreenshot(page, 'timeout');
        }
        
        // Check if we're on an error page or still loading
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        console.log('Current URL after timeout:', currentUrl);
        console.log('Page title:', await page.title());
        
        // If we're still on the search page, it might be a slow response
        if (currentUrl.includes('Search.asp') && !pageContent.includes('additionalResults')) {
          throw new Error('Search request timed out - website may be experiencing issues');
        }
      }
      
             // Check for no results first
       const bodyText = await page.textContent('body') || '';
       const hasNoResults = bodyText.toLowerCase().includes('no toll notices were found') || 
                           bodyText.toLowerCase().includes('no trip') || 
                           bodyText.toLowerCase().includes('sorry, no trip');
       
       if (hasNoResults) {
         console.log('No toll notices found for license plate:', sanitizedLicencePlate);
         await browser.close();
         return NextResponse.json({ 
           success: true, 
           notices: [], 
           savedCount: 0, 
           duplicateCount: 0,
           totalFound: 0,
           totals: {
             totalAdminFee: 0,
             totalTollAmount: 0,
             totalAmountPayable: 0,
             totalAdminFeeFormatted: '$0.00',
             totalTollAmountFormatted: '$0.00',
             totalAmountPayableFormatted: '$0.00',
             count: 0
           }
         });
       }

      // Check if results table exists
      if (await page.locator(resultsSelector).isVisible()) {
        console.log('Parsing results table...');
        
        const result = await page.evaluate(({ st }) => {
          const notices = Array.from(document.querySelectorAll('table#additionalResults tbody tr')).map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return null;
            
            const lpn = cells[1]?.textContent?.trim() || 'N/A';
            const motorway = cells[2]?.textContent?.trim() || 'N/A';
            const issuedDate = cells[3]?.textContent?.trim() || 'N/A';
            const tripStatus = cells[4]?.querySelector('abbr')?.textContent?.trim() || cells[4]?.textContent?.trim() || 'N/A';
            const adminFee = parseFloat((cells[5]?.textContent || '$0').replace(/[^0-9.-]+/g, ''));
            const tollAmount = parseFloat((cells[6]?.textContent || '$0').replace(/[^0-9.-]+/g, ''));
            
            return {
              licencePlate: lpn,
              state: st,
              motorway: motorway,
              issuedDate: issuedDate,
              tripStatus: tripStatus,
              adminFee: isNaN(adminFee) ? 0 : adminFee,
              tollAmount: isNaN(tollAmount) ? 0 : tollAmount,
              totalAmount: (isNaN(adminFee) ? 0 : adminFee) + (isNaN(tollAmount) ? 0 : tollAmount),
              tollNoticeNumber: '', // Not available in this view
              dueDate: issuedDate, // Use issued date as fallback
              isPaid: false,
              vehicleType: 'car'
            };
          }).filter((n): n is NonNullable<typeof n> => n !== null);

          // Calculate totals
          const totalAdminFee = notices.reduce((sum, notice) => sum + notice.adminFee, 0);
          const totalTollAmount = notices.reduce((sum, notice) => sum + notice.tollAmount, 0);
          const totalAmountPayable = totalAdminFee + totalTollAmount;

          return { 
            notices,
            totals: {
              totalAdminFee,
              totalTollAmount,
              totalAmountPayable,
              totalAdminFeeFormatted: `$${totalAdminFee.toFixed(2)}`,
              totalTollAmountFormatted: `$${totalTollAmount.toFixed(2)}`,
              totalAmountPayableFormatted: `$${totalAmountPayable.toFixed(2)}`,
              count: notices.length
            }
          };
        }, { st: sanitizedState });

        console.log(`Found ${result.notices.length} notices with total amount: ${result.totals.totalAmountPayableFormatted}`);
        
        // Save notices to database
        const { savedNotices, duplicateNotices, tableMissing, totalProcessed } = await saveTollNoticesToDatabase(
          result.notices, 
          context.user.id, 
          'api_search'
        );
        
        await browser.close();
        
        if (tableMissing) {
          return NextResponse.json({ 
            success: true, 
            notices: result.notices, // Return the scraped notices even if we can't save them
            savedCount: 0,
            duplicateCount: 0,
            totalFound: result.notices.length,
            totals: result.totals,
            needsMigration: true,
            message: 'Toll notices found but could not be saved. Database migration required.'
          });
        }
        
        return NextResponse.json({ 
          success: true, 
          notices: savedNotices,
          savedCount: savedNotices.length,
          duplicateCount: duplicateNotices.length,
          totalFound: result.notices.length,
          totals: result.totals
        });
      } else {
        throw new Error('Results table not found - website may have changed structure');
      }

    } catch (error: any) {
      lastError = error;
      console.error(`Scraping attempt ${attempt} failed:`, error.message);
      
      if (page && !page.isClosed()) {
        await takeScreenshot(page, `error-attempt-${attempt}`);
      }
      
      if (browser) {
        await browser.close();
        browser = undefined;
      }
      
      // Don't retry on certain errors
      if (error.message.includes('Invalid state code') || 
          error.message.includes('Invalid license plate') ||
          error.message.includes('Missing required fields')) {
        break;
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  console.error('All scraping attempts failed:', lastError?.message);
  
  // Log security incident
  await SecurityLogger.logSecurityEvent(
    'TOLL_SEARCH_ERROR',
    `Toll search failed after ${maxRetries} attempts: ${lastError?.message}`,
    request,
    context.user?.id
  );
  
  return NextResponse.json({ 
    success: false, 
    notices: [],
    error: `Search failed after ${maxRetries} attempts. The toll notice website may be experiencing issues. Please try again later.`,
    totals: {
      totalAdminFee: 0,
      totalTollAmount: 0,
      totalAmountPayable: 0,
      totalAdminFeeFormatted: '$0.00',
      totalTollAmountFormatted: '$0.00',
      totalAmountPayableFormatted: '$0.00',
      count: 0
    }
  }, { status: 500 });
}

// Export secured endpoint
export const POST = withSecurity(handleTollSearch, {
  requireAuth: true,
  endpoint: '/api/tolls/search',
  rateLimit: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5, // 5 toll searches per 5 minutes
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// GET endpoint to retrieve saved toll notices from database
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const licencePlateFilter = searchParams.get('licencePlate');
    const statusFilter = searchParams.get('status');

    // Build query
    let query = supabase
      .from('toll_notices')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters
    if (licencePlateFilter) {
      query = query.ilike('licence_plate', `%${licencePlateFilter}%`);
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'paid') {
        query = query.eq('is_paid', true);
      } else if (statusFilter === 'unpaid') {
        query = query.eq('is_paid', false);
      }
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'licence_plate', 'motorway', 'issued_date', 'total_amount', 'is_paid'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: notices, error } = await query;

    if (error) {
      console.error('Error fetching toll notices:', error);
      
      // Check if table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          notices: [],
          statistics: {
            total_notices: 0,
            total_amount: 0,
            paid_notices: 0,
            unpaid_notices: 0,
            overdue_notices: 0,
            unpaid_amount: 0
          },
          totalCount: 0,
          needsMigration: true,
          message: 'Database table not found. Please run the migration script.',
          filters: {
            licencePlate: licencePlateFilter,
            status: statusFilter,
            sortBy,
            sortOrder
          },
          timestamp: new Date().toISOString()
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch toll notices' },
        { status: 500 }
      );
    }

    // Get statistics - with fallback if function doesn't exist
    let statsData = {
      total_notices: 0,
      total_amount: 0,
      paid_notices: 0,
      unpaid_notices: 0,
      overdue_notices: 0,
      unpaid_amount: 0
    };

    try {
      const { data: stats, error: statsError } = await supabase
        .rpc('get_user_toll_statistics', { user_uuid: user.id });
      
      if (!statsError && stats) {
        statsData = stats;
      }
    } catch (statsError) {
      console.log('Statistics function not available, using basic calculation');
      // Calculate basic stats from the notices
      if (notices && notices.length > 0) {
        statsData = {
          total_notices: notices.length,
          total_amount: notices.reduce((sum: number, n: any) => sum + (n.total_amount || 0), 0),
          paid_notices: notices.filter((n: any) => n.is_paid).length,
          unpaid_notices: notices.filter((n: any) => !n.is_paid).length,
          overdue_notices: notices.filter((n: any) => !n.is_paid && new Date(n.due_date) < new Date()).length,
          unpaid_amount: notices.filter((n: any) => !n.is_paid).reduce((sum: number, n: any) => sum + (n.total_amount || 0), 0)
        };
      }
    }

    return NextResponse.json({
      success: true,
      notices: notices || [],
      statistics: statsData,
      totalCount: notices?.length || 0,
      filters: {
        licencePlate: licencePlateFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in toll search GET API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch toll notices. Please try again.',
        notices: [], 
        statistics: {
          total_notices: 0,
          total_amount: 0,
          paid_notices: 0,
          unpaid_notices: 0,
          overdue_notices: 0,
          unpaid_amount: 0
        }
      },
      { status: 500 }
    );
  }
}