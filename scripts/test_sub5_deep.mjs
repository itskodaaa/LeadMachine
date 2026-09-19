import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkDeep() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Tool Place Corp contact page
  console.log('--- Tool Place Corp contact page ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://toolplacecorp.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
      return { forms, bodyText: document.body.innerText.slice(0, 500) };
    });
    console.log('Tool Place contact:', JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) {
    console.log('Tool place error:', e.message);
  }

  // 2. Switchgear contact page
  console.log('--- Switchgear contact page ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://switchgearflorida.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
      return { forms, bodyText: document.body.innerText.slice(0, 500) };
    });
    console.log('Switchgear contact:', JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) {
    console.log('Switchgear error:', e.message);
  }

  // 3. Piece-Makers form submission test
  console.log('--- Piece-Makers test ---');
  try {
    const page = await browser.newPage();
    page.on('response', async res => {
      if (res.url().includes('feedback') || res.url().includes('wpcf7') || res.url().includes('admin-ajax')) {
        try {
          console.log(`Piece-Makers response [${res.status()}]:`, res.url(), (await res.text()).slice(0, 300));
        } catch (err) {}
      }
    });
    await page.goto('https://piece-makers.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    // Fill form
    await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (form) {
        const name = form.querySelector('input[name="your-name"]');
        if (name) name.value = 'Pamela';
        const lastName = form.querySelector('input[name="last-name"]');
        if (lastName) lastName.value = 'Jameson';
        const email = form.querySelector('input[name="your-email"]');
        if (email) email.value = 'pamela.jameson@nortiheastprecision.com';
        const phone = form.querySelector('input[name="your-phone"]');
        if (phone) phone.value = '708-568-3708';
        const country = form.querySelector('input[name="your-country"]');
        if (country) country.value = 'USA';
        const city = form.querySelector('input[name="your-city"]');
        if (city) city.value = 'Chicago';
        const state = form.querySelector('input[name="your-state"]');
        if (state) state.value = 'IL';
        const msg = form.querySelector('textarea[name="your-message"]');
        if (msg) msg.value = 'Hello, We are reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson';
      }
    });
    console.log('Piece-makers filled, clicking submit...');
    await Promise.all([
      page.evaluate(() => {
        const submit = document.querySelector('form.wpcf7-form input[type="submit"]');
        if (submit) submit.click();
      }),
      new Promise(r => setTimeout(r, 6000))
    ]);
    const responseDiv = await page.evaluate(() => {
      const res = document.querySelector('.wpcf7-response-output');
      return res ? res.innerText : 'none';
    });
    console.log('Piece-Makers response output:', responseDiv);
    await page.close();
  } catch (e) {
    console.log('Piece-makers error:', e.message);
  }

  // 4. AG Electrical
  console.log('--- AG Electrical ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://agelectricalengineer.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
      return { forms, title: document.title };
    });
    console.log('AG Electrical:', JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) {
    console.log('AG Electrical error:', e.message);
  }

  // 5. Becai Electric
  console.log('--- Becai Electric ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.becaielectric.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      }));
      return { forms, title: document.title };
    });
    console.log('Becai Electric:', JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) {
    console.log('Becai Electric error:', e.message);
  }

  // 6. JALRW
  console.log('--- JALRW ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jalrw.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const text = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText.slice(0, 1000),
      links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
    }));
    console.log('JALRW content:', JSON.stringify(text, null, 2));
    await page.close();
  } catch (e) {
    console.log('JALRW error:', e.message);
  }

  // 7. Check connectivity for eelectricsf, electrumengineering, labraservices
  for (const domain of ['eelectricsf.com', 'electrumengineering.com', 'labraservices.com', 'bdelectriccorp.com']) {
    console.log(`--- Connectivity: ${domain} ---`);
    for (const proto of ['http://', 'https://']) {
      const page = await browser.newPage();
      try {
        const res = await page.goto(proto + domain, { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log(`${proto}${domain} -> Status: ${res?.status()}, URL: ${page.url()}`);
      } catch (err) {
        console.log(`${proto}${domain} -> Failed: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
}

checkDeep();
