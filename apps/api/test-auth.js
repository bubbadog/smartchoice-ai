/**
 * Test script for authentication system
 * Run with: node test-auth.js
 */

const API_BASE = 'http://localhost:3000/api/v1';

// Test user data
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'SecurePassword123!',
  name: 'Test User'
};

let accessToken = '';
let refreshToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓ ${name}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ ${name}${colors.reset}`);
    console.error(`  ${error.message}`);
    if (error.response) {
      console.error(`  Response: ${JSON.stringify(error.response)}`);
    }
  }
}

async function makeRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    error.response = data;
    throw error;
  }

  return data;
}

async function runTests() {
  console.log(`\n${colors.blue}Testing Authentication System${colors.reset}\n`);

  // Test 1: Register
  await test('Register new user', async () => {
    const response = await makeRequest('POST', '/auth/register', testUser);
    if (!response.user || !response.accessToken || !response.refreshToken) {
      throw new Error('Missing required fields in response');
    }
    accessToken = response.accessToken;
    refreshToken = response.refreshToken;
    console.log(`  Created user: ${response.user.email}`);
  });

  // Test 2: Register duplicate user (should fail)
  await test('Prevent duplicate registration', async () => {
    try {
      await makeRequest('POST', '/auth/register', testUser);
      throw new Error('Should have failed with duplicate user');
    } catch (error) {
      if (!error.message.includes('409')) {
        throw error;
      }
    }
  });

  // Test 3: Login
  await test('Login with credentials', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    if (!response.accessToken) {
      throw new Error('No access token in response');
    }
    accessToken = response.accessToken;
    refreshToken = response.refreshToken;
  });

  // Test 4: Access protected route
  await test('Access protected profile route', async () => {
    const response = await makeRequest('GET', '/auth/profile', null, {
      'Authorization': `Bearer ${accessToken}`
    });
    if (response.email !== testUser.email) {
      throw new Error('Profile email mismatch');
    }
    console.log(`  Profile: ${response.email} (${response.role})`);
  });

  // Test 5: Access protected route without token (should fail)
  await test('Block access without token', async () => {
    try {
      await makeRequest('GET', '/auth/profile');
      throw new Error('Should have failed without token');
    } catch (error) {
      if (!error.message.includes('401')) {
        throw error;
      }
    }
  });

  // Test 6: User preferences
  await test('Get user preferences', async () => {
    const response = await makeRequest('GET', '/users/preferences', null, {
      'Authorization': `Bearer ${accessToken}`
    });
    console.log(`  Default deal threshold: ${response.dealThreshold}%`);
  });

  // Test 7: Update preferences
  await test('Update user preferences', async () => {
    const newPrefs = {
      categories: ['electronics', 'computers'],
      dealThreshold: 85
    };
    await makeRequest('PUT', '/users/preferences', newPrefs, {
      'Authorization': `Bearer ${accessToken}`
    });
  });

  // Test 8: Refresh token
  await test('Refresh access token', async () => {
    const response = await makeRequest('POST', '/auth/refresh', {
      refreshToken: refreshToken
    });
    if (!response.accessToken) {
      throw new Error('No new access token');
    }
    console.log(`  New token received`);
    accessToken = response.accessToken;
    refreshToken = response.refreshToken;
  });

  // Test 9: Logout
  await test('Logout user', async () => {
    await makeRequest('POST', '/auth/logout', {
      refreshToken: refreshToken
    }, {
      'Authorization': `Bearer ${accessToken}`
    });
  });

  // Test 10: Use revoked refresh token (should fail)
  await test('Reject revoked refresh token', async () => {
    try {
      await makeRequest('POST', '/auth/refresh', {
        refreshToken: refreshToken
      });
      throw new Error('Should have failed with revoked token');
    } catch (error) {
      if (!error.message.includes('401')) {
        throw error;
      }
    }
  });

  console.log(`\n${colors.green}Authentication tests completed!${colors.reset}\n`);
}

// Check if server is running
fetch(`${API_BASE}/health`)
  .then(() => runTests())
  .catch(() => {
    console.error(`${colors.red}Error: API server is not running on ${API_BASE}${colors.reset}`);
    console.log('Start the server with: pnpm dev');
    process.exit(1);
  });