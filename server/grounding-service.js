/**
 * Grounding Service for Tallman Chat
 * Searches tallmanequipment.com for relevant product and service information
 * Uses Google Custom Search with DuckDuckGo fallback
 */

const fetch = require('node-fetch');

// Configuration
const TALLMAN_SITE = 'tallmanequipment.com';
const SEARCH_TIMEOUT = 5000; // 5 seconds

/**
 * Search Google Custom Search API for tallmanequipment.com content
 * @param {string} query - The search query
 * @param {string} apiKey - Google API key
 * @param {string} searchEngineId - Google Custom Search Engine ID (optional)
 * @returns {Promise<Array>} - Array of search results
 */
async function searchGoogle(query, apiKey, searchEngineId) {
    if (!apiKey) {
        console.log('⚠️ Google Search: No API key provided');
        return null;
    }

    try {
        console.log(`🔍 Trying Google Custom Search for: "${query}"`);

        // Use Google Custom Search API with site restriction
        const searchQuery = `site:${TALLMAN_SITE} ${query}`;

        // If we have a custom search engine ID, use it
        if (searchEngineId) {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    console.log(`✅ Google Search found ${data.items.length} results`);
                    return data.items.map(item => ({
                        title: item.title,
                        link: item.link,
                        snippet: item.snippet,
                        source: 'google'
                    }));
                } else {
                    console.log('ℹ️ Google Search: No items found in results');
                }
            } else if (response.status === 403) {
                console.log('❌ Google Search: 403 Forbidden. Possible causes:');
                console.log('   1. Custom Search API not enabled in Google Cloud Console');
                console.log('   2. Project missing billing account (even for free tier)');
                console.log('   3. Daily quota of 100 free searches exceeded');
                console.log('   Check: https://console.cloud.google.com/apis/library/customsearch.googleapis.com');
            } else {
                console.log(`❌ Google Search: API responded with status ${response.status}`);
            }
        } else {
            console.log('⚠️ Google Search: No Search Engine ID provided');
        }

        return null; // Fall through to DuckDuckGo
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ Google Search timed out');
        } else {
            console.log('❌ Google Search error:', error.message);
        }
        return null;
    }
}

/**
 * Search DuckDuckGo for tallmanequipment.com content (fallback)
 * Uses DuckDuckGo's HTML search and scrapes results
 * @param {string} query - The search query
 * @returns {Promise<Array>} - Array of search results
 */
async function searchDuckDuckGo(query) {
    try {
        console.log('🦆 Trying DuckDuckGo search...');

        // DuckDuckGo Instant Answer API (limited but reliable)
        const searchQuery = `site:${TALLMAN_SITE} ${query}`;
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_redirect=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'TallmanChat/1.0'
            }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                const results = [];

                // Extract results from DuckDuckGo response
                if (data.AbstractURL && data.AbstractURL.includes(TALLMAN_SITE)) {
                    results.push({
                        title: data.Heading || 'Tallman Equipment',
                        link: data.AbstractURL,
                        snippet: data.Abstract || data.AbstractText,
                        source: 'duckduckgo'
                    });
                }

                // Check related topics
                if (data.RelatedTopics) {
                    for (const topic of data.RelatedTopics.slice(0, 5)) {
                        if (topic.FirstURL && topic.FirstURL.includes(TALLMAN_SITE)) {
                            results.push({
                                title: topic.Text ? topic.Text.split(' - ')[0] : 'Related Product',
                                link: topic.FirstURL,
                                snippet: topic.Text,
                                source: 'duckduckgo'
                            });
                        }
                    }
                }

                if (results.length > 0) {
                    console.log(`✅ DuckDuckGo found ${results.length} results`);
                    return results;
                }
            } else {
                console.log('⚠️ DuckDuckGo API returned non-JSON content. Likely being challenged as a bot.');
            }
        }

        // Fallback: Try DuckDuckGo HTML search with scraping
        return await scrapeDuckDuckGo(query);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ DuckDuckGo search timed out');
        } else {
            console.log('❌ DuckDuckGo search error:', error.message);
        }
        return await scrapeDuckDuckGo(query); // Try scraping even on error
    }
}

/**
 * Scrape DuckDuckGo HTML results as last resort
 * @param {string} query - The search query
 * @returns {Promise<Array>} - Array of search results
 */
