import { config, senderSignature } from './config.mjs';

export const SUBJECT_LINES = [
  'Exploring Collaboration Opportunities',
  'Partnership inquiry — {Company}',
  'Business collaboration — {Company}',
  'Inquiry from Northeast Precision Machinery',
  'Potential project collaboration with {Company}',
];

export function renderBody(lead) {
  const name = lead.contact_person || lead.company_name;

  return `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,

${senderSignature()}`;
}

export function pickSubject(lead, used = 0) {
  const line = SUBJECT_LINES[used % SUBJECT_LINES.length];
  return line.replace('{Company}', lead.company_name);
}
