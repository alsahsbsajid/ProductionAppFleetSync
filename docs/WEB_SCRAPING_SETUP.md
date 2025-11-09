# Web Scraping Setup for Toll Notice Integration

This document outlines the setup required to implement actual web scraping for toll notice data from official NSW toll websites.

## Overview

The toll service has been updated to scrape data from official toll notice websites instead of using mock data:

- **Linkt Website**: https://tollnotice.linkt.com.au/ <mcreference link="https://tollnotice.linkt.com.au/" index="1">1</mcreference>
- **E-Toll Website**: https://paytollnotice.mye-toll.com.au/ <mcreference link="https://paytollnotice.mye-toll.com.au/" index="5">5</mcreference>

## Required Dependencies

To implement actual web scraping, you'll need to install the following packages:

```bash
npm install puppeteer playwright cheerio axios
npm install --save-dev @types/puppeteer
```

### Package Descriptions:

- **Puppeteer**: Controls headless Chrome for dynamic content scraping
- **Playwright**: Alternative to Puppeteer with better cross-browser support
- **Cheerio**: Server-side jQuery implementation for HTML parsing
- **Axios**: HTTP client for making requests

## Implementation Steps

### 1. Replace Simulation Methods

Replace the `simulateWebScraping` method in `lib/toll-service.ts` with actual scraping logic:

```typescript
private async scrapeWebsite(url: string, params: TollSearchParams): Promise<ScrapedTollData[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url);
    
    // Fill in the form
    await page.type('#licence-plate-input', params.licencePlate);
    await page.select('#state-select', params.state);
    
    if (params.isMotorcycle) {
      await page.click('#motorcycle-checkbox');
    }
    
    if (params.tollNoticeNumber) {
      await page.type('#toll-notice-input', params.tollNoticeNumber);
    }
    
    // Submit the form
    await page.click('#search-button');
    await page.waitForSelector('.search-results', { timeout: 10000 });
    
    // Extract data
    const results = await page.evaluate(() => {
      // Extract toll notice data from the page
      const notices = [];
      const rows = document.querySelectorAll('.toll-notice-row');
      
      rows.forEach(row => {
        notices.push({
          tollNoticeNumber: row.querySelector('.notice-number')?.textContent || '',
          motorway: row.querySelector('.motorway')?.textContent || '',
          issuedDate: row.querySelector('.issued-date')?.textContent || '',
          adminFee: parseFloat(row.querySelector('.admin-fee')?.textContent?.replace('$', '') || '0'),
          tollAmount: parseFloat(row.querySelector('.toll-amount')?.textContent?.replace('$', '') || '0'),
          totalAmount: parseFloat(row.querySelector('.total-amount')?.textContent?.replace('$', '') || '0'),
          dueDate: row.querySelector('.due-date')?.textContent || '',
          tripStatus: row.querySelector('.status')?.textContent || 'Unpaid'
        });
      });
      
      return notices;
    });
    
    return results;
  } finally {
    await browser.close();
  }
}
```

### 2. Handle Rate Limiting

Implement proper rate limiting to avoid being blocked:

```typescript
private async delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

private async scrapeWithRetry(url: string, params: TollSearchParams, maxRetries = 3): Promise<ScrapedTollData[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.delay(1000 * attempt); // Progressive delay
      return await this.scrapeWebsite(url, params);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`Scraping attempt ${attempt} failed, retrying...`, { error });
    }
  }
  return [];
}
```

### 3. Error Handling

Implement robust error handling for various scenarios:

```typescript
private async handleScrapingError(error: any, url: string): Promise<ScrapedTollData[]> {
  if (error.message.includes('timeout')) {
    logger.error('Scraping timeout', { url });
  } else if (error.message.includes('blocked')) {
    logger.error('IP blocked or rate limited', { url });
  } else {
    logger.error('Unknown scraping error', { error, url });
  }
  return [];
}
```

## Security Considerations

1. **User-Agent Rotation**: Use different user agents to avoid detection
2. **Proxy Support**: Consider using rotating proxies for production
3. **CAPTCHA Handling**: Implement CAPTCHA solving if required
4. **Legal Compliance**: Ensure scraping complies with website terms of service

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Web Scraping Configuration
SCRAPING_ENABLED=true
SCRAPING_TIMEOUT=30000
SCRAPING_MAX_RETRIES=3
SCRAPING_DELAY_MS=2000

# Proxy Configuration (optional)
PROXY_URL=
PROXY_USERNAME=
PROXY_PASSWORD=
```

## Testing

Create test cases to verify scraping functionality:

```typescript
// tests/toll-scraping.test.ts
describe('Toll Notice Scraping', () => {
  it('should scrape toll notices from Linkt website', async () => {
    const params = {
      licencePlate: 'ABC123',
      state: 'NSW'
    };
    
    const result = await tollService.searchTollNotices(params);
    expect(result.success).toBe(true);
  });
});
```

## Monitoring

Implement monitoring to track scraping success rates:

```typescript
private trackScrapingMetrics(website: string, success: boolean, duration: number) {
  // Log metrics for monitoring
  logger.info('Scraping metrics', {
    website,
    success,
    duration,
    timestamp: new Date().toISOString()
  });
}
```

## Current Status

The toll service is now configured to:
- ✅ Remove all mock data
- ✅ Implement web scraping architecture
- ✅ Cache scraped results
- ✅ Handle multiple toll websites
- ⏳ Requires actual scraping implementation (see steps above)

When you search for toll notices now, the system will attempt to scrape from official websites but will return empty results until the actual scraping logic is implemented.