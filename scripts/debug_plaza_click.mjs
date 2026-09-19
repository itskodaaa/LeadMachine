import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));

  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php')) {
      console.log('AJAX Response:', res.status(), res.url());
      try {
        console.log('AJAX Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://plazaelectric.com/contact-us/', { waitUntil: 'networkidle2' });
  
  const stepDebug = await page.evaluate(() => {
    const $ = window.jQuery;
    $('#fl-name').val('Pamela Jameson');
    $('#fl-email').val('pamela.jameson@nortiheastprecision.com');
    $('#fl-message').val('Exploring Collaboration Opportunities - Interested in electrical services and discussing potential partnership.');

    const theForm = $('.fl-contact-form');
    const submit = theForm.find('.fl-button');
    const name = theForm.find('.fl-name input');
    const email = theForm.find('.fl-email input');
    const message = theForm.find('.fl-message textarea');
    
    console.log('name val:', name.val());
    console.log('email val:', email.val());
    console.log('message val:', message.val());
    console.log('has fl-disabled:', submit.hasClass('fl-disabled'));
    
    // Now trigger click on the actual DOM element
    submit[0].click();
    return 'clicked';
  });

  console.log('Step debug:', stepDebug);
  await new Promise(r => setTimeout(r, 6000));

  await browser.close();
})();
