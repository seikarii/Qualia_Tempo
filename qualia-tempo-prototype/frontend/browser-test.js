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
        
        // Wait for the main menu to be fully loaded - look for the INITIATE NEURAL SYNC button
        console.log('⏳ Waiting for main menu to load...');
        await page.waitForSelector('text=INITIATE NEURAL SYNC', { timeout: 10000 });
        console.log('✅ Main menu loaded successfully');

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
        
        // Wait for game to transition - look for some game element or reduced timeout
        console.log('⏳ Waiting for game transition...');
        await page.waitForTimeout(2000); // Keep original 2s but add logging

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

        // --- Phase 4: Movement Test ---
        console.log('🎮 Testing character movement (W + D keys)...');
        console.log("Forzando foco en el canvas");
        await page.focus('canvas');
        console.log("Foco en canvas establecido");
        // Press and hold W and D keys simultaneously
        await page.keyboard.down('KeyW');
        await page.keyboard.down('KeyD');
        
        // Hold for 1 second to allow movement
        await page.waitForTimeout(1000);
        
        // Release keys
        await page.keyboard.up('KeyD');
        await page.keyboard.up('KeyW');
        
        console.log('⏳ Waiting for movement to register...');
        await page.waitForTimeout(500);

        // --- Phase 5: Movement Result ---
        console.log('📸 Capturing movement test state (Screenshot + DOM)...');
        await page.screenshot({ path: 'debug-screenshot-movement-test.png', fullPage: true });
        const movementContent = await page.content();
        fs.writeFileSync('debug-page-content-movement-test.html', movementContent);
        fs.writeFileSync('browser-test-report-movement-test.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'movement-test',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Movement test state captured.');

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
