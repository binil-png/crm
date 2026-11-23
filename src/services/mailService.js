import { googleFetch, isDemoMode } from './googleApi';
import * as mock from './mockBackend';

const toBase64Url = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const buildMime = ({ to, subject, body }) =>
  [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\r\n');

export const sendMail = async ({ to, subject, body }) => {
  const address = String(to || '').trim();
  if (!address || !address.includes('@')) {
    throw new Error('A trainer email is required to send this notification.');
  }
  if (isDemoMode()) {
    return mock.mockSendMail({ to: address, subject, body });
  }
  return googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({
      raw: toBase64Url(buildMime({ to: address, subject, body })),
    }),
  });
};

export const sendLeaveDecisionEmail = async ({ to, status, date, reason, reviewedBy }) => {
  const decision = String(status || '').trim();
  const lines = [
    `Your leave request for ${date || 'the selected date'} has been ${decision.toLowerCase()}.`,
  ];
  if (reason) lines.push('', `Leave reason: ${reason}`);
  if (reviewedBy) lines.push('', `Reviewed by: ${reviewedBy}`);
  lines.push('', 'This message was sent from Sheets CRM.');
  return sendMail({ to, subject: `Leave request ${decision}`, body: lines.join('\n') });
};
