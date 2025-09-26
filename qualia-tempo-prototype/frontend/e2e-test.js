const { chromium } = require("playwright");

(async () => {
  console.log(
    "🚀 Starting Playwright E2E Test for Backend-Frontend Connection",
  );

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console messages
    page.on("console", (msg) => {
      console.log(`BROWSER [${msg.type().toUpperCase()}]:`, msg.text());
    });

    // Capture errors
    page.on("pageerror", (err) => {
      console.log("❌ PAGE ERROR:", err.message);
    });

    // Capture failed network requests
    page.on("requestfailed", (req) => {
      console.log("🚫 NETWORK FAILED:", req.url(), req.failure().errorText);
    });

    console.log("📱 Loading frontend at http://localhost:5173...");
    await page.goto("http://localhost:5173", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    console.log("⏳ Waiting 10 seconds for services to fully initialize...");
    await page.waitForTimeout(10000);

    // Check for backend connection status in the DOM
    const backendStatus = await page.evaluate(() => {
      const indicators = [];

      // Look for common patterns
      const selectors = [
        '*[class*="backend"]',
        '*[class*="Backend"]',
        '*[class*="connection"]',
        '*[class*="Connection"]',
        '*[class*="disconnected"]',
        '*[class*="Disconnected"]',
        '*[class*="connected"]',
        '*[class*="Connected"]',
        '*[data-testid*="backend"]',
        '*[data-testid*="connection"]',
      ];

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el.textContent.trim()) {
            indicators.push({
              text: el.textContent.trim(),
              className: el.className,
              id: el.id,
              tag: el.tagName,
            });
          }
        });
      });

      return indicators;
    });

    console.log("🔍 Backend Status Indicators Found:");
    if (backendStatus.length === 0) {
      console.log("  ⚠️  No backend status indicators found");
    } else {
      backendStatus.forEach((status) => {
        console.log(
          `  - ${status.tag}#${status.id}.${status.className}: "${status.text}"`,
        );
      });
    }

    // Check for specific connection messages
    const connectionKeywords = await page.evaluate(() => {
      const bodyText = document.body.textContent || "";
      const keywords = [
        "Backend Disconnected",
        "Connected",
        "Disconnected",
        "Connection",
        "backend",
        "Backend",
      ];
      const found = [];

      keywords.forEach((keyword) => {
        if (bodyText.includes(keyword)) {
          found.push(keyword);
        }
      });

      return found;
    });

    console.log("🔎 Connection Keywords Found:", connectionKeywords);

    // Check for React loading/error states
    const appState = await page.evaluate(() => {
      const loading =
        document.querySelector('*[class*="loading"]') ||
        document.querySelector('*[class*="Loading"]') ||
        document.querySelector('*[class*="initializing"]');

      const error =
        document.querySelector('*[class*="error"]') ||
        document.querySelector('*[class*="Error"]') ||
        document.querySelector('*[class*="failed"]');

      const initialized =
        document.querySelector('*[class*="initialized"]') ||
        document.querySelector('*[class*="ready"]');

      return {
        hasLoading: !!loading,
        hasError: !!error,
        hasInitialized: !!initialized,
        loadingText: loading?.textContent?.trim() || "",
        errorText: error?.textContent?.trim() || "",
        initializedText: initialized?.textContent?.trim() || "",
      };
    });

    console.log("🎯 Application State:");
    console.log(`  Loading: ${appState.hasLoading} (${appState.loadingText})`);
    console.log(`  Error: ${appState.hasError} (${appState.errorText})`);
    console.log(
      `  Initialized: ${appState.hasInitialized} (${appState.initializedText})`,
    );

    // Final assessment
    console.log("\n📊 E2E Test Results:");
    if (connectionKeywords.includes("Backend Disconnected")) {
      console.log(
        '❌ BACKEND CONNECTION FAILED - "Backend Disconnected" found in page',
      );
    } else if (
      connectionKeywords.includes("Connected") ||
      connectionKeywords.includes("backend")
    ) {
      console.log("✅ BACKEND CONNECTION INDICATORS PRESENT");
    } else {
      console.log("⚠️  UNCLEAR CONNECTION STATUS - No clear indicators found");
    }

    await browser.close();
    console.log("✅ E2E Test Complete");
  } catch (error) {
    console.error("💥 E2E Test Failed:", error.message);
    process.exit(1);
  }
})();
