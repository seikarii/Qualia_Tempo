const { chromium } = require("playwright");

async function testRaceConditionFix() {
  console.log("🔍 PROBANDO ELIMINACIÓN DE RACE CONDITION...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const errors = [];
  const configurationErrors = [];
  const initializationSteps = [];

  // Capturar logs de consola
  page.on("console", (msg) => {
    const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    logs.push(text);

    // Detectar errores específicos de configuración
    if (
      msg.text().includes("Configuration not loaded") ||
      (msg.text().includes("config") && msg.type() === "error")
    ) {
      configurationErrors.push(text);
    }

    // Capturar pasos de inicialización
    if (
      msg.text().includes("Qualia Tempo Frontend") ||
      msg.text().includes("CompositionRoot") ||
      msg.text().includes("Services initialized")
    ) {
      initializationSteps.push(text);
    }

    if (msg.type() === "error") {
      errors.push(text);
    }
  });

  // Capturar errores de JavaScript
  page.on("pageerror", (error) => {
    const errorText = `[JS ERROR] ${error.message}`;
    errors.push(errorText);
    logs.push(errorText);
  });

  try {
    console.log("📡 Navegando a http://localhost:5173...");
    await page.goto("http://localhost:5173", {
      waitUntil: "load",
      timeout: 30000,
    });

    // Esperar a que la aplicación se inicialice completamente
    console.log("⏱️  Esperando inicialización completa...");
    await page.waitForTimeout(8000);

    // Verificar que la aplicación se ha cargado
    const appElement = await page.$("#root");
    const hasApp = appElement !== null;

    console.log("\n📊 RESULTADOS DE LA PRUEBA DE RACE CONDITION:");
    console.log("=".repeat(60));

    // Test 1: No hay errores de configuración
    if (configurationErrors.length === 0) {
      console.log(
        '✅ TEST 1 PASSED: Sin errores de "Configuration not loaded"',
      );
    } else {
      console.log("❌ TEST 1 FAILED: Errores de configuración encontrados:");
      configurationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Test 2: Pasos de inicialización completados
    if (initializationSteps.length > 0) {
      console.log("✅ TEST 2 PASSED: Pasos de inicialización detectados:");
      initializationSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    } else {
      console.log("❌ TEST 2 FAILED: No se detectaron pasos de inicialización");
    }

    // Test 3: Aplicación se renderizó correctamente
    if (hasApp) {
      console.log("✅ TEST 3 PASSED: Aplicación renderizada correctamente");
    } else {
      console.log("❌ TEST 3 FAILED: Aplicación no se renderizó");
    }

    // Test 4: No hay errores generales
    if (errors.length === 0) {
      console.log("✅ TEST 4 PASSED: Sin errores de JavaScript");
    } else {
      console.log("❌ TEST 4 FAILED: Errores encontrados:");
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log("\n🎯 RESUMEN FINAL:");
    const passedTests = [
      configurationErrors.length === 0,
      initializationSteps.length > 0,
      hasApp,
      errors.length === 0,
    ].filter(Boolean).length;

    console.log(`Tests Pasados: ${passedTests}/4`);
    console.log(`Total logs: ${logs.length}`);
    console.log(`Total errores: ${errors.length}`);

    if (passedTests === 4) {
      console.log("🎉 RACE CONDITION COMPLETAMENTE ELIMINADO");
    } else {
      console.log("⚠️  RACE CONDITION PERSISTE - REVISAR ERRORES");
    }
  } catch (error) {
    console.log("❌ ERROR AL NAVEGAR:", error.message);
    console.log("\n🎯 RESUMEN FINAL:");
    console.log(`Total logs: ${logs.length}`);
    console.log(`Total errores: ${errors.length}`);
    console.log("Estado: ❌ FALLO DE CONEXIÓN");
  } finally {
    await browser.close();
  }
}

testRaceConditionFix();
