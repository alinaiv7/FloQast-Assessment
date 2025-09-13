import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
    DEFAULT_USER_PASSWORD: process.env.DEFAULT_USER_PASSWORD,
};

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html'],
        ['list'],
        ['json', { outputFile: 'test-results.json' }],
        ['junit', { outputFile: 'test-results.xml' }]
    ],
    timeout: 30000,
    expect: {
        timeout: 50000,
    },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'node server.js',
            url: 'http://localhost:3001/api/health',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        },
        {
            command: 'npx http-server . -p 3000 --silent',
            url: 'http://localhost:3000/test-ui.html',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        }
    ],
});