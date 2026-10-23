import { toolSuccess, toolError, toolNoData, ToolResult } from './tool.types';
import { MutualFundService } from '../../mutual-funds/mutual-fund.service';

export async function getMutualFundInfo(options: {
  fundName?: string;
  category?: string;
  queryType?: 'search' | 'nav' | 'history' | 'categories' | 'details';
}): Promise<ToolResult<any>> {
  try {
    const qType = options.queryType || 'search';

    if (qType === 'categories') {
      const categories = await MutualFundService.getMutualFundCategories();
      // Filter if requested
      if (options.category) {
        const filtered = categories.results.filter((c: any) => 
          c.category.toLowerCase().includes(options.category!.toLowerCase()) || 
          c.sub_category.toLowerCase().includes(options.category!.toLowerCase())
        );
        if (filtered.length === 0) return toolNoData('mutual_fund');
        return toolSuccess('mutual_fund', {
           source: "MFNav",
           disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
           data: { categories: filtered }
        });
      }
      return toolSuccess('mutual_fund', { 
        source: "MFNav",
        disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
        data: { categories: categories.results.slice(0, 20) } // Return top 20 to avoid huge context
      });
    }

    if (!options.fundName) {
       if (options.category) {
          // They asked for funds in a category e.g. "large cap mutual funds"
          // We can do a search by category
          const searchRes = await MutualFundService.searchFunds(options.category);
          if (!searchRes.results || searchRes.results.length === 0) return toolNoData('mutual_fund');
          return toolSuccess('mutual_fund', {
             source: "MFNav",
             disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
             data: { searchResults: searchRes.results.slice(0, 5) }
          });
       }
       return toolError('mutual_fund', 'Please provide a mutual fund name to search.');
    }

    let searchRes = await MutualFundService.searchFunds(options.fundName);
    let allSchemes = searchRes.results || [];

    // 2. If no results, try fallback by splitting words and searching the longest one
    if (allSchemes.length === 0 && options.fundName.includes(' ')) {
        const words = options.fundName.split(' ').sort((a, b) => b.length - a.length);
        for (const w of words) {
            if (w.length < 3) continue;
            const fallbackRes = await MutualFundService.searchFunds(w);
            if (fallbackRes.results && fallbackRes.results.length > 0) {
                allSchemes = fallbackRes.results;
                break;
            }
        }
    }

    if (allSchemes.length === 0) {
      return toolNoData('mutual_fund');
    }

    // Normalize user's casual string
    const normalizedTarget = options.fundName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 3. Rank matches
    let exactMatches: any[] = [];
    let partialMatches: any[] = [];

    for (const s of allSchemes) {
        const normalizedScheme = s.scheme_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedScheme.includes(normalizedTarget)) {
            exactMatches.push(s);
        } else {
            const words = options.fundName.toLowerCase().split(/\s+/);
            const schemeLower = s.scheme_name.toLowerCase();
            if (words.every(w => schemeLower.includes(w))) {
                partialMatches.push(s);
            }
        }
    }

    let candidates = exactMatches.length > 0 ? exactMatches : partialMatches;

    if (candidates.length === 0) {
        return toolNoData('mutual_fund');
    }

    // 4. If multiple valid schemes, return options to the user
    if (candidates.length > 1 && qType !== 'search') {
        return toolSuccess('mutual_fund', {
            source: "MFNav",
            disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
            message: "Multiple schemes matched. Please clarify which one you mean.",
            data: { searchResults: candidates.slice(0, 5).map(c => ({
                 schemeCode: c.scheme_code,
                 schemeName: c.scheme_name,
                 fundHouse: c.fund_house,
                 planType: c.plan_type,
                 optionType: c.option_type
            })) }
        });
    }

    const scheme = candidates[0];
    console.log(`[MF SELECTED SCHEME] ${scheme.scheme_code} - ${scheme.scheme_name}`);

    if (qType === 'nav' || qType === 'details' || qType === 'search') {
      const navRes = await MutualFundService.getLatestNAV(scheme.scheme_code.toString());
      if (!navRes.data || navRes.data.length === 0) {
         // Distinguish NAV unavailable from Fund not found
         return toolSuccess('mutual_fund', {
           source: "MFNav",
           disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
           message: `The mutual fund "${scheme.scheme_name}" exists, but the latest NAV is currently unavailable from the API.`,
           data: {
             schemeCode: scheme.scheme_code,
             schemeName: scheme.scheme_name,
             fundHouse: scheme.fund_house,
             planType: scheme.plan_type,
             optionType: scheme.option_type,
             category: scheme.category,
             subCategory: scheme.sub_category,
             latestNAV: "Not Available",
             navDate: "Not Available"
           }
         });
      }

      const latest = navRes.data[0];
      return toolSuccess('mutual_fund', {
        source: "MFNav",
        disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
        message: `Latest available NAV for ${scheme.scheme_name}.`,
        data: {
          schemeCode: scheme.scheme_code,
          schemeName: scheme.scheme_name,
          fundHouse: scheme.fund_house,
          planType: scheme.plan_type,
          optionType: scheme.option_type,
          category: scheme.category,
          subCategory: scheme.sub_category,
          latestNAV: latest.nav,
          navDate: latest.nav_date,
          dayChangePct: latest.day_change_pct
        }
      });
    }

    if (qType === 'history') {
      const historyRes = await MutualFundService.getNAVHistory(scheme.scheme_code.toString());
      if (!historyRes.data || historyRes.data.length === 0) {
         return toolSuccess('mutual_fund', {
             source: "MFNav",
             disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
             message: `The mutual fund "${scheme.scheme_name}" exists, but historical NAV data is currently unavailable.`
         });
      }
      return toolSuccess('mutual_fund', {
        source: "MFNav",
        disclaimer: "Mutual fund investments are subject to market risks. Past performance does not guarantee future returns.",
        data: {
          schemeCode: scheme.scheme_code,
          schemeName: scheme.scheme_name,
          history: historyRes.data.slice(0, 10)
        }
      });
    }

    return toolNoData('mutual_fund');

  } catch (err: any) {
    if (err.isAxiosError) {
       console.error(`[MUTUAL FUND TOOL] Axios Error: ${err.message}`);
       console.error(`[MUTUAL FUND TOOL] Endpoint: ${err.config?.url}`);
       console.error(`[MUTUAL FUND TOOL] Status: ${err.response?.status}`);
       console.error(`[MUTUAL FUND TOOL] Response: ${JSON.stringify(err.response?.data)}`);
    } else {
       console.error(`[MUTUAL FUND TOOL] Error: ${err.message}`, err.stack);
    }
    return toolError('mutual_fund', 'Could not retrieve mutual fund data from the external API right now.');
  }
}
