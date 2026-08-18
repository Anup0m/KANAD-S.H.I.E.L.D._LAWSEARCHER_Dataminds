import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  console.log('Navigating to Search Page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '../presentation_search_page.png' });
  console.log('Saved presentation_search_page.png');

  console.log('Navigating to Dashboard...');
  await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '../presentation_dashboard.png' });
  console.log('Saved presentation_dashboard.png');

  console.log('Navigating to Document Detail (Aadhaar Act)...');
  // Find the Aadhaar Act document dynamically
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  // Wait for documents to load
  await page.waitForSelector('h3');
  
  // Try to click the Aadhaar Act card
  const cards = await page.$$('h3');
  let clicked = false;
  for (const card of cards) {
    const text = await page.evaluate(el => el.textContent, card);
    if (text.includes('Targeted Delivery of Financial')) {
      const parentCard = await card.evaluateHandle(el => el.closest('.glass-panel'));
      await parentCard.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    // Just click the first document if Aadhaar isn't found
    const firstCard = await page.$('.glass-panel');
    if (firstCard) await firstCard.click();
  }

  // Wait for the iframe and detail page to load
  await page.waitForTimeout(3000); 
  await page.screenshot({ path: '../presentation_document_detail.png' });
  console.log('Saved presentation_document_detail.png');

  await browser.close();
  console.log('Done! All screenshots saved to the kanan root folder.');
})();
