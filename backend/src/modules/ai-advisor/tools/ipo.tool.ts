import { IPOService } from '../../ipos/ipo.service';
import { ToolResult, toolError, toolNoData, toolSuccess } from './tool.types';

interface IPOOptions {
  queryType?: 'open' | 'search' | 'details' | 'upcoming' | 'all' | null;
  ipoName?: string | null;
}

export async function getIPOInfo(options: IPOOptions): Promise<ToolResult> {
  try {
    const qType = options.queryType || (options.ipoName ? 'search' : 'open');

    if (qType === 'open' || qType === 'upcoming' || qType === 'all') {
      let ipos: any[] = [];
      let label = 'open';
      if (qType === 'open') {
        ipos = await IPOService.getOpenIPOs();
      } else if (qType === 'upcoming') {
        ipos = await IPOService.getUpcomingIPOs();
        label = 'upcoming';
      } else if (qType === 'all') {
        const [open, upcoming] = await Promise.all([
           IPOService.getOpenIPOs(),
           IPOService.getUpcomingIPOs()
        ]);
        ipos = [...open.map(i => ({...i, status: 'open'})), ...upcoming.map(i => ({...i, status: 'upcoming'}))];
        label = 'current and upcoming';
      }

      if (!ipos || ipos.length === 0) {
        return toolNoData('ipo');
      }
      const maxIpos = ipos.slice(0, 10);
      return toolSuccess('ipo', {
        source: 'IPOAlerts',
        message: `List of ${label} IPOs. Returned ${maxIpos.length} out of ${ipos.length} IPOs. Note: IPO investments involve market risk. This information is for educational and analytical purposes and is not a guarantee of returns.`,
        count: ipos.length,
        ipos: maxIpos.map((ipo: any) => ({
          id: ipo.id,
          name: ipo.name,
          symbol: ipo.symbol,
          type: ipo.type,
          status: ipo.status,
          priceRange: ipo.priceRange,
          minQty: ipo.minQty,
          issueSize: ipo.issueSize,
          startDate: ipo.startDate,
          endDate: ipo.endDate
        }))
      });
    }

    if (!options.ipoName) {
      return toolError('ipo', 'No IPO name provided for search/details query.');
    }

    // Search
    const matches = await IPOService.searchIPOs(options.ipoName);
    
    if (matches.length === 0) {
      return toolNoData('ipo');
    }

    if (matches.length > 1) {
      // Multiple matches
      return toolSuccess('ipo', {
        source: 'IPOAlerts',
        message: 'Multiple IPOs matched. Please clarify which one you mean.',
        options: matches.map((m: any) => m.name)
      });
    }

    // Single match => fetch details
    const targetId = matches[0].id;
    const details = await IPOService.getIPODetails(targetId);

    return toolSuccess('ipo', {
      source: 'IPOAlerts',
      disclaimer: 'IPO investments involve market risk. This information is for educational and analytical purposes and is not a guarantee of returns.',
      ipo: {
        id: details.id,
        name: details.name,
        symbol: details.symbol,
        type: details.type,
        status: details.status,
        priceRange: details.priceRange,
        minQty: details.minQty,
        minAmount: details.minAmount,
        issueSize: details.issueSize,
        startDate: details.startDate,
        endDate: details.endDate,
        listingDate: details.listingDate,
        about: details.about ? details.about.substring(0, 500) + '...' : undefined,
        schedule: details.schedule
      }
    });

  } catch (err: any) {
    if (err.isAxiosError) {
      console.error(`[IPO TOOL] Axios Error: ${err.message}`);
      console.error(`[IPO TOOL] Endpoint: ${err.config?.url}`);
      console.error(`[IPO TOOL] Status: ${err.response?.status}`);
      console.error(`[IPO TOOL] Response: ${JSON.stringify(err.response?.data)}`);
    } else {
      console.error(`[IPO TOOL] Error: ${err.message}`, err.stack);
    }
    return toolError('ipo', 'Could not retrieve IPO data from the external API right now.');
  }
}
