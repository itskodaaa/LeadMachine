import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const leadIds = [3953, 3954, 3956, 3957, 3958, 3959, 3960, 3961, 3962];
  
  for (const id of leadIds) {
    const lead = db.prepare('SELECT id, company_name, website FROM leads WHERE id = ?').get(id);
    console.log(`\n========================================`);
    console.log(`Inspecting Lead #${lead.id}: ${lead.company_name} (${lead.website})`);
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    
    try {
      let url = lead.website;
      if (!url.startsWith('http')) url = 'https://' + url;
      
      console.log(`Navigating to ${url}...`);
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
        console.log(`Error navigating to https, trying http:`, e.message);
        return page.goto(url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e2 => {
          console.log(`Failed both:`, e2.message);
          return null;
        });
      });
      
      if (!resp) {
        console.log(`Could not load page.`);
        await page.close();
        continue;
      }
      
      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Loaded: ${currentUrl} | Title: ${title}`);
      
      // Look for forms, captchas, iframes
      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => a.href.toLowerCase().includes('contact') || a.text.toLowerCase().includes('contact'));
        
        return {
          formsCount: forms.length,
          inputsCount: inputs.length,
          inputsSummary: inputs.map(i => `${i.tagName}[name="${i.name}"][type="${i.type}"][placeholder="${i.placeholder}"]`),
          captchasCount: captchas.length,
          iframes,
          contactLinks: contactLinks.slice(0, 5)
        };
      });
      
      console.log(`Details:`, JSON.stringify(details, null, 2));
      
    } catch (err) {
      console.log(`Error inspecting #${lead.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectLeads();
