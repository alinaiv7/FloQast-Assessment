import { test, expect } from '@playwright/test';
import { generateUser, fillUserForm, waitForResult, assertSuccessResponse, assertUserData } from '../../utils.js';
import { SELECTORS } from '../../selectors.js';

test.describe('UI tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-ui.html');
  });

  test('should create a user successfully', async ({ page }) => {
    const userData = await fillUserForm(page, undefined);
    await page.click(SELECTORS.USER_FORM.CREATE_BUTTON);
    
    const result = await waitForResult(page, SELECTORS.USER_FORM.RESULT_DIV);
    assertSuccessResponse(result);
    assertUserData(result.data, { name: userData.name });
  });

  test('should show error for invalid email', async ({ page }) => {
    const userData = generateUser({ email: 'invalid-email' });
    await fillUserForm(page, userData);
    await page.click(SELECTORS.USER_FORM.CREATE_BUTTON);
    
    await page.waitForSelector(SELECTORS.USER_FORM.RESULT_DIV);
    const result = await page.textContent(SELECTORS.USER_FORM.RESULT_DIV);
    expect(result).toContain('"success": false');
    expect(result).toContain('Valid email format is required');
  });

  test('should create a transaction', async ({ page }) => {
    const userData = await fillUserForm(page, undefined);
    await page.click(SELECTORS.USER_FORM.CREATE_BUTTON);
    
    const userResult = await waitForResult(page, SELECTORS.USER_FORM.RESULT_DIV);
    assertSuccessResponse(userResult);
    const userId = userResult.data.id;
    
    await page.fill(SELECTORS.TRANSACTION_FORM.USER_ID_INPUT, userId.toString());
    await page.fill(SELECTORS.TRANSACTION_FORM.AMOUNT_INPUT, '100.50');
    await page.selectOption(SELECTORS.TRANSACTION_FORM.TYPE_SELECT, SELECTORS.TRANSACTION_TYPES.DEPOSIT);
    await page.click(SELECTORS.TRANSACTION_FORM.CREATE_BUTTON);
    
    await page.waitForSelector(SELECTORS.TRANSACTION_FORM.RESULT_DIV);
    const result = await page.textContent(SELECTORS.TRANSACTION_FORM.RESULT_DIV);
    expect(result).toContain('"success": true');
    expect(result).toContain('100.5');
  });

  test('should get user details', async ({ page }) => {
    const userData = await fillUserForm(page, undefined);
    await page.click(SELECTORS.USER_FORM.CREATE_BUTTON);
    
    const userResult = await waitForResult(page, SELECTORS.USER_FORM.RESULT_DIV);
    assertSuccessResponse(userResult);
    const userId = userResult.data.id;
    
    await page.fill(SELECTORS.USER_DETAILS.USER_ID_INPUT, userId.toString());
    await page.click(SELECTORS.USER_DETAILS.GET_BUTTON);
    
    await page.waitForSelector(SELECTORS.USER_DETAILS.RESULT_DIV);
    const result = await page.textContent(SELECTORS.USER_DETAILS.RESULT_DIV);
    expect(result).toContain('"success": true');
    expect(result).toContain(userData.name);
  });

  test('should get user transactions', async ({ page }) => {
    const userData = await fillUserForm(page, undefined);
    await page.click(SELECTORS.USER_FORM.CREATE_BUTTON);
    
    const userResult = await waitForResult(page, SELECTORS.USER_FORM.RESULT_DIV);
    assertSuccessResponse(userResult);
    const userId = userResult.data.id;
    
    await page.fill(SELECTORS.TRANSACTION_FORM.USER_ID_INPUT, userId.toString());
    await page.fill(SELECTORS.TRANSACTION_FORM.AMOUNT_INPUT, '200');
    await page.selectOption(SELECTORS.TRANSACTION_FORM.TYPE_SELECT, SELECTORS.TRANSACTION_TYPES.DEPOSIT);
    await page.click(SELECTORS.TRANSACTION_FORM.CREATE_BUTTON);
    
    await page.waitForSelector(SELECTORS.TRANSACTION_FORM.RESULT_DIV);
    
    await page.fill(SELECTORS.GET_TRANSACTIONS.USER_ID_INPUT, userId.toString());
    await page.click(SELECTORS.GET_TRANSACTIONS.GET_BUTTON);
    
    await page.waitForFunction(() => {
      const element = document.querySelector('#getTxnResult');
      return element && element.textContent && element.textContent.trim().length > 0;
    });
    
    const result = await page.textContent(SELECTORS.GET_TRANSACTIONS.RESULT_DIV);
    expect(result).toContain('"success": true');
    expect(result).toContain('200');
  });
});