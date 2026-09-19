#!/usr/bin/env node
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';
import dns from 'dns/promises';
import fs from 'fs';
import db from './db.mjs';
import { config, senderSignature } from './config.mjs';

const NDA_FILE_PATH = '/Users/macbookair/Downloads/Technical_Requirement_Files_mt2ulo2l.htm';

if (!fs.existsSync(NDA_FILE_PATH)) {
  console.error(`ERROR: NDA file not found at ${NDA_FILE_PATH}`);
  process.exit(1);
}

// Resolve SMTP and IMAP IPs using robust DNS resolvers
let smtpIp = config.smtp.host;
try {
  const ips = await dns.resolve4(config.smtp.host);
  if (ips && ips.length > 0) smtpIp = ips[0];
} catch {
  /* fallback */
}

let imapIp = config.imap.host;
try {
  const ips = await dns.resolve4(config.imap.host);
  if (ips && ips.length > 0) imapIp = ips[0];
} catch {
  /* fallback */
}

function getTransporter() {
  return nodemailer.createTransport({
    host: smtpIp,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.titanEmail, pass: config.titanPassword },
    tls: { servername: config.smtp.host },
    pool: false,
  });
}

async function appendToSent(mailOptions) {
  let client = null;
  try {
    const composer = new MailComposer(mailOptions);
    const buffer = await composer.compile().build();
    client = new ImapFlow({
      host: imapIp,
      port: config.imap.port,
      secure: true,
      servername: config.imap.host,
      tls: { servername: config.imap.host },
      auth: { user: config.titanEmail, pass: config.titanPassword },
      logger: false,
    });
    await client.connect();
    await client.append('Sent', buffer, ['\\Seen']);
  } catch (err) {
    console.warn(`  [WARN] Failed to sync copy to Sent folder: ${err.message}`);
  } finally {
    if (client) {
      try { await client.logout(); } catch {}
    }
  }
}

// The 6 remaining leads that experienced socket timeout
const allTargetLeads = [
  {
    email: 'cody@buildgroupllc.com',
    name: 'Cody Hawkins (Build Group LLC)',
    subject: 'Re: Form Message',
  },
  {
    email: 'gracious@jagre.com',
    name: 'Gracious Peterson (JAG Development)',
    subject: 'Re: JAG Development | Commercial Inquiry – Next Steps',
  },
  {
    email: 'requests@alchemy.builders',
    name: 'Alchemy Builders',
    subject: 'Re: Form Submission - Website message',
  },
  {
    email: 'gortiz@tciprecision.com',
    name: 'Gustavo Ortiz (TCI Precision Metals)',
    subject: 'Re: New submission from Contact Form',
  },
  {
    email: 'luisl@kcg.vegas',
    name: 'Luis Lozoya (KCG Development)',
    subject: 'Re: Project Lead',
  },
  {
    email: 'info@midconstruction.com',
    name: 'MID Construction Group',
    subject: 'Re: Partnership inquiry — MID Construction Group',
  },
];

// Check who already received it today
const alreadySent = new Set(
  db.prepare(`SELECT LOWER(to_email) e FROM sent_emails WHERE subject LIKE '%Re:%' AND date(sent_at) = date('now')`)
    .all()
    .map(r => r.e)
);

const recipients = allTargetLeads.filter(r => !alreadySent.has(r.email.toLowerCase()));

console.log(`Targeting ${recipients.length} remaining decision-makers for NDA response.`);

const bodyTemplate = `Dear Partner,

Thank you for your response and interest in collaborating with Northeast Precision Machinery, Inc.

Attached please find our Technical Requirements and Non-Disclosure Agreement (NDA) documentation for your review.

Please review the attached specifications and revert back with your confirmation, proposed timeline, and capabilities so that our team can proceed with the next phase of our collaboration.

If you have any questions or require further clarification, please feel free to reach out.

Best regards,

${senderSignature()}`;

let sent = 0, failed = 0;

for (let i = 0; i < recipients.length; i++) {
  const r = recipients[i];
  console.log(`\n[${i + 1}/${recipients.length}] Sending NDA response to: ${r.name} <${r.email}>`);
  console.log(`  Subject: ${r.subject}`);

  const mailOptions = {
    from: `${config.sender.name || 'Pamela Jameson'} <${config.titanEmail}>`,
    to: r.email,
    subject: r.subject,
    text: bodyTemplate,
    attachments: [
      {
        filename: 'Technical_Requirement_Files_mt2ulo2l.htm',
        path: NDA_FILE_PATH,
      },
    ],
  };

  let success = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail(mailOptions);
      db.prepare(`INSERT INTO sent_emails (to_email, subject, body, status, message_id) VALUES (?, ?, ?, 'sent', ?)`)
        .run(r.email, r.subject, bodyTemplate, info.messageId || null);
      sent++;
      success = true;
      console.log(`  [OK] Sent successfully!`);

      if (info.messageId) mailOptions.messageId = info.messageId;
      await appendToSent(mailOptions);
      break;
    } catch (err) {
      if (attempt === 1) {
        console.warn(`  [RETRY] Attempt 1 failed (${err.message}). Retrying with fresh socket in 3s...`);
        await new Promise(res => setTimeout(res, 3000));
      } else {
        console.warn(`  [FAILED] ${err.message}`);
        failed++;
      }
    }
  }

  if (i < recipients.length - 1) {
    const delay = 8000 + Math.floor(Math.random() * 4000);
    await new Promise(res => setTimeout(res, delay));
  }
}

console.log(`\nDone sending NDA responses. Sent: ${sent}, Failed: ${failed}`);
