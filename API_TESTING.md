# API Testing Guide

## Quick Start

### 1. Start the API Server
```bash
cd apps/api
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### 2. Run the Test Script
```bash
# From the project root
node test-api.js
```

This will run a comprehensive test suite covering all API endpoints.

## Available Endpoints

### Health Check
```bash
# Basic health check
curl http://localhost:3001/api/v1/health

# Readiness probe
curl http://localhost:3001/api/v1/health/ready

# Liveness probe  
curl http://localhost:3001/api/v1/health/live
```

### Product Search

#### POST Search (Recommended)
```bash
curl -X POST http://localhost:3001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gaming laptop",
    "pagination": {"page": 1, "limit": 5},
    "sortBy": "relevance"
  }'
```

#### GET Search (Simple)
```bash
curl "http://localhost:3001/api/v1/search?q=headphones&limit=3&sort=price_low"
```

### Product Details
```bash
# Get product by ID (use an ID from search results)
curl http://localhost:3001/api/v1/products/PRODUCT_ID

# Example with mock data ID
curl http://localhost:3001/api/v1/products/laptop-1
```

### Similar Products
```bash
# Get similar products
curl "http://localhost:3001/api/v1/products/laptop-1/similar?limit=5"
```

### Product Comparison
```bash
curl -X POST http://localhost:3001/api/v1/products/compare \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["laptop-1", "laptop-2"]
  }'
```

## Current Implementation Status

### ✅ Working Features
- **Health checks** - All endpoints functional
- **Multi-source product search** - Aggregates results from Amazon, Best Buy, and mock data
- **Product details** - Individual product retrieval from multiple sources
- **Similar products** - Vector-based similarity search with multi-source fallback
- **Product comparison** - Detailed comparison with summary statistics
- **Smart caching** - Intelligent caching for search results, products, and similar products
- **Error handling** - Proper HTTP status codes and error messages
- **Input validation** - Zod schema validation for all endpoints
- **Product deduplication** - Removes duplicate products across sources

### 🔄 Current Behavior
The API uses a **multi-layered search strategy**:

1. **Primary**: Aggregated search across Amazon API, Best Buy API, and mock data
2. **Secondary**: Vector search (Pinecone + OpenAI embeddings) as backup
3. **Fallback**: Mock data search if all other methods fail

**Current Source Status**:
- **Mock Data**: ✅ Always available for testing
- **Amazon API**: 🔧 Ready to activate with API keys
- **Best Buy API**: 🔧 Ready to activate with API keys  
- **Vector Search**: 🔧 Ready to activate with OpenAI + Pinecone keys

This ensures the API is always functional and provides rich product data from multiple sources.

### 🔧 Full API Integration Setup (Optional)
To enable all external APIs, set these environment variables in `apps/api/.env`:

```env
# OpenAI & Pinecone (for vector search)
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key

# Amazon Product Advertising API
AMAZON_ACCESS_KEY=your_amazon_access_key
AMAZON_SECRET_KEY=your_amazon_secret_key
AMAZON_PARTNER_TAG=your_amazon_partner_tag

# Best Buy API
BESTBUY_API_KEY=your_bestbuy_api_key

# Web Scraping (Jina.ai)
JINA_API_KEY=your_jina_api_key
```

**Without these keys**: The API automatically uses mock data that simulates real product responses.
**With these keys**: The API fetches live product data from multiple sources for comprehensive results.

## Expected Response Format

All successful responses follow this structure:
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "timestamp": "2025-07-08T..."
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-07-08T..."
}
```

## Testing Different Scenarios

### Search Queries to Try
- `"gaming laptop"` - Electronics category
- `"wireless headphones"` - Audio devices
- `"smartphone"` - Mobile devices
- `"kitchen appliance"` - Home goods
- `"running shoes"` - Sports/fitness

### Error Testing
- Invalid product ID: `curl http://localhost:3001/api/v1/products/invalid-id`
- Invalid search: `curl -X POST http://localhost:3001/api/v1/search -H "Content-Type: application/json" -d '{"invalid": "request"}'`
- Invalid comparison: `curl -X POST http://localhost:3001/api/v1/products/compare -H "Content-Type: application/json" -d '{"productIds": ["single-id"]}'`

All error scenarios should return appropriate HTTP status codes (400, 404, 500) with descriptive error messages.