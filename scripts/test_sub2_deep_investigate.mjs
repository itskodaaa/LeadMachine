import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function investigateLeads() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  
  const targets = [
    { id: 4566, name: 'SME', url: 'https://www.sme-usa.com/' },
    { id: 4567, name: 'Mannik Smith Group', url: 'https://manniksmithgroup.com/' },
    { id: 4568, name: 'GRP Engineering', url: 'https://grp-engineering.com/' },
    { id: 4571, name: 'Electric Power Engineers', url: 'https://epeconsulting.com/' },
    { id: 4574, name: 'T&D Engineers', url: 'https://tdengineers.com/' }
  ];

  for (const t of targets) {
    console.log(`\n=================== Investigating #${t.id} ${t.name} ===================`);
    const page = await browser.newPage();
    page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 25000 });
      console.log('Landed on:', page.url());

      const data = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim(),
          href: a.href
        }));
        const contactLinks = links.filter(l => 
          l.href.toLowerCase().includes('contact') || 
          l.text.toLowerCase().includes('contact') ||
          l.href.toLowerCase().includes('touch') ||
          l.href.toLowerCase().includes('quote')
        );
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => i.name || i.id || i.type)
        }));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        const mailtos = links.filter(l => l.href.startsWith('mailto:'));
        return { contactLinks, forms, iframes, mailtos };
      });

      console.log('Forms on home:', data.forms);
      console.log('Contact links:', data.contactLinks.slice(0, 5));
      console.log('Mailtos:', data.mailtos);
      console.log('Iframes:', data.iframes.slice(0, 3));

      // If there's a contact link, let's navigate to the first one
      if (data.contactLinks.length > 0) {
        const targetContactUrl = data.contactLinks[0].href;
        console.log(`Navigating to contact page: ${targetContactUrl}`);
        await page.goto(targetContactUrl, { waitUntil: 'networkidle2', timeout: 25000 });
        console.log('Contact page landed:', page.url());

        const contactData = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            id: f.id,
            inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
              tag: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required
            }))
          }));
          const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
          const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
          const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]');
          const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
          const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
          const bodySnippet = document.body.innerText.slice(0, 500);
          return { forms, iframes, mailtos, hasRecaptcha, hasHcaptcha, hasTurnstile, bodySnippet };
        });
        console.log('Contact page forms:', JSON.stringify(contactData.forms, null, 2));
        console.log('Captcha:', { recaptcha: contactData.hasRecaptcha, hcaptcha: contactData.hasHcaptcha, turnstile: contactData.hasTurnstile });
        console.log('Contact Mailtos:', contactData.mailtos);
        console.log('Contact snippet:', contactData.bodySnippet.replace(/\n+/g, ' '));
      }

    } catch (e) {
      console.log(`Error on ${t.name}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

investigateLeads();