async function scrapeDuckDuckGo(query) {
    try {
        console.log('🔍 Trying DuckDuckGo HTML scrape...');

        const searchQuery = `site:${TALLMAN_SITE} ${query}`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const html = await response.text();

            if (html.includes('Unfortunately, bots use DuckDuckGo too')) {
                console.log('⛔ DuckDuckGo blocked the scrape (Bot Challenge)');
                return null;
            }

            const results = [];

            // Re-evaluating HTML structure from ddg_results.html:
            // <h2 class="result__title"><a class="result__a" href="...">Title</a></h2>
            // <a class="result__snippet" href="...">Snippet... <b>query</b> ...</a>

            // More robust regex to match tags with nested content
            const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
            const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

            let match;
            const links = [];
            const titles = [];
            const snippets = [];

            while ((match = linkRegex.exec(html)) !== null) {
                let actualUrl = match[1];

                // Handle relative URLs if any (unlikely for DDG search results)
                if (actualUrl.startsWith('//')) actualUrl = 'https:' + actualUrl;

                // Decode DuckDuckGo redirect URL
                if (actualUrl.includes('uddg=')) {
                    const uddgMatch = actualUrl.match(/uddg=([^&]*)/);
                    if (uddgMatch) {
                        actualUrl = decodeURIComponent(uddgMatch[1]);
                    }
                }

                if (actualUrl.includes(TALLMAN_SITE)) {
                    links.push(actualUrl);
                    // Clean HTML tags from title
                    titles.push(match[2].replace(/<[^>]*>/g, '').trim());
                }
            }

            while ((match = snippetRegex.exec(html)) !== null) {
                // Clean HTML tags from snippet (like <b> tags)
                snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
            }

            for (let i = 0; i < Math.min(links.length, 5); i++) {
                results.push({
                    title: titles[i] || 'Tallman Equipment',
                    link: links[i],
                    snippet: snippets[i] || '',
                    source: 'duckduckgo-html'
                });
            }

            if (results.length > 0) {
                console.log(`✅ DuckDuckGo HTML scrape found ${results.length} results`);
                return results;
            }
        }

        return null;
    } catch (error) {
        console.log('❌ DuckDuckGo HTML scrape error:', error.message);
        return null;
    }
}

/**
 * Generate predefined Tallman Equipment links based on keywords
 * Used as ultimate fallback when search APIs fail
 * @param {string} query - The original query
 * @returns {Array} - Array of relevant links
 */
function getHardcodedLinks(query) {
    const queryLower = query.toLowerCase();
    const links = [];

    // Equipment categories
    const categories = [
        { keywords: ['bucket', 'aerial', 'lift', 'truck'], path: '/equipment/bucket-trucks', title: 'Bucket Trucks & Aerial Lifts' },
        { keywords: ['digger', 'derrick', 'drill'], path: '/equipment/digger-derricks', title: 'Digger Derricks' },
        { keywords: ['cable', 'puller', 'tensioner', 'stringing', 'block'], path: '/equipment/cable-equipment', title: 'Cable Placing & Stringing Equipment' },
        { keywords: ['trailer', 'reel'], path: '/equipment/trailers', title: 'Trailers & Reel Equipment' },
        { keywords: ['tool', 'transmission', 'distribution', 'lineman'], path: '/equipment/tools', title: 'Line Tools & Equipment' },
        { keywords: ['ppe', 'glove', 'safety', 'helmet', 'hat', 'vest', 'eye', 'protection'], path: '/product-category/ppe/', title: 'Personal Protective Equipment (PPE)' },
        { keywords: ['climb', 'belt', 'harness', 'lanyard', 'pole', 'fall'], path: '/product-category/climbing-gear/', title: 'Climbing Gear' },
        { keywords: ['grounding', 'jumper', 'mat'], path: '/product-category/grounding-jumpering/', title: 'Grounding & Jumpering' },
        { keywords: ['rigging', 'sling', 'hoist', 'rope', 'shackle'], path: '/product-category/rigging-lifting/', title: 'Rigging & Lifting' },
        { keywords: ['hydraulic', 'pump', 'tamper', 'breaker'], path: '/product-category/hydraulic-tools-accessories/', title: 'Hydraulic Tools' },
        { keywords: ['hand tool', 'wrench', 'plier', 'screwdriver', 'knife'], path: '/product-category/hand-tools/', title: 'Hand Tools' },
        { keywords: ['underground', 'duct', 'rodder', 'mandrel'], path: '/product-category/underground-tools/', title: 'Underground Tools' },
        { keywords: ['fiberglass', 'hotstick', 'measuring stick'], path: '/product-category/fiberglass-tools-accessories/', title: 'Fiberglass Tools & Sticks' },
        { keywords: ['meter', 'tester', 'detector', 'multimeter'], path: '/product-category/meters-instruments/', title: 'Meters & Instruments' },
        { keywords: ['rent', 'rental'], path: '/rentals', title: 'Equipment Rentals' },
        { keywords: ['service', 'repair', 'maintenance'], path: '/services', title: 'Service & Repair' },
        { keywords: ['parts', 'replacement'], path: '/parts', title: 'Parts & Components' },
        { keywords: ['buy', 'purchase', 'sale', 'new', 'used'], path: '/equipment', title: 'Equipment for Sale' },
        { keywords: ['contact', 'location', 'address', 'phone'], path: '/contact', title: 'Contact Us' },
        { keywords: ['about', 'company', 'history'], path: '/about', title: 'About Tallman Equipment' }
    ];

    for (const cat of categories) {
        if (cat.keywords.some(kw => queryLower.includes(kw))) {
            links.push({
                title: cat.title,
                link: `https://www.${TALLMAN_SITE}${cat.path}`,
                snippet: `Visit Tallman Equipment for ${cat.title.toLowerCase()}`,
                source: 'hardcoded'
            });
        }
    }

    // Always include main site if no specific matches
    if (links.length === 0) {
        links.push({
            title: 'Tallman Equipment Company',
            link: `https://www.${TALLMAN_SITE}`,
            snippet: 'Visit our website for complete equipment listings, services, and contact information',
            source: 'hardcoded'
        });
    }

    return links;
}

