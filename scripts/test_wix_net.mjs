import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testWixNetwork() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('request', r => {
    if (r.method() === 'POST' && (r.url().includes('wix') || r.url().includes('form'))) {
      console.log('POST request:', r.url());
    }
  });
  page.on('response', async r => {
    if (r.request().method() === 'POST' && (r.url().includes('wix') || r.url().includes('form'))) {
      console.log('POST status:', r.status(), r.url());
      try { console.log('POST response:', (await r.text()).substring(0, 300)); } catch(e) {}
    }
  });

  await page.goto('https://www.connecteng.com/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  await page.click('#input_comp-kq7zuql2');
  await page.type('#input_comp-kq7zuql2', 'Pamela');
  await page.click('#input_comp-kq7zuql8');
  await page.type('#input_comp-kq7zuql8', 'Jameson');
  await page.click('#input_comp-kq7zuqlc');
  await page.type('#input_comp-kq7zuqlc', 'pamela.jameson@nortiheastprecision.com');
  await page.click('#input_comp-kq80rugc');
  await page.type('#input_comp-kq80rugc', 'Project Collaboration');
  await page.click('#textarea_comp-kq7zuqlk');
  await page.type('#textarea_comp-kq7zuqlk', 'Hello, inquiring about civil engineering services for upcoming projects.');

  const btn = await page.$('#comp-kq7zuqku button');
  const box = await btn.boundingBox();
  console.log('Clicking button...');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
}
testWixNetwork();
