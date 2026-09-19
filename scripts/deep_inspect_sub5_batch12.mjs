import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspect(leadId, url) {
  console.log(`\n=================== Inspecting #${leadId}: ${url} ===================`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_BIN,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    page.setDefaultTimeout(20000);

    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
      console.log(`Navigation error: ${e.message}`);
      return null;
    });

    if (!resp) {
      console.log('Failed to load page');
      return;
    }

    const title = await page.title();
    console.log(`Title: ${title}, Status: ${resp.status()}`);

    // Check forms
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          required: el.required || el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
          className: el.className || ''
        }));
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
          tag: b.tagName.toLowerCase(),
          type: b.type || '',
          text: b.innerText || b.value || '',
          id: b.id || '',
          className: b.className || ''
        }));
        return {
          index: i,
          action: f.action || '',
          method: f.method || '',
          id: f.id || '',
          className: f.className || '',
          inputs,
          buttons
        };
      });
    });

    console.log(`Forms found: ${forms.length}`);
    console.dir(forms, { depth: null });

    // Check if there are iframes or contact links
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.innerText.trim() }))
        .filter(a => /contact|reach|quote|touch/i.test(a.href) || /contact|reach|quote|touch/i.test(a.text));
    });
    console.log('Contact links:', contactLinks.slice(0, 5));

  } catch (err) {
    console.log(`Error inspecting ${leadId}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function run() {
  await inspect(4004, 'https://skyframe-eng.com/');
  await inspect(4000, 'https://floridabuildingengineering.com/');
  await inspect(3997, 'https://www.calceng.com/contact-us');
  await inspect(4001, 'https://mepdesigngroupllc.com/contact-us');
  await inspect(4002, 'https://www.auroracg.net/contact');
  await inspect(4003, 'https://zephyrengineeringfl.com/index.php/contact-us/');
  await inspect(3994, 'https://askgbatista.com');
  await inspect(3995, 'http://engdesignllc.com');
  await inspect(3998, 'https://picosce.com');
}

run();
