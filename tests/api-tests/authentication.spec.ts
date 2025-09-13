import { test, expect } from '@playwright/test';
import { 
  generateUser, 
  createUser, 
  login, 
  logout, 
  getCurrentUser, 
  getTransactionsWithAuth, 
  getAdminUsers, 
  getAdminTransactions,
  assertAuthSuccess, 
  assertAuthError, 
  assertUserData,
  assertSuccessResponse,
  assertErrorResponse,
  URLS 
} from '../../utils.js';

test.describe('Authentication & Authorization API', () => {
  let testUser: any;
  let testToken: string;

  test.beforeAll(async ({ request }) => {
    const userResult = await createUser(request, generateUser());
    testUser = userResult.data;
  });

  test.describe('Login/Logout', () => {
    test('should login with valid credentials', async ({ request }) => {
      const result = await login(request, testUser.email);
      
      assertAuthSuccess(result);
      expect(result.data.token).toBeDefined();
      expect(result.data.user.id).toBe(testUser.id);
      expect(result.data.user.email).toBe(testUser.email);
      
      testToken = result.data.token;
    });

    test('should return error for invalid email', async ({ request }) => {
      const result = await login(request, 'nonexistent@example.com');
      
      expect(result.success).toBe(false);
      assertAuthError(result, 'Invalid credentials');
    });

    test('should return error for invalid password', async ({ request }) => {
      const result = await login(request, testUser.email, 'wrongpassword');
      
      expect(result.success).toBe(false);
      assertAuthError(result, 'Invalid credentials');
    });

    test('should return error for missing credentials', async ({ request }) => {
      const response = await request.post(`${URLS.API_BASE}/auth/login`, {
        data: {}
      });
      const result = await response.json();
      
      expect(response.status()).toBe(400);
      assertAuthError(result, 'Email and password are required');
    });

    test('should logout successfully', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const result = await logout(request, token);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    test('should return error for logout without token', async ({ request }) => {
      const response = await request.post(`${URLS.API_BASE}/auth/logout`);
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Access token required');
    });
  });

  test.describe('Token Validation', () => {
    test('should get current user with valid token', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const result = await getCurrentUser(request, token);
      
      assertSuccessResponse(result);
      assertUserData(result.data, {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        accountType: testUser.accountType
      });
    });

    test('should return error for invalid token', async ({ request }) => {
      const response = await request.get(`${URLS.API_BASE}/auth/me`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Invalid or expired token');
    });

    test('should return error for missing token', async ({ request }) => {
      const response = await request.get(`${URLS.API_BASE}/auth/me`);
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Access token required');
    });

    test('should return error for malformed authorization header', async ({ request }) => {
      const response = await request.get(`${URLS.API_BASE}/auth/me`, {
        headers: { 'Authorization': 'InvalidFormat token123' }
      });
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Invalid or expired token');
    });
  });

  test.describe('Protected Routes', () => {
    test('should access own transactions with valid token', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const transactionResult = await request.post(`${URLS.API_BASE}/transactions`, {
        data: {
          userId: testUser.id,
          amount: 100,
          type: 'deposit'
        }
      });
      
      const result = await getTransactionsWithAuth(request, testUser.id, token);
      
      assertSuccessResponse(result);
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('should deny access to other user transactions', async ({ request }) => {
      const otherUserResult = await createUser(request, generateUser());
      const otherUserId = otherUserResult.data.id;
      
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const result = await getTransactionsWithAuth(request, otherUserId, token);
      
      expect(result.success).toBe(false);
      assertErrorResponse(result, 'Access denied: Can only view your own transactions');
    });

    test('should deny access to transactions without token', async ({ request }) => {
      const response = await request.get(`${URLS.API_BASE}/transactions/${testUser.id}`);
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Access token required');
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should allow premium user to access admin endpoints', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const usersResult = await getAdminUsers(request, token);
      const transactionsResult = await getAdminTransactions(request, token);
      
      assertSuccessResponse(usersResult);
      assertSuccessResponse(transactionsResult);
      expect(usersResult.data.length).toBeGreaterThan(0);
      expect(transactionsResult.data.length).toBeGreaterThanOrEqual(0);
    });

    test('should deny basic user access to admin endpoints', async ({ request }) => {
      const basicUserData = {
        name: 'Basic User',
        email: `basic${Date.now()}@example.com`,
        accountType: 'basic'
      };
      const basicUserResult = await createUser(request, basicUserData);
      const basicUser = basicUserResult.data;
      
      const loginResult = await login(request, basicUser.email);
      const token = loginResult.data.token;
      
      const usersResponse = await request.get(`${URLS.API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersResult = await usersResponse.json();
      
      expect(usersResponse.status()).toBe(403);
      assertErrorResponse(usersResult, 'Insufficient permissions');
    });

    test('should deny access to admin endpoints without token', async ({ request }) => {
      const response = await request.get(`${URLS.API_BASE}/admin/users`);
      const result = await response.json();
      
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Access token required');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across multiple requests', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      
      const user1 = await getCurrentUser(request, token);
      const user2 = await getCurrentUser(request, token);
      
      assertSuccessResponse(user1);
      assertSuccessResponse(user2);
      expect(user1.data.id).toBe(user2.data.id);
    });

    test('should invalidate session after logout', async ({ request }) => {
      const loginResult = await login(request, testUser.email);
      const token = loginResult.data.token;
      await logout(request, token);
      const response = await request.get(`${URLS.API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      expect(response.status()).toBe(401);
      assertErrorResponse(result, 'Invalid or expired token');
    });
  });
});
