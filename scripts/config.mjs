import 'dotenv/config';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  /* ignore */
}

export const config = {
  titanEmail: process.env.TITAN_EMAIL || '',
  titanPassword: process.env.TITAN_PASSWORD || '',
  smtp: { host: process.env.SMTP_HOST || 'smtp0101.titan.email', port: +(process.env.SMTP_PORT || 465) },
  imap: { host: process.env.IMAP_HOST || 'imap0101.titan.email', port: +(process.env.IMAP_PORT || 993) },
  sender: {
    name: process.env.SENDER_NAME || '',
    title: process.env.SENDER_TITLE || '',
    company: process.env.SENDER_COMPANY || '',
    address: process.env.SENDER_ADDRESS || '',
    phone: process.env.SENDER_PHONE || '',
    website: process.env.SENDER_WEBSITE || '',
  },
  offer: {
    weTransferUrl: process.env.WETRANSFER_URL || '',
    accessCode: process.env.NDA_ACCESS_CODE || '',
  },
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  },
  sendDelayMs: +(process.env.SEND_DELAY_MS || 12000),
  dailyCap: +(process.env.DAILY_CAP || 50),
};

export function senderSignature() {
  const s = config.sender;
  return [
    s.name,
    s.title,
    s.company,
    s.phone && `Phone: ${s.phone}`,
    s.address,
    s.website,
  ].filter(Boolean).join('\n');
}
