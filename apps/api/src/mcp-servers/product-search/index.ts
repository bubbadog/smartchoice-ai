#!/usr/bin/env node

import { ProductSearchMCPServer } from './ProductSearchMCPServer'

async function main() {
  const server = new ProductSearchMCPServer()
  await server.start()
}

main().catch(console.error)