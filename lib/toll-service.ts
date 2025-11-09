import { logger } from './logger';
import { TollNotice } from './types';

export type { TollNotice };

export interface TollSearchParams {
  licencePlate: string;
  state: string;
  tollNoticeNumber?: string;
  isMotorcycle?: boolean;
}

export interface TollSearchResult {
  success: boolean;
  notices: TollNotice[];
  totalAmount: number;
  totalAdminFee: number;
  error?: string;
  totals?: {
    totalAdminFee: number;
    totalTollAmount: number;
    totalAmountPayable: number;
    totalAdminFeeFormatted: string;
    totalTollAmountFormatted: string;
    totalAmountPayableFormatted: string;
    count: number;
  };
}

// Web scraping configuration for toll notice websites
const _TOLL_WEBSITES = {
  LINKT: 'https://tollnotice.linkt.com.au/',
  ETOLL: 'https://paytollnotice.mye-toll.com.au/'
};

// Interface for web scraping results
interface _ScrapedTollData {
  tollNoticeNumber: string;
  motorway: string;
  issuedDate: string;
  adminFee: number;
  tollAmount: number;
  totalAmount: number;
  dueDate: string;
  tripStatus: string;
}

class TollService {
  private static instance: TollService;
  private scrapedNotices: Map<string, TollNotice[]> = new Map();
  // Add request tracking to prevent concurrent requests
  private activeRequests: Map<string, Promise<TollSearchResult>> = new Map();

  static getInstance(): TollService {
    if (!TollService.instance) {
      TollService.instance = new TollService();
    }
    return TollService.instance;
  }

  /**
   * Search for toll notices for a given licence plate and state
   */
  async searchTollNotices(params: TollSearchParams): Promise<TollSearchResult> {
    try {
      const cacheKey = `${params.licencePlate}_${params.state}`;
      
      // Check if there's already an active request for this license plate
      if (this.activeRequests.has(cacheKey)) {
        logger.info('Returning existing request for license plate', { licencePlate: params.licencePlate });
        return await this.activeRequests.get(cacheKey)!;
      }

      // Check cache first
      if (this.scrapedNotices.has(cacheKey)) {
        const cachedNotices = this.scrapedNotices.get(cacheKey)!;
        return this.filterAndReturnResults(cachedNotices, params);
      }

      // Create and track the request
      const requestPromise = this.performTollSearch(params, cacheKey);
      this.activeRequests.set(cacheKey, requestPromise);
      
      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up active request tracking
        this.activeRequests.delete(cacheKey);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error searching toll notices via API', { 
        error: { message: errorMessage, stack: error instanceof Error ? error.stack : undefined }, 
        params 
      });
      
      // Provide more specific error messages
      let userError = 'Failed to retrieve toll notices. Please try again.';
      if (errorMessage.includes('timed out')) {
        userError = 'The toll notice search is taking longer than expected. The toll website may be experiencing high traffic. Please try again in a few minutes.';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        userError = 'Network connection issue. Please check your internet connection and try again.';
      } else if (errorMessage.includes('website may be experiencing issues')) {
        userError = 'The toll notice website appears to be experiencing issues. Please try again later.';
      }
      
