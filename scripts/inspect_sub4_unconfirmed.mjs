import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [3309, 3311, 3312, 3314, 3315, 3316, 3317, 3318];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });

  for (const id of leadIds) {
    const lead = db.prepare('SELECT id, company_name, website, status, notes FROM leads WHERE id = ?').get(id);
    console.log(`\n========================================\nExamining #${lead.id} ${lead.company_name} (${lead.website})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      let url = lead.website.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Loaded URL: ${page.url()} | Title: ${await page.title()}`);

      // Check for contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => (/contact|inquir|quote|get-in-touch|reach-out/i.test(a.text) || /contact|inquir|quote/i.test(a.href)) && !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'));
      });
      console.log(`Contact links found:`, JSON.stringify(links.slice(0, 5)));

      // If we're not on a contact page and links exist, visit first contact link
      if (!/contact/i.test(page.url()) && links.length > 0) {
        console.log(`Navigating to contact link: ${links[0].href}`);
        await page.goto(links[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        console.log(`Now at: ${page.url()}`);
      }

      // Inspect forms and iframes
      const formInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src, id: f.id, name: f.name }));
        const inputs = Array.from(document.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          text: el.innerText || el.value,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], input[name*="captcha"]')).map(c => ({
          tag: c.tagName,
          className: c.className,
          src: c.src,
          sitekey: c.getAttribute('data-sitekey')
        }));

        return {
          formsCount: forms.length,
          captchas,
          inputs: inputs.filter(i => i.visible),
          iframes: iframes.filter(f => f.src)
        };
      });

      console.log(`Forms count: ${formInfo.formsCount}`);
      console.log(`Captchas detected:`, JSON.stringify(formInfo.captchas));
      console.log(`Visible Inputs count: ${formInfo.inputs.length}`);
      console.log(`Inputs:`, JSON.stringify(formInfo.inputs.slice(0, 10), null, 2));
      if (formInfo.iframes.length > 0) {
        console.log(`Iframes:`, JSON.stringify(formInfo.iframes, null, 2));
      }

    } catch (err) {
      console.log(`Error examining #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
