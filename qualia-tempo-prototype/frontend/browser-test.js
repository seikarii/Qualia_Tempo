import { chromium } from 'playwright';
import fs from 'fs';

async function comprehensiveTest() {
    console.log('🌐 Starting comprehensive browser test...');
    let browser;
    let page;

    const logs = [];
    const errors = [];

    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        page = await browser.newPage();

        page.on('console', (msg) => {
            const text = msg.text();
            const type = msg.type();
            const entry = `[${type.toUpperCase()}] ${text}`;
            logs.push({ timestamp: new Date().toISOString(), type, text, entry });
            if (type === 'error') errors.push(entry);
            console.log(entry);
        });

        page.on('pageerror', (error) => {
            const errorText = `[PAGE ERROR] ${error.message}`;
            errors.push(errorText);
            logs.push({ timestamp: new Date().toISOString(), type: 'pageerror', text: error.message, entry: errorText, stack: error.stack });
            console.log(errorText);
        });

        console.log('📡 Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(15000);

        // --- Phase 1: Main Menu ---
        console.log('📸 Capturing main menu state (Screenshot + DOM)...');
        await page.screenshot({ path: 'debug-screenshot-main-menu.png', fullPage: true });
        const mainMenuContent = await page.content();
        fs.writeFileSync('debug-page-content-main-menu.html', mainMenuContent);
        fs.writeFileSync('browser-test-report-main-menu.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'main-menu',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Main menu state captured.');

        // --- Phase 2: Interaction ---
        console.log('🚀 Clicking "INITIATE NEURAL SYNC" button...');
        await page.getByText('INITIATE NEURAL SYNC').click();
        await page.waitForTimeout(2000);

        // --- Phase 3: Game View ---
        console.log('📸 Capturing game view state (Screenshot + DOM)...');
        await page.screenshot({ path: 'debug-screenshot-game-view.png', fullPage: true });
        const gameViewContent = await page.content();
        fs.writeFileSync('debug-page-content-game-view.html', gameViewContent);
        fs.writeFileSync('browser-test-report-game-view.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'game-view',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Game view state captured.');

    } catch (error) {
        console.error(`❌❌❌ BROWSER TEST FAILED: ${error.message}`);

        if (page && !page.isClosed()) {
            try {
                console.log('📸 Capturing FAILURE state (Screenshot + DOM)...');
                await page.screenshot({ path: 'debug-screenshot-FAILURE.png', fullPage: true });
                const failureContent = await page.content();
                fs.writeFileSync('debug-page-content-FAILURE.html', failureContent);
                console.log('📸 Failure state captured.');
            } catch (captureError) {
                console.error(`📸 Could not capture failure state: ${captureError.message}`);
            }
        } else {
            console.log('Page not available, cannot capture failure state.');
        }

        fs.writeFileSync('browser-test-failure.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message,
            stack: error.stack,
            logs: logs,
            errors: errors
        }, null, 2));
        console.log('📊 Failure report generated.');

    } finally {
        console.log('Closing browser if it exists...');
        if (browser) {
            await browser.close();
        }
    }
}

comprehensiveTest();
