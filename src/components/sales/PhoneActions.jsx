import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const whatsappNumber = (value) => {
  let digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 10) digits = `91${digits.replace(/^0+/, '')}`;
  else if (digits.length === 10) digits = `91${digits}`;
  return digits;
};

export const whatsappUrl = (value) => {
  const phone = whatsappNumber(value);
  return phone ? `https://wa.me/${phone}` : '';
};

function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.5 3.5A11 11 0 0 0 2.1 17.7L1 23l5.4-1.1A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21.1a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.2.7.7-3.1-.2-.3A9.1 9.1 0 1 1 12 21.1Zm5-6.8c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.4c.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3s-1 1-1 2.3 1 2.7 1.1 2.9 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.8 3.8 0 0 0 1.8.1c.5-.1 1.6-.7 1.8-1.3s.2-1.2.2-1.3-.2-.2-.4-.3Z"
      />
    </svg>
  );
}

export default function PhoneActions({ value, compact = false, showNumber = true }) {
  const [copied, setCopied] = useState(false);
  const display = String(value || '').trim();
  const chatUrl = whatsappUrl(display);

  if (!display) return showNumber ? '—' : null;

  const copyNumber = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(display);
    } catch {
      const field = document.createElement('textarea');
      field.value = display;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const stopRow = (event) => event.stopPropagation();

  return (
    <div className="flex items-center gap-1" onClick={stopRow} onMouseDown={stopRow}>
      {showNumber ? <span className={compact ? 'text-xs' : 'text-sm'}>{display}</span> : null}
      <button
        type="button"
        title={copied ? 'Copied' : 'Copy phone number'}
        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        onClick={copyNumber}
      >
        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      </button>
      {chatUrl ? (
        <a
          href={chatUrl}
          target="_blank"
          rel="noreferrer"
          title="Open in WhatsApp"
          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
          onClick={stopRow}
        >
          <WhatsAppIcon />
        </a>
      ) : null}
    </div>
  );
}
