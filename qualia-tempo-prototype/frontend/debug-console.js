const { chromium } = require('playwright');

async function captureConsoleLogs() {
  console.log('🔍 INICIANDO DIAGNÓSTICO AUTOMATIZADO...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  
  // Capturar logs de consola
  page.on('console', (msg) => {
    const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });
  
  // Capturar errores de JavaScript
  page.on('pageerror', (error) => {
    const errorText = `[JS ERROR] ${error.message}`;
    errors.push(errorText);
    logs.push(errorText);
  });
  
  try {
    console.log('📡 Navegando a http://localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    // Esperar un poco más para que se inicialicen los servicios
    await page.waitForTimeout(5000);
    
    console.log('📊 RESULTADOS DEL DIAGNÓSTICO:');
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.log(`❌ ERRORES ENCONTRADOS (${errors.length}):`);
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ NO SE ENCONTRARON ERRORES');
    }
    
    console.log('\n📝 TODOS LOS LOGS:');
    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });
    
    // Verificar si la página tiene contenido visible
    const bodyText = await page.textContent('body');
    const hasContent = bodyText && bodyText.trim().length > 10;
    
    console.log('\n🖥️ ESTADO DE LA PÁGINA:');
    console.log(`Contenido visible: ${hasContent ? '✅ SÍ' : '❌ NO (pantalla negra/vacía)'}`);
    
    if (!hasContent) {
      console.log('🔍 Inspeccionando elementos DOM...');
      const htmlContent = await page.content();
      console.log('HTML length:', htmlContent.length);
      
      const appElement = await page.$('#root');
      if (appElement) {
        const appHTML = await appElement.innerHTML();
        console.log('App element content length:', appHTML.length);
        if (appHTML.length < 100) {
          console.log('App element HTML:', appHTML);
        }
      } else {
        console.log('❌ NO SE ENCONTRÓ ELEMENTO #root');
      }
    }
    
  } catch (error) {
    console.log('❌ ERROR AL NAVEGAR:', error.message);
  }
  
  await browser.close();
  
  return { 
    totalLogs: logs.length, 
    totalErrors: errors.length, 
    errors: errors,
    success: errors.length === 0 
  };
}

// Ejecutar diagnóstico
captureConsoleLogs()
  .then(result => {
    console.log('\n🎯 RESUMEN FINAL:');
    console.log(`Total logs: ${result.totalLogs}`);
    console.log(`Total errores: ${result.totalErrors}`);
    console.log(`Estado: ${result.success ? '✅ ÉXITO' : '❌ ERRORES ENCONTRADOS'}`);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.log('💥 FALLO CRÍTICO EN EL DIAGNÓSTICO:', error);
    process.exit(1);
  });
