import { chromium } from 'playwright';
import fs from 'fs';

async function comprehensiveTest() {
    console.log('🌐 Starting comprehensive browser test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    const page = await browser.newPage();
    
    const logs = [];
    const errors = [];
    const warnings = [];
    const configErrors = [];
    
    // Comprehensive log capture
    page.on('console', (msg) => {
        const text = msg.text();
        const type = msg.type();
        const entry = `[${type.toUpperCase()}] ${text}`;
        
        logs.push({
            timestamp: new Date().toISOString(),
            type: type,
            text: text,
            entry: entry
        });
        
        if (type === 'error') {
            errors.push(entry);
        } else if (type === 'warning') {
            warnings.push(entry);
        }
        
        // Specific configuration error detection
        if (text.includes('Configuration') || text.includes('config')) {
            configErrors.push(entry);
        }
        
        console.log(entry);
    });
    
    // Page errors
    page.on('pageerror', (error) => {
        const errorText = `[PAGE ERROR] ${error.message}`;
        errors.push(errorText);
        logs.push({
            timestamp: new Date().toISOString(),
            type: 'pageerror',
            text: error.message,
            entry: errorText,
            stack: error.stack
        });
        console.log(errorText);
    });
    
    try {
        console.log('📡 Navigating to http://localhost:5173...');
        
        // Disable caching to ensure fresh code
        await page.route('**/*', (route) => {
            route.continue({
                headers: {
                    ...route.request().headers(),
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
        });
        
        await page.goto('http://localhost:5173', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('⏱️ Waiting for application to initialize...');
        await page.waitForTimeout(15000);  // 15 seconds max timeout
        
        // Check if app loaded
        const rootElement = await page.$('#root');
        const hasRoot = rootElement !== null;
        
        if (hasRoot) {
            const rootContent = await rootElement.innerHTML();
            console.log(`✅ Root element found (${rootContent.length} characters)`);
        } else {
            console.log('❌ Root element not found');
        }
        
        // Phase 1: Capture main menu state
        console.log('📸 Phase 1: Capturing main menu screenshot...');
        await page.screenshot({ path: 'debug-screenshot-main-menu.png', fullPage: true });
        console.log('📸 Screenshot saved: debug-screenshot-main-menu.png');
        
        // Get page content for main menu
        const content = await page.content();
        fs.writeFileSync('debug-page-content-main-menu.html', content);
        console.log('📄 Page content saved: debug-page-content-main-menu.html');
        
        // Generate detailed report for main menu
        const report1 = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:5173',
            phase: 'main-menu',
            success: errors.length === 0,
            hasRoot: hasRoot,
            stats: {
                totalLogs: logs.length,
                errors: errors.length,
                warnings: warnings.length,
                configErrors: configErrors.length
            },
            logs: logs,
            errors: errors,
            warnings: warnings,
            configErrors: configErrors
        };
        
        fs.writeFileSync('browser-test-report-main-menu.json', JSON.stringify(report1, null, 2));
        console.log('📊 Main menu report saved: browser-test-report-main-menu.json');
        
        // Phase 2: Interact with "INITIATE NEURAL SYNC" button
        console.log('🚀 Clicking "INITIATE NEURAL SYNC" button...');
        await page.getByText('INITIATE NEURAL SYNC').click();
        
        console.log('⏱️ Waiting 2 seconds for game state to initialize...');
        await page.waitForTimeout(2000);
        
        // Phase 2: Capture game view state
        console.log('📸 Phase 2: Capturing game view screenshot...');
        await page.screenshot({ path: 'debug-screenshot-game-view.png', fullPage: true });
        console.log('📸 Screenshot saved: debug-screenshot-game-view.png');
        
        // Get page content for game view
        const gameContent = await page.content();
        fs.writeFileSync('debug-page-content-game-view.html', gameContent);
        console.log('📄 Page content saved: debug-page-content-game-view.html');
        
        // Generate detailed report for game view
        const report2 = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:5173',
            phase: 'game-view',
            success: errors.length === 0,
            hasRoot: hasRoot,
            stats: {
                totalLogs: logs.length,
                errors: errors.length,
                warnings: warnings.length,
                configErrors: configErrors.length
            },
            logs: logs,
            errors: errors,
            warnings: warnings,
            configErrors: configErrors
        };
        
        fs.writeFileSync('browser-test-report-game-view.json', JSON.stringify(report2, null, 2));
        console.log('📊 Game view report saved: browser-test-report-game-view.json');
        
        // Console summary
        console.log('\n📊 BROWSER TEST SUMMARY:');
        console.log('========================');
        console.log(`Total logs: ${logs.length}`);
        console.log(`Errors: ${errors.length}`);
        console.log(`Warnings: ${warnings.length}`);
        console.log(`Config errors: ${configErrors.length}`);
        console.log(`Root element: ${hasRoot ? '✅ Found' : '❌ Missing'}`);
        console.log(`Overall status: ${errors.length === 0 ? '✅ Success' : '❌ Errors found'}`);
        
        if (configErrors.length > 0) {
            console.log('\n🔧 CONFIGURATION ERRORS:');
            configErrors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
        if (errors.length > 0) {
            console.log('\n❌ JAVASCRIPT ERRORS:');
            errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Browser test failed: ${error.message}`);
        
        const failureReport = {
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message,
            stack: error.stack,
            logs: logs,
            errors: errors
        };
        
        fs.writeFileSync('browser-test-failure.json', JSON.stringify(failureReport, null, 2));
    } finally {
        await browser.close();
    }
}

comprehensiveTest();
