#!/usr/bin/env node

/**
 * API Testing Script for SmartChoice AI
 * 
 * This script tests all the implemented API endpoints to ensure they're working correctly.
 * 
 * Usage:
 *   1. Make sure the API server is running: cd apps/api && npm run dev
 *   2. Run this script: node test-api.js
 */

const API_BASE_URL = 'http://localhost:3001'

async function testAPI() {
  console.log('🧪 Testing SmartChoice AI API Endpoints\n')
  console.log(`API Base URL: ${API_BASE_URL}\n`)

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }

  // Helper function to make HTTP requests
  async function makeRequest(method, endpoint, body = null) {
    const url = `${API_BASE_URL}${endpoint}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)
      const data = await response.json()
      return { status: response.status, data, success: response.ok }
    } catch (error) {
      return { status: 0, error: error.message, success: false }
    }
  }

  // Helper function to run a test
  async function runTest(name, testFn) {
    try {
      console.log(`🔍 Testing: ${name}`)
      const result = await testFn()
      if (result.success) {
        console.log(`  ✅ PASSED: ${result.message}`)
        results.passed++
      } else {
        console.log(`  ❌ FAILED: ${result.message}`)
        results.failed++
      }
      results.tests.push({ name, ...result })
      console.log('')
    } catch (error) {
      console.log(`  💥 ERROR: ${error.message}`)
      results.failed++
      results.tests.push({ name, success: false, message: error.message })
      console.log('')
    }
  }

  // Test 1: Health Check
  await runTest('Health Check', async () => {
    const response = await makeRequest('GET', '/health')
    if (response.success && response.data.status === 'ok') {
      return { success: true, message: 'Health check endpoint working' }
    }
    return { success: false, message: `Health check failed: ${response.data?.message || 'Unknown error'}` }
  })

  // Test 2: Search - POST endpoint
  await runTest('Product Search (POST)', async () => {
    const searchRequest = {
      query: 'gaming laptop',
      pagination: { page: 1, limit: 5 },
      sortBy: 'relevance'
    }
    
    const response = await makeRequest('POST', '/api/v1/search', searchRequest)
    
    if (response.success && response.data.success && response.data.data.items) {
      return { 
        success: true, 
        message: `Found ${response.data.data.items.length} products, fallback to mock data is working` 
      }
    }
    return { 
      success: false, 
      message: `Search failed: ${response.data?.message || 'No results returned'}` 
    }
  })

  // Test 3: Search - GET endpoint
  await runTest('Product Search (GET)', async () => {
    const response = await makeRequest('GET', '/api/v1/search?q=headphones&limit=3')
    
    if (response.success && response.data.success && response.data.data.items) {
      return { 
        success: true, 
        message: `Found ${response.data.data.items.length} products via GET search` 
      }
    }
    return { 
      success: false, 
      message: `GET search failed: ${response.data?.message || 'No results returned'}` 
    }
  })

  // Get a product ID for subsequent tests
  let testProductId = null
  const searchResponse = await makeRequest('POST', '/api/v1/search', { 
    query: 'laptop', 
    pagination: { page: 1, limit: 1 } 
  })
  
  if (searchResponse.success && searchResponse.data.data.items.length > 0) {
    testProductId = searchResponse.data.data.items[0].id
  }

  // Test 4: Get Product Details
  await runTest('Get Product Details', async () => {
    if (!testProductId) {
      return { success: false, message: 'No test product ID available' }
    }
    
    const response = await makeRequest('GET', `/api/v1/products/${testProductId}`)
    
    if (response.success && response.data.success && response.data.data) {
      return { 
        success: true, 
        message: `Product details retrieved for ID: ${testProductId}` 
      }
    }
    return { 
      success: false, 
      message: `Failed to get product details: ${response.data?.message || 'Unknown error'}` 
    }
  })

  // Test 5: Get Similar Products
  await runTest('Get Similar Products', async () => {
    if (!testProductId) {
      return { success: false, message: 'No test product ID available' }
    }
    
    const response = await makeRequest('GET', `/api/v1/products/${testProductId}/similar?limit=3`)
    
    if (response.success && response.data.success) {
      const count = response.data.data.similarProducts?.length || 0
      return { 
        success: true, 
        message: `Found ${count} similar products` 
      }
    }
    return { 
      success: false, 
      message: `Failed to get similar products: ${response.data?.message || 'Unknown error'}` 
    }
  })

  // Test 6: Compare Products
  await runTest('Compare Products', async () => {
    // Get multiple product IDs
    const searchResponse = await makeRequest('POST', '/api/v1/search', { 
      query: 'smartphone', 
      pagination: { page: 1, limit: 3 } 
    })
    
    if (!searchResponse.success || searchResponse.data.data.items.length < 2) {
      return { success: false, message: 'Not enough products for comparison test' }
    }
    
    const productIds = searchResponse.data.data.items.slice(0, 2).map(item => item.id)
    
    const response = await makeRequest('POST', '/api/v1/products/compare', { productIds })
    
    if (response.success && response.data.success && response.data.data.products) {
      const count = response.data.data.products.length
      return { 
        success: true, 
        message: `Successfully compared ${count} products` 
      }
    }
    return { 
      success: false, 
      message: `Failed to compare products: ${response.data?.message || 'Unknown error'}` 
    }
  })

  // Test 7: Error Handling - Invalid Product ID
  await runTest('Error Handling (Invalid Product ID)', async () => {
    const response = await makeRequest('GET', '/api/v1/products/invalid-id-123')
    
    if (!response.success && response.status === 404) {
      return { 
        success: true, 
        message: 'Correctly returns 404 for invalid product ID' 
      }
    }
    return { 
      success: false, 
      message: `Expected 404 error, got status: ${response.status}` 
    }
  })

  // Test 8: Error Handling - Invalid Search Request
  await runTest('Error Handling (Invalid Search)', async () => {
    const response = await makeRequest('POST', '/api/v1/search', { invalid: 'request' })
    
    if (!response.success && response.status === 400) {
      return { 
        success: true, 
        message: 'Correctly returns 400 for invalid search request' 
      }
    }
    return { 
      success: false, 
      message: `Expected 400 error, got status: ${response.status}` 
    }
  })

  // Test 9: Error Handling - Invalid Compare Request
  await runTest('Error Handling (Invalid Compare)', async () => {
    const response = await makeRequest('POST', '/api/v1/products/compare', { productIds: ['single-id'] })
    
    if (!response.success && response.status === 400) {
      return { 
        success: true, 
        message: 'Correctly returns 400 for invalid compare request (need 2+ products)' 
      }
    }
    return { 
      success: false, 
      message: `Expected 400 error, got status: ${response.status}` 
    }
  })

  // Summary
  console.log('📊 Test Results Summary')
  console.log('=' .repeat(50))
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.tests.filter(t => !t.success).forEach(test => {
      console.log(`  - ${test.name}: ${test.message}`)
    })
  }

  console.log('\n🎯 API Testing Complete!')
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! The API is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Check the API server and try again.')
  }

  return results.failed === 0
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ for fetch support.')
  console.log('Install a fetch polyfill or upgrade Node.js:')
  console.log('  npm install node-fetch')
  process.exit(1)
}

// Run the tests
testAPI().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Test script failed:', error.message)
  process.exit(1)
})