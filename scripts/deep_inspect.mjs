import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function inspectAll() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });

  // 1. Taig Tools
  {
    console.log('=== TAIG TOOLS DETAILS ===');
    const page = await browser.newPage();
    page.on('response', resp => {
      if (resp.status() >= 400) console.log(`Taig response error: ${resp.status()} ${resp.url()}`);
    });
    page.on('requestfailed', req => console.log(`Taig req failed: ${req.url()} (${req.failure()?.errorText})`));
    await page.goto('https://taigtools.com/contact/', { waitUntil: 'networkidle2' });
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('form');
      return { action: f?.action, method: f?.method, innerHTML: f?.innerHTML?.slice(0, 300) };
    });
    console.log('Taig form:', formInfo);
    await page.close();
  }

  // 2. Legacy Molding
  {
    console.log('\n=== LEGACY MOLDING DETAILS ===');
    const page = await browser.newPage();
    await page.goto('https://legacy-molding.com/contact', { waitUntil: 'networkidle2' });
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitBtn = document.querySelector('button, input[type="submit"]');
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
      return {
        action: form?.getAttribute('action'),
        method: form?.getAttribute('method'),
        btnType: submitBtn?.getAttribute('type'),
        btnOnClick: submitBtn?.getAttribute('onclick'),
        formHtml: form?.outerHTML?.slice(0, 500)
      };
    });
    console.log('Legacy form:', formInfo);
    await page.close();
  }

  // 3. Gonefco (#4728 Unicoa)
  {
    console.log('\n=== UNICOA / GONEFCO DETAILS ===');
    const page = await browser.newPage();
    await page.goto('https://www.gonefco.com/contact-us', { waitUntil: 'networkidle2' });
    const frames = page.frames();
    console.log('Frames count:', frames.length);
    for (const frame of frames) {
      console.log('Frame URL:', frame.url());
      try {
        const frameForms = await frame.evaluate(() => {
          return Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => i.name || i.id || i.type)
          }));
        });
        console.log('Frame forms:', frameForms);
      } catch (e) {
        console.log('Frame access err:', e.message);
      }
    }
    await page.close();
  }

  // 4. GSI International (#4737)
  {
    console.log('\n=== GSI INTERNATIONAL DETAILS ===');
    const page = await browser.newPage();
    await page.goto('https://www.gsiinternational.com/contact', { waitUntil: 'networkidle2' });
    const wixInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        placeholder: i.placeholder,
        value: i.value,
        ariaLabel: i.getAttribute('aria-label'),
        name: i.name,
        required: i.required
      }));
      const btns = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        testid: b.getAttribute('data-testid'),
        type: b.type
      }));
      return { inputs, btns };
    });
    console.log('GSI details:', JSON.stringify(wixInfo, null, 2));
    await page.close();
  }

  // 5. Westfall Technik (#4731)
  {
    console.log('\n=== WESTFALL TECHNIK DETAILS ===');
    const page = await browser.newPage();
    await page.goto('https://westfalltechnik.com/contact-us/', { waitUntil: 'networkidle2' });
    const cfInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form.wpcf7-form')).map(f => ({
        id: f.id,
        action: f.action,
        recaptcha: document.querySelector('.wpcf7-recaptcha, .g-recaptcha, iframe[src*="recaptcha"]') ? true : false
      }));
      return forms;
    });
    console.log('Westfall forms:', cfInfo);
    await page.close();
  }

  // 6. Tooling Molds West (#4733)
  {
    console.log('\n=== TOOLING MOLDS WEST DETAILS ===');
    const page = await browser.newPage();
    await page.goto('https://tmwinc.net/', { waitUntil: 'networkidle2' });
    const tmwInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
      return { links, text: document.body.innerText };
    });
    console.log('TMW links:', tmwInfo.links);
    console.log('TMW text snippet:', tmwInfo.text.slice(0, 300));
    await page.close();
  }

  await browser.close();
}

inspectAll();
