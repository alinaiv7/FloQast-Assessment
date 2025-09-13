import { test, expect } from '@playwright/test';
import { generateTransaction, createUser, createTransaction, updateTransaction, deleteTransaction, assertSuccessResponse, assertErrorResponse, assertTransactionData, validateServerEndpoints, login, getTransactionsWithAuth, URLS } from '../../utils.js';

test.describe('Transactions API', () => {
  test.beforeAll(async ({ request }) => {
    await validateServerEndpoints(request);
  });
  let testUserId: string;
  let testToken: string;

  test.beforeEach(async ({ request }) => {
    const userResult = await createUser(request, undefined);
    testUserId = userResult.data.id;
    const loginResult = await login(request, userResult.data.email);
    testToken = loginResult.data.token;
  });

  test('should create a deposit transaction', async ({ request }) => {
    const transactionData = generateTransaction({
      userId: parseInt(testUserId),
      type: 'deposit',
      amount: 100.50
    });
    const result = await createTransaction(request, transactionData);
    assertSuccessResponse(result);
    assertTransactionData(result.data, {
      amount: 100.50,
      type: 'deposit',
      userId: parseInt(testUserId)
    });
  });

  test('should create a transfer transaction', async ({ request }) => {
    const transactionData = generateTransaction({
      userId: parseInt(testUserId),
      type: 'transfer',
      amount: 50.00,
      recipientId: 999
    });
    
    const result = await createTransaction(request, transactionData);
    
    assertSuccessResponse(result);
    assertTransactionData(result.data, {
      type: 'transfer',
      recipientId: 999,
      userId: parseInt(testUserId),
      amount: 50.00
    });
  });

  test('should get user transactions', async ({ request }) => {
    await createTransaction(request, generateTransaction({ 
      userId: parseInt(testUserId), 
      amount: 100, 
      type: 'deposit' 
    }));
    await createTransaction(request, generateTransaction({ 
      userId: parseInt(testUserId), 
      amount: 50, 
      type: 'withdrawal' 
    }));
    
    const data = await getTransactionsWithAuth(request, parseInt(testUserId), testToken);
    assertSuccessResponse(data);
    expect(data.data.length).toBe(2);
  });

  test('should return error for negative amount', async ({ request }) => {
    const transactionData = generateTransaction({
      userId: parseInt(testUserId),
      amount: -100,
      type: 'deposit'
    });
    
    const response = await request.post(`${URLS.API_BASE}/transactions`, {
      data: transactionData
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Valid amount is required');
  });

  test('should return error for transfer without recipient', async ({ request }) => {
    const transactionData = {
      userId: parseInt(testUserId),
      amount: 100,
      type: 'transfer'
    };
    
    const response = await request.post(`${URLS.API_BASE}/transactions`, {
      data: transactionData
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Recipient ID is required for transfers');
  });

  test('should return error when accessing transactions without authentication', async ({ request }) => {
    const response = await request.get(`${URLS.API_BASE}/transactions/${parseInt(testUserId)}`);
    const data = await response.json();
    
    expect(response.status()).toBe(401);
    assertErrorResponse(data, 'Access token required');
  });

  test('should update a transaction', async ({ request }) => {
    const createResult = await createTransaction(request, generateTransaction({ userId: parseInt(testUserId) }));
    assertSuccessResponse(createResult);
    const transactionId = createResult.data.id;
    
    const updateData = {
      userId: parseInt(testUserId),
      amount: 200.75,
      type: 'withdrawal',
      recipientId: undefined
    };
    
    const updateResult = await updateTransaction(request, transactionId, updateData);
    assertSuccessResponse(updateResult);
    assertTransactionData(updateResult.data, {
      amount: 200.75,
      type: 'withdrawal',
      userId: parseInt(testUserId)
    });
    expect(updateResult.data.updatedAt).toBeDefined();
  });

  test('should return error when updating non-existent transaction', async ({ request }) => {
    const updateData = {
      userId: parseInt(testUserId),
      amount: 200.75,
      type: 'withdrawal'
    };
    
    const response = await request.put(`${URLS.API_BASE}/transactions/99999`, {
      data: updateData
    });
    
    const data = await response.json();
    expect(response.status()).toBe(404);
    assertErrorResponse(data, 'Transaction not found');
  });

  test('should return error when updating transaction with invalid data', async ({ request }) => {
    const createResult = await createTransaction(request, generateTransaction({ userId: parseInt(testUserId) }));
    const transactionId = createResult.data.id;
    const response = await request.put(`${URLS.API_BASE}/transactions/${transactionId}`, {
      data: {
        userId: parseInt(testUserId),
        amount: -100,
        type: 'deposit'
      }
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Valid amount is required');
  });

  test('should return error when updating transfer without recipient', async ({ request }) => {
    const createResult = await createTransaction(request, generateTransaction({ userId: parseInt(testUserId) }));
    const transactionId = createResult.data.id;
    
    const response = await request.put(`${URLS.API_BASE}/transactions/${transactionId}`, {
      data: {
        userId: parseInt(testUserId),
        amount: 100,
        type: 'transfer'
      }
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Recipient ID is required for transfers');
  });

  test('should delete a transaction', async ({ request }) => {
    const createResult = await createTransaction(request, generateTransaction({ userId: parseInt(testUserId) }));
    assertSuccessResponse(createResult);
    const transactionId = createResult.data.id;
    const deleteResult = await deleteTransaction(request, transactionId);
    assertSuccessResponse(deleteResult);
    expect(deleteResult.data.id).toBe(transactionId);
    
    const data = await getTransactionsWithAuth(request, parseInt(testUserId), testToken);
    assertSuccessResponse(data);
    expect(data.data.length).toBe(0);
  });

  test('should return error when deleting non-existent transaction', async ({ request }) => {
    const response = await request.delete(`${URLS.API_BASE}/transactions/99999`);
    const data = await response.json();
    expect(response.status()).toBe(404);
    assertErrorResponse(data, 'Transaction not found');
  });
});