/**
 * Main grounding function - searches for relevant Tallman Equipment content
 * Uses Google first, falls back to DuckDuckGo, then hardcoded links
 * @param {string} query - The user's question/query
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Grounding results with links and context
 */
async function groundQuery(query, options = {}) {
    const { googleApiKey, googleSearchEngineId } = options;

    console.log(`🌐 Grounding query: "${query.substring(0, 50)}..."`);

    let results = null;

    // Try Google Search first
    results = await searchGoogle(query, googleApiKey, googleSearchEngineId);

    // Fallback to DuckDuckGo if Google failed or returned no results
    if (!results || results.length === 0) {
        console.log('🔄 Falling back to DuckDuckGo...');
        results = await searchDuckDuckGo(query);
    }

    // Ultimate fallback to hardcoded links
    if (!results || results.length === 0) {
        console.log('📋 Using hardcoded links as fallback...');
        results = getHardcodedLinks(query);
    }

    // Format results for inclusion in AI prompt
    const groundingContext = formatGroundingContext(results);

    return {
        success: results && results.length > 0,
        results: results || [],
        context: groundingContext,
        source: results?.[0]?.source || 'none'
    };
}

/**
 * Format grounding results into a context string for the AI prompt
 * @param {Array} results - Array of search results
 * @returns {string} - Formatted context string
 */
function formatGroundingContext(results) {
    if (!results || results.length === 0) {
        return '';
    }

    let context = '\n\n📍 RELEVANT TALLMAN EQUIPMENT RESOURCES:\n';

    for (const result of results.slice(0, 5)) {
        context += `\n• ${result.title}\n`;
        context += `  URL: ${result.link}\n`;
        if (result.snippet) {
            context += `  Info: ${result.snippet.substring(0, 150)}...\n`;
        }
    }

    context += '\nPlease include these links in your response when relevant to help the user find more information or make purchases.\n';

    return context;
}

/**
 * Enhance an AI response with grounding links
 * @param {string} response - The AI response text
 * @param {Array} results - The grounding results
 * @returns {string} - Enhanced response with links
 */
function enhanceResponseWithLinks(response, results) {
    if (!results || results.length === 0) {
        return response;
    }

    // Check if response already contains Tallman links
    if (response.includes('tallmanequipment.com')) {
        return response;
    }

    // Add a helpful links section at the end
    let enhanced = response;

    // Only add links if the response doesn't already have a resources section
    if (!response.toLowerCase().includes('for more information') &&
        !response.toLowerCase().includes('visit our website') &&
        !response.toLowerCase().includes('learn more at')) {

        enhanced += '\n\n**For more information:**\n';
        for (const result of results.slice(0, 3)) {
            enhanced += `- [${result.title}](${result.link})\n`;
        }
    }

    return enhanced;
}

module.exports = {
    groundQuery,
    formatGroundingContext,
    enhanceResponseWithLinks,
    searchGoogle,
    searchDuckDuckGo,
    getHardcodedLinks
};
