# SmartChoice AI Web Scraping Architecture

## Overview

SmartChoice AI uses **Jina.ai Reader API** as the primary web scraping solution, providing clean, structured data extraction from e-commerce sites with automatic embedding and vector search integration.

## Why Jina.ai Reader API?

### ✅ Advantages:
- **Clean Data Extraction**: Converts messy HTML to clean, structured text
- **Anti-Bot Resistant**: Professional service handles rate limits and bot detection
- **Cost Effective**: Pay-per-use vs maintaining scraping infrastructure
- **Legal Compliance**: Respects robots.txt and provides proper attribution
- **Ready for AI**: Returns clean text perfect for embeddings and LLM processing
- **No Maintenance**: No need to update selectors when sites change

### 🔄 Fallback Options:
1. **Cloudflare Vectorize** - For edge-native processing
2. **Custom Puppeteer** - For complex JavaScript-heavy sites
3. **Scrapy/Playwright** - For high-volume batch processing

## Architecture Flow

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Product URLs    │───▶│ Jina Reader  │───▶│ Clean Product   │
│ (Amazon, etc.)  │    │ API          │    │ Data            │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                                                     ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Vector Store    │◀───│ Embedding    │◀───│ Data Processing │
│ (Pinecone)      │    │ Service      │    │ & Extraction    │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                                                     ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Claude/OpenAI   │◀───│ Agent        │◀───│ MCP Server      │
│ Agents          │    │ Orchestrator │    │ (Web Scraper)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## Implementation Details

### 1. ScrapingService
- **Purpose**: Core service for product data extraction
- **Input**: Product URLs from major retailers
- **Output**: Structured product data (title, price, description, etc.)
- **Features**: 
  - Automatic retailer detection
  - Price parsing with currency detection
  - Brand and category extraction
  - Rating and review count parsing

### 2. WebScraperMCPServer
- **Purpose**: MCP server for agent-driven scraping
- **Tools Available**:
  - `scrape_product`: Single product scraping with auto-indexing
  - `scrape_multiple_products`: Batch scraping (up to 50 URLs)
  - `search_similar_products`: Find similar products using vector search

### 3. Data Processing Pipeline
```typescript
URL → Jina.ai → Clean Text → Product Parser → Embeddings → Pinecone → Search
```

### 4. Supported Retailers
- Amazon
- Walmart  
- Target
- Best Buy
- Home Depot
- Lowe's
- eBay
- Etsy
- + Any e-commerce site (generic parsing)

## Usage Examples

### Basic Product Scraping
```bash
# Using MCP Server
pnpm mcp:web-scraper

# Tool: scrape_product
{
  "url": "https://www.amazon.com/dp/B08N5WRWNW",
  "autoIndex": true
}
```

### Batch Product Scraping
```typescript
// Service usage
const scrapingService = new ScrapingService()
const products = await scrapingService.scrapeMultipleProducts([
  'https://www.amazon.com/dp/B08N5WRWNW',
  'https://www.bestbuy.com/site/apple-airpods-pro/6418599.p',
  'https://www.target.com/p/apple-airpods-pro/-/A-54191097'
])
```

### Integration with Agents
```typescript
// OpenAI Agent using MCP
const webScraperAgent = new OpenAIAgent({
  tools: ['scrape_product', 'search_similar_products'],
  mcpServer: 'smartchoice-web-scraper'
})

await webScraperAgent.scrapeAndAnalyze({
  url: 'https://www.amazon.com/dp/B08N5WRWNW',
  findSimilar: true,
  priceAlert: true
})
```

## Performance & Scaling

### Rate Limiting
- **Jina.ai**: Built-in rate limiting and retry logic
- **Concurrent Requests**: Max 10 parallel requests
- **Batch Size**: Max 50 URLs per batch request

### Caching Strategy
```typescript
// Redis cache for scraped products (24h TTL)
const cacheKey = `product:${btoa(url)}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// Scrape and cache
const product = await scrapeProduct(url)
await redis.setex(cacheKey, 86400, JSON.stringify(product))
```

### Cost Optimization
- **Jina.ai**: ~$0.001 per page (very cost effective)
- **Caching**: Reduces repeat scraping costs
- **Batch Processing**: Optimizes API usage
- **Smart Deduplication**: Avoids scraping same products

## Error Handling

### Retry Logic
```typescript
const maxRetries = 3
let attempt = 0

while (attempt < maxRetries) {
  try {
    return await jinaReader.scrape(url)
  } catch (error) {
    attempt++
    if (attempt === maxRetries) throw error
    await delay(1000 * attempt) // Exponential backoff
  }
}
```

### Fallback Strategies
1. **Primary**: Jina.ai Reader API
2. **Fallback 1**: Direct HTML parsing with Cheerio
3. **Fallback 2**: Headless browser (Puppeteer)
4. **Fallback 3**: Manual data entry API

## Security & Compliance

### Legal Considerations
- ✅ Respects robots.txt via Jina.ai
- ✅ Reasonable rate limiting
- ✅ No aggressive scraping patterns
- ✅ Proper user agent headers
- ✅ Attribution when required

### Data Privacy
- ✅ No personal data collection
- ✅ Public product information only
- ✅ GDPR compliant data handling
- ✅ Secure API key management

## Monitoring & Analytics

### Metrics Tracked
- Scraping success rate by retailer
- Average response time
- Cost per product scraped
- Data quality scores
- Vector search relevance

### Alerts
- High error rates (>10%)
- API quota approaching
- Unusual response times
- Invalid product data detected

## Future Enhancements

### Planned Features
1. **Real-time Price Monitoring**: Track price changes
2. **Review Sentiment Analysis**: Extract review insights
3. **Image Analysis**: Process product images
4. **Inventory Tracking**: Monitor stock levels
5. **Competitive Analysis**: Compare across retailers

### Integration Roadmap
1. **Phase 1**: Jina.ai + Pinecone ✅
2. **Phase 2**: OpenAI Agents integration
3. **Phase 3**: Real-time monitoring
4. **Phase 4**: Advanced analytics
5. **Phase 5**: Multi-modal analysis (text + images)

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=your-key

# Optional (Jina.ai works without key but with limits)
JINA_API_KEY=your-jina-key

# For caching
REDIS_URL=redis://localhost:6379
```

### MCP Server Setup
```json
{
  "mcpServers": {
    "smartchoice-web-scraper": {
      "command": "pnpm",
      "args": ["run", "mcp:web-scraper"],
      "cwd": "/path/to/smartchoice-ai/apps/api",
      "description": "AI-powered web scraper with Jina.ai"
    }
  }
}
```

This architecture provides a robust, scalable, and legally compliant web scraping solution that integrates seamlessly with the SmartChoice AI agent ecosystem.