      return {
        success: false,
        notices: [],
        totalAmount: 0,
        totalAdminFee: 0,
        error: userError
      };
    }
  }

  /**
   * Perform the actual toll search
   */
  private async performTollSearch(params: TollSearchParams, cacheKey: string): Promise<TollSearchResult> {
    // Call the API route to search for toll notices using POST
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout (reduced from 45s)
    
    try {
      const response = await fetch('/api/tolls/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licencePlate: params.licencePlate,
          state: params.state,
          tollNoticeNumber: params.tollNoticeNumber,
          isMotorcycle: params.isMotorcycle
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.notices) {
        // Cache the results
        this.scrapedNotices.set(cacheKey, result.notices);
        
        return {
          success: true,
          notices: result.notices,
          totalAmount: result.totals?.totalAmountPayable || result.totalAmount || 0,
          totalAdminFee: result.totals?.totalAdminFee || result.totalAdminFee || 0,
          totals: result.totals // Pass through the complete totals
        };
      } else {
        return {
          success: false,
          notices: [],
          totalAmount: 0,
          totalAdminFee: 0,
          error: result.error || 'Failed to search toll notices'
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out after 35 seconds');
      }
      throw error;
    }
  }

  /**
   * Filter and return search results
   */
  private filterAndReturnResults(notices: TollNotice[], params: TollSearchParams): TollSearchResult {
    let filteredNotices = notices;

    // If toll notice number is provided, filter by that
    if (params.tollNoticeNumber) {
      filteredNotices = filteredNotices.filter(notice => 
        notice.toll_notice_number?.includes(params.tollNoticeNumber!)
      );
    }

    // Filter by vehicle type if specified
    if (params.isMotorcycle !== undefined) {
      const vehicleType = params.isMotorcycle ? 'motorcycle' : 'car';
      filteredNotices = filteredNotices.filter(notice => 
        notice.vehicle_type === vehicleType
      );
    }

    const totalAmount = filteredNotices.reduce((sum, notice) => sum + notice.total_amount, 0);
    const totalAdminFee = filteredNotices.reduce((sum, notice) => sum + notice.admin_fee, 0);

    return {
      success: true,
      notices: filteredNotices,
      totalAmount,
      totalAdminFee
    };
  }

  /**
   * Remove duplicate toll notices based on toll notice number
   */
  private removeDuplicateNotices(notices: TollNotice[]): TollNotice[] {
    const seen = new Set<string>();
    return notices.filter(notice => {
      if (notice.toll_notice_number && seen.has(notice.toll_notice_number)) {
        return false;
      }
      if (notice.toll_notice_number) {
        seen.add(notice.toll_notice_number);
      }
      return true;
    });
  }

  /**
   * Get all toll notices for a specific vehicle
   */
  async getTollNoticesForVehicle(licencePlate: string, state: string): Promise<TollNotice[]> {
    try {
      const result = await this.searchTollNotices({ licencePlate, state });
      return result.notices;
    } catch (error) {
      logger.error('Error getting toll notices for vehicle', { error, licencePlate, state });
      return [];
    }
  }

  /**
   * Get summary statistics for toll notices
   */
  async getTollStatistics(): Promise<{
    totalNotices: number;
    unpaidNotices: number;
    totalUnpaidAmount: number;
    overdueNotices: number;
  }> {
    try {
      // Get all cached notices
      const allNotices: TollNotice[] = [];
      for (const notices of Array.from(this.scrapedNotices.values())) {
        allNotices.push(...notices);
      }
      
      const unpaidNotices = allNotices.filter(notice => !notice.is_paid);
      const currentDate = new Date();
      const overdueNotices = unpaidNotices.filter(notice => 
        new Date(notice.due_date) < currentDate
      );

      return {
        totalNotices: allNotices.length,
        unpaidNotices: unpaidNotices.length,
        totalUnpaidAmount: unpaidNotices.reduce((sum, notice) => sum + notice.total_amount, 0),
        overdueNotices: overdueNotices.length
      };
    } catch (error) {
      logger.error('Error getting toll statistics', { error });
      return {
        totalNotices: 0,
        unpaidNotices: 0,
        totalUnpaidAmount: 0,
        overdueNotices: 0
      };
    }
  }

  /**
   * Mark a toll notice as paid (updates local cache)
   */
  async markTollNoticePaid(tollNoticeId: string): Promise<boolean> {
    try {
      // Find the notice in cached data
      for (const notices of Array.from(this.scrapedNotices.values())) {
        const notice = notices.find(n => n.id === tollNoticeId);
        if (notice) {
          notice.is_paid = true;
          notice.trip_status = 'Paid';
          logger.info('Toll notice marked as paid in cache', { tollNoticeId });
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Error marking toll notice as paid', { error, tollNoticeId });
      return false;
    }
  }

  /**
   * Clear cached toll notice data
   */
  clearCache(): void {
    this.scrapedNotices.clear();
    logger.info('Toll notice cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cacheSize: number; cachedVehicles: string[] } {
    return {
      cacheSize: this.scrapedNotices.size,
      cachedVehicles: Array.from(this.scrapedNotices.keys())
    };
  }
}

export const tollService = TollService.getInstance();
export default tollService;