import { expect } from '@playwright/test';
import { CONFIG } from './playwright.config.ts';

export const URLS = {
  UI_BASE: 'http://localhost:3000',
  API_BASE: 'http://localhost:3001/api'
};

export async function validateServerEndpoints(request) {
  const endpoints = [
    { method: 'GET', url: `${URLS.API_BASE}/health` },
    { method: 'POST', url: `${URLS.API_BASE}/users` },
    { method: 'POST', url: `${URLS.API_BASE}/transactions` },
    { method: 'PUT', url: `${URLS.API_BASE}/users/1` },
    { method: 'DELETE', url: `${URLS.API_BASE}/users/1` },
    { method: 'PUT', url: `${URLS.API_BASE}/transactions/1` },
    { method: 'DELETE', url: `${URLS.API_BASE}/transactions/1` }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await request[endpoint.method.toLowerCase()](endpoint.url, {
        data: endpoint.method === 'POST' || endpoint.method === 'PUT' ? {} : undefined
      });
      
      const contentType = response.headers()['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Endpoint ${endpoint.method} ${endpoint.url} returned HTML instead of JSON`);
      }
    } catch (error) {
      if (error.message.includes('HTML instead of JSON')) {
        throw error;
      }
    }
  }
}

export function generateUser(overrides = {}) {
  return {
    name: 'John Doe',
    email: `john${Date.now()}@example.com`,
    accountType: 'premium',
    ...overrides
  };
}

export function generateTransaction(overrides = {}) {
  return {
    userId: '123',
    amount: 100.50,
    type: 'transfer',
    recipientId: '456',
    ...overrides
  };
}

export async function createUser(request, userData) {
  const user = userData || generateUser();
  const response = await request.post(`${URLS.API_BASE}/users`, {
    data: user
  });
  
  const contentType = response.headers()['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Server returned HTML instead of JSON`);
  }
  
  const result = await response.json();
  console.log(`[API] POST /users - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function createTransaction(request, transactionData) {
  const transaction = transactionData || generateTransaction();
  const response = await request.post(`${URLS.API_BASE}/transactions`, {
    data: transaction
  });
  const result = await response.json();
  console.log(`[API] POST /transactions - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function updateUser(request, userId, userData) {
  const response = await request.put(`${URLS.API_BASE}/users/${userId}`, {
    data: userData
  });
  const result = await response.json();
  console.log(`[API] PUT /users/${userId} - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function updateTransaction(request, transactionId, transactionData) {
  const response = await request.put(`${URLS.API_BASE}/transactions/${transactionId}`, {
    data: transactionData
  });
  const result = await response.json();
  console.log(`[API] PUT /transactions/${transactionId} - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function deleteUser(request, userId) {
  const response = await request.delete(`${URLS.API_BASE}/users/${userId}`);
  const result = await response.json();
  console.log(`[API] DELETE /users/${userId} - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function deleteTransaction(request, transactionId) {
  const response = await request.delete(`${URLS.API_BASE}/transactions/${transactionId}`);
  const result = await response.json();
  console.log(`[API] DELETE /transactions/${transactionId} - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function login(request, email, password = CONFIG.DEFAULT_USER_PASSWORD) {
  const response = await request.post(`${URLS.API_BASE}/auth/login`, {
    data: { email, password }
  });
  const result = await response.json();
  console.log(`[API] POST /auth/login - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function logout(request, token) {
  const response = await request.post(`${URLS.API_BASE}/auth/logout`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log(`[API] POST /auth/logout - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function getCurrentUser(request, token) {
  const response = await request.get(`${URLS.API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log(`[API] GET /auth/me - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function getTransactionsWithAuth(request, userId, token) {
  const response = await request.get(`${URLS.API_BASE}/transactions/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log(`[API] GET /transactions/${userId} - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function getAdminUsers(request, token) {
  const response = await request.get(`${URLS.API_BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log(`[API] GET /admin/users - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export async function getAdminTransactions(request, token) {
  const response = await request.get(`${URLS.API_BASE}/admin/transactions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  console.log(`[API] GET /admin/transactions - Status: ${response.status()}, Response:`, JSON.stringify(result, null, 2));
  return result;
}

export function assertAuthSuccess(response) {
  expect(response.success, 'Auth response should be successful').toBe(true);
  expect(response.data, 'Response should contain data').toBeDefined();
  expect(response.data.token, 'Response should contain token').toBeDefined();
  expect(response.data.user, 'Response should contain user data').toBeDefined();
}

export function assertAuthError(response, expectedError) {
  expect(response.success, 'Auth response should be an error').toBe(false);
  expect(response.error, 'Response should contain error message').toBeDefined();
  if (expectedError) {
    expect(response.error, `Error should contain: ${expectedError}`).toContain(expectedError);
  }
}

export async function fillUserForm(page, userData) {
  const { SELECTORS } = await import('./selectors.js');
  const user = userData || generateUser();
  await page.fill(SELECTORS.USER_FORM.NAME_INPUT, user.name);
  await page.fill(SELECTORS.USER_FORM.EMAIL_INPUT, user.email);
  await page.selectOption(SELECTORS.USER_FORM.TYPE_SELECT, user.accountType);
  return user;
}

export async function waitForResult(page, selector) {
  await page.waitForSelector(selector);
  const result = await page.textContent(selector);
  return JSON.parse(result);
}

export function assertSuccessResponse(response) {
  let message = 'Response should be successful'
  expect(response.success, message).toBe(true);
  expect(response.data, 'Response should contain data').toBeDefined();
}

export function assertErrorResponse(response, expectedError) {
  let message = 'Response should be an error'
  expect(response.success, message).toBe(false);
  expect(response.error, 'Response should contain error message').toBeDefined();
  if (expectedError) {
    expect(response.error, `Error should contain: ${expectedError}`).toContain(expectedError);
  }
}

export function assertUserData(user, expectedData = {}) {
  expect(user.id, 'User should have an ID').toBeDefined();
  expect(user.name, 'User should have a name').toBeDefined();
  expect(user.email, 'User should have an email').toBeDefined();
  expect(user.accountType, 'User should have an account type').toBeDefined();
  
  if (expectedData.name) expect(user.name).toBe(expectedData.name);
  if (expectedData.email) expect(user.email).toBe(expectedData.email);
  if (expectedData.accountType) expect(user.accountType).toBe(expectedData.accountType);
}

export function assertTransactionData(transaction, expectedData = {}) {
  expect(transaction.id, 'Transaction should have an ID').toBeDefined();
  expect(transaction.userId, 'Transaction should have a userId').toBeDefined();
  expect(transaction.amount, 'Transaction should have an amount').toBeDefined();
  expect(transaction.type, 'Transaction should have a type').toBeDefined();
  expect(transaction.timestamp, 'Transaction should have a timestamp').toBeDefined();
  
  if (expectedData.userId) expect(transaction.userId).toBe(expectedData.userId);
  if (expectedData.amount) expect(transaction.amount).toBe(expectedData.amount);
  if (expectedData.type) expect(transaction.type).toBe(expectedData.type);
  if (expectedData.recipientId !== undefined) expect(transaction.recipientId).toBe(expectedData.recipientId);
}
