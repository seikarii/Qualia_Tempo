import { chromium } from "playwright";

async function testCentering() {
  console.log("🔧 TESTING MENU CENTERING...");

  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 1000,
    args: ["--disable-web-security", "--disable-cache"],
  });
  const page = await browser.newPage();

  // Clear all cache
  await page.context().clearCookies();
  await page.goto("http://localhost:5173", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Force refresh
  await page.reload({ waitUntil: "networkidle" });

  // Wait for page to fully load
  await page.waitForTimeout(3000);

  // Check the main container positioning
  const containerInfo = await page.evaluate(() => {
    const mainContainer = document.querySelector(
      '[class*="flex items-center justify-center"]',
    );
    if (!mainContainer) return { error: "No flex container found" };

    const rect = mainContainer.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(mainContainer);

    return {
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      },
      computedStyle: {
        display: computedStyle.display,
        justifyContent: computedStyle.justifyContent,
        alignItems: computedStyle.alignItems,
        position: computedStyle.position,
        inset: computedStyle.inset,
        zIndex: computedStyle.zIndex,
      },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      expectedCenterX: window.innerWidth / 2,
      expectedCenterY: window.innerHeight / 2,
    };
  });

  console.log("🔍 CONTAINER ANALYSIS:", JSON.stringify(containerInfo, null, 2));

  // Take another screenshot
  await page.screenshot({ path: "centering-debug.png", fullPage: true });
  console.log("📸 Debug screenshot saved: centering-debug.png");

  await page.waitForTimeout(5000); // Keep browser open for manual inspection
  await browser.close();
}

testCentering();
