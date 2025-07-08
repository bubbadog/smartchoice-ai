import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type TextContent,
  type ImageContent,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'

export interface MCPServerConfig {
  name: string
  version: string
  description: string
}

export abstract class MCPServer {
  protected server: Server
  protected config: MCPServerConfig
  
  constructor(config: MCPServerConfig) {
    this.config = config
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )
    
    this.setupHandlers()
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }))
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments || {})
    })
    
    // Setup custom handlers
    this.setupCustomHandlers()
  }
  
  protected abstract getTools(): Tool[]
  
  protected abstract handleToolCall(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{
    content: Array<TextContent | ImageContent>
  }>
  
  protected setupCustomHandlers(): void {
    // Override in subclasses to add custom handlers
  }
  
  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    
    console.error(`${this.config.name} MCP Server v${this.config.version} running`)
    console.error(this.config.description)
  }
  
  protected createTextContent(text: string): TextContent {
    return {
      type: 'text',
      text,
    }
  }
  
  protected createErrorContent(error: Error): TextContent {
    return {
      type: 'text',
      text: `Error: ${error.message}`,
    }
  }
  
  protected validateArgs(
    args: Record<string, unknown>,
    required: string[]
  ): void {
    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required argument: ${field}`)
      }
    }
  }
}