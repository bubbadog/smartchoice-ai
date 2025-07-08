# SmartChoice AI Setup Guide

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <your-repo>
cd smartchoice-ai
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your actual API keys:

```bash
# Server configuration
NODE_ENV=development
PORT=3000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3001

# Database - Supabase
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Authentication
JWT_SECRET=your-32-character-secret-key-here-change-this

# AI Services (REQUIRED)
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...

# Web Scraping (optional - Jina.ai works without but has limits)
JINA_API_KEY=your-jina-api-key-optional

# Redis cache (optional for development)
REDIS_URL=redis://localhost:6379
```

### 3. Set Up Required Services

#### Supabase (Database)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your URL and keys from Settings > API
4. Add to your `.env` file

#### OpenAI (Required for embeddings)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add to your `.env` file

#### Pinecone (Required for vector search)
1. Go to [pinecone.io](https://pinecone.io)
2. Create API key
3. Add to your `.env` file

#### Jina.ai (Optional - for enhanced web scraping)
1. Go to [jina.ai](https://jina.ai)
2. Get API key (free tier available)
3. Add to your `.env` file

### 4. Test the System

Test MCP servers:
```bash
cd apps/api
node test-mcp.js
```

You should see:
```
✅ Product Search MCP Server
✅ Web Scraper MCP Server
🎉 All MCP servers are working!
```

### 5. Start Development

Start the API server:
```bash
cd apps/api
pnpm dev
```

Start the web frontend:
```bash
cd apps/web
pnpm dev
```

### 6. Configure Claude Desktop (Optional)

Add to your Claude Desktop MCP configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "smartchoice-product-search": {
      "command": "pnpm",
      "args": ["run", "mcp:product-search"],
      "cwd": "/full/path/to/smartchoice-ai/apps/api",
      "env": {
        "NODE_ENV": "development"
      }
    },
    "smartchoice-web-scraper": {
      "command": "pnpm",
      "args": ["run", "mcp:web-scraper"],
      "cwd": "/full/path/to/smartchoice-ai/apps/api",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🧪 Testing the System

### Test Product Search
```bash
# Terminal 1: Start the MCP server
cd apps/api
pnpm mcp:product-search

# Terminal 2: Test with curl (if you implement HTTP endpoints)
curl -X POST http://localhost:3000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "laptop", "limit": 5}'
```

### Test Web Scraping
With Claude Desktop configured, you can ask:
> "Scrape this Amazon product page and index it for search: https://www.amazon.com/dp/B08N5WRWNW"

## 🔧 Troubleshooting

### Common Issues

#### "Missing API key" errors
- Check your `.env` file has all required keys
- Restart the server after adding keys

#### MCP server won't start
- Run `pnpm typecheck` to check for TypeScript errors
- Check the logs for specific error messages

#### Pinecone connection fails
- Verify your API key is correct
- Check if you have an active Pinecone project

#### Supabase connection fails
- Verify URL and keys are correct
- Check if your Supabase project is active

### Debug Commands

Check TypeScript:
```bash
cd apps/api
pnpm typecheck
```

Check linting:
```bash
cd apps/api
pnpm lint
```

Test individual services:
```bash
# Test just the embedding service
cd apps/api
pnpm mcp:product-search

# Test just the web scraper
cd apps/api
pnpm mcp:web-scraper
```

## 📊 System Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Web Frontend    │───▶│ Express API  │───▶│ MCP Servers     │
│ (Next.js)       │    │              │    │ - Product Search│
└─────────────────┘    └──────────────┘    │ - Web Scraper   │
                                           └─────────────────┘
                                                     │
                       ┌─────────────────────────────┼─────────────────┐
                       ▼                             ▼                 ▼
               ┌───────────────┐           ┌─────────────────┐ ┌─────────────────┐
               │ Vector Search │           │ Embedding       │ │ Web Scraping    │
               │ (Pinecone)    │           │ (OpenAI)        │ │ (Jina.ai)       │
               └───────────────┘           └─────────────────┘ └─────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │ Database      │
               │ (Supabase)    │
               └───────────────┘
```

## 🎯 Next Steps

1. **Add your API keys** to `apps/api/.env`
2. **Test the system** with `node test-mcp.js`
3. **Configure Claude Desktop** for interactive testing
4. **Start building agents** with the MCP servers
5. **Scale up** with production database and caching

## 🔒 Security Notes

- Never commit `.env` files to git
- Use different keys for development/production
- Rotate API keys regularly
- Use Supabase Row Level Security for multi-user scenarios

## 📚 Documentation

- [Web Scraping Architecture](./WEB_SCRAPING_ARCHITECTURE.md)
- [MCP Server Documentation](./apps/api/src/mcp-servers/README.md)
- [API Documentation](./apps/api/README.md)

---

**Need help?** Check the troubleshooting section or create an issue in the repository.