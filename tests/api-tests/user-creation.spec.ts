import { test, expect } from '@playwright/test';
import { generateUser, createUser, updateUser, deleteUser, assertSuccessResponse, assertErrorResponse, assertUserData, validateServerEndpoints, URLS } from '../../utils.js';

test.describe('Users API', () => {
  test.beforeAll(async ({ request }) => {
    await validateServerEndpoints(request);
  });
  test('should create a user', async ({ request }) => { //create
    const userData = generateUser();
    const result = await createUser(request, userData);
    
    assertSuccessResponse(result);
    assertUserData(result.data, userData);
  });

  test('should get user by id', async ({ request }) => { //read
    const result = await createUser(request, undefined);
    assertSuccessResponse(result);
    
    const getResponse = await request.get(`${URLS.API_BASE}/users/${result.data.id}`);
    const userData = await getResponse.json();
    
    expect(getResponse.status()).toBe(200);
    assertSuccessResponse(userData);
    assertUserData(userData.data, { name: result.data.name });
  });

  test('should return error for invalid email', async ({ request }) => {
    const userData = generateUser({ email: 'invalid-email' });
    
    const response = await request.post(`${URLS.API_BASE}/users`, {
      data: userData
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Valid email format is required');
  });

  test('should return error for missing fields', async ({ request }) => {
    const response = await request.post(`${URLS.API_BASE}/users`, {
      data: {
        name: 'Test User'
      }
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Email is required, Valid account type is required');
  });

  test('should update a user', async ({ request }) => { //update
    const createResult = await createUser(request, undefined);
    assertSuccessResponse(createResult);
    const userId = createResult.data.id;
    
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
      accountType: 'basic'
    };
    
    const updateResult = await updateUser(request, userId, updateData);
    assertSuccessResponse(updateResult);
    assertUserData(updateResult.data, updateData);
    expect(updateResult.data.updatedAt).toBeDefined();
  });

  test('should return error when updating non-existent user', async ({ request }) => {
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
      accountType: 'basic'
    };
    
    const response = await request.put(`${URLS.API_BASE}/users/99999`, {
      data: updateData
    });
    
    const data = await response.json();
    expect(response.status()).toBe(404);
    assertErrorResponse(data, 'User not found');
  });

  test('should return error when updating user with invalid data', async ({ request }) => {
    const createResult = await createUser(request, undefined);
    const userId = createResult.data.id;
    
    const response = await request.put(`${URLS.API_BASE}/users/${userId}`, {
      data: {
        name: 'Updated Name',
        email: 'invalid-email',
        accountType: 'basic'
      }
    });
    
    const data = await response.json();
    expect(response.status()).toBe(400);
    assertErrorResponse(data, 'Valid email format is required');
  });

  test('should delete a user', async ({ request }) => { //delete
    const createResult = await createUser(request, undefined);
    assertSuccessResponse(createResult);
    const userId = createResult.data.id;
    
    const deleteResult = await deleteUser(request, userId);
    assertSuccessResponse(deleteResult);
    expect(deleteResult.data.id).toBe(userId);
    
    const getResponse = await request.get(`${URLS.API_BASE}/users/${userId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should return error when deleting non-existent user', async ({ request }) => {
    const response = await request.delete(`${URLS.API_BASE}/users/99999`);
    const data = await response.json();
    expect(response.status()).toBe(404);
    assertErrorResponse(data, 'User not found');
  });
});