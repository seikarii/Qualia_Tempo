import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch({ headless: true, timeout: 30000 });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log('🔍 Loading application...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('⏳ Waiting 3 seconds...');
    await page.waitForTimeout(3000);

    console.log('\n📊 ANALYSIS:');
    const shaderErrors = consoleMessages.filter(m => m.includes('ERROR:'));
    console.log(`Shader errors: ${shaderErrors.length}`);
    
    if (shaderErrors.length > 0) {
      console.log('First 3 errors:');
      shaderErrors.slice(0, 3).forEach(e => console.log(`  - ${e.substring(0, 120)}`));
    } else {
      console.log('✅ NO ERRORS!');
    }

    const varyingErrors = consoleMessages.filter(m => m.includes("'varying'"));
    console.log(`\n"varying" keyword errors: ${varyingErrors.length}`);

    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e.message);
    process.exit(1);
  }
})();
