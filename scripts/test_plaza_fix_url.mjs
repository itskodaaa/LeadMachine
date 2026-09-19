import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-running-insecure-content']
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
    // Fix the wpAjaxUrl
    if (window.FLBuilderLayoutConfig && window.FLBuilderLayoutConfig.paths) {
      console.log('Old ajaxUrl:', window.FLBuilderLayoutConfig.paths.wpAjaxUrl);
      window.FLBuilderLayoutConfig.paths.wpAjaxUrl = '/wp-admin/admin-ajax.php';
    }

    $('#fl-name').val('Pamela Jameson');
    $('#fl-email').val('pamela.jameson@nortiheastprecision.com');
    $('#fl-message').val('Exploring Collaboration Opportunities - Interested in electrical services and discussing potential partnership.');

    const theForm = $('.fl-contact-form');
    const submit = theForm.find('.fl-button');
    submit[0].click();
    return 'clicked';
  });

  console.log('Step debug:', stepDebug);
  await new Promise(r => setTimeout(r, 6000));

  const postSubmit = await page.evaluate(() => {
    const $ = window.jQuery;
    return {
      sendErrorText: $('.fl-send-error').text(),
      sendErrorVisible: $('.fl-send-error').is(':visible'),
      successText: $('.fl-success-none').text(),
      successVisible: $('.fl-success-none').is(':visible')
    };
  });
  console.log('Post submit state:', postSubmit);

  if (postSubmit.successVisible || (postSubmit.successText && !postSubmit.sendErrorVisible)) {
    console.log('SUCCESS! Updating database for #949...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://plazaelectric.com/contact-us/ (Autofilled Beaver Builder form & verified: "${postSubmit.successText || 'Message Sent!'}")`;
    updateStmt.run(note, 'contacted', 949);
    logStmt.run(949, 'sent', note);
    console.log('Lead 949 marked contacted!');
  }

  await browser.close();
})();
