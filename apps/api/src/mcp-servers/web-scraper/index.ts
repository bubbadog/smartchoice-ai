#!/usr/bin/env node

import { WebScraperMCPServer } from './WebScraperMCPServer'

async function main() {
  const server = new WebScraperMCPServer()
  await server.start()
}

main().catch(console.error)