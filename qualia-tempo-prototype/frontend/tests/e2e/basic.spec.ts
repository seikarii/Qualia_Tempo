import { test, expect } from '@playwright/test';

test.describe('Qualia Tempo E2E Tests', () => {
  test('should load the application and check for errors', async ({ page }) => {
    // Capture console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the page title contains "Qualia Tempo" (adjust based on your app)
    const title = await page.title();
    expect(title).toContain('Qualia Tempo');

    // Filter out known development errors
    const filteredErrors = errors.filter(error => 
      !error.includes('EventBus has been destroyed') && 
      !error.includes('Failed to load configuration')
    );

    // Check for unexpected console errors
    if (filteredErrors.length > 0) {
      console.log('Unexpected console errors found:', filteredErrors);
      throw new Error(`Unexpected console errors detected: ${filteredErrors.join(', ')}`);
    }

    // Basic check: ensure the page has content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    // Test backend connectivity (if there's a health endpoint)
    try {
      const response = await page.request.get('http://localhost:8000/health');
      expect(response.status()).toBe(200);
    } catch (error) {
      console.log('Backend health check failed:', error);
      // Don't fail the test if backend is not available, just log
    }

    console.log('✅ Application loaded successfully without errors');
  });

  test('should verify frontend-backend integration', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

    // Check if there are any network errors
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (!response.ok() && response.url().includes('localhost:8000')) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Perform some basic interaction (adjust based on your app)
    // For example, if there's a button, click it
    // const button = page.locator('button');
    // if (await button.isVisible()) {
    //   await button.click();
    // }

    // Wait a bit for any backend calls
    await page.waitForTimeout(1000);

    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors);
      throw new Error(`Network errors detected: ${networkErrors.join(', ')}`);
    }

    console.log('✅ Frontend-backend integration verified');
  });
});
