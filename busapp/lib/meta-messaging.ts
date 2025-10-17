import crypto from 'crypto';
import { config } from './config';

const GRAPH_BASE = config.whatsapp.apiBaseUrl.replace(/\/$/, '');

function createAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function verifyMetaSignature(signature: string | null, payload: string): boolean {
  if (!signature || !config.whatsapp.appSecret) {
    return false;
  }

  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', config.whatsapp.appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expected}`)
    );
  } catch {
    return false;
  }
}

async function handleGraphResponse(response: Response, context: string): Promise<any> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Meta API ${context} failed: ${response.status} ${text}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function sendWhatsAppText(phoneNumberId: string, to: string, body: string): Promise<void> {
  if (!config.whatsapp.accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
  }

  const url = `${GRAPH_BASE}/${config.whatsapp.apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...createAuthHeader(config.whatsapp.accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  await handleGraphResponse(response, 'send text');
}

export async function sendWhatsAppDocument(
  phoneNumberId: string,
  to: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<void> {
  if (!config.whatsapp.accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
  }

  const uploadUrl = `${GRAPH_BASE}/${config.whatsapp.apiVersion}/${phoneNumberId}/media`;
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  formData.append('file', new Blob([arrayBuffer]), filename);
  formData.append('type', mimeType);

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: createAuthHeader(config.whatsapp.accessToken),
    body: formData,
  });

  const uploadData = await handleGraphResponse(uploadResponse, 'upload media');
  const mediaId = uploadData?.id;
  if (!mediaId) {
    throw new Error('Meta API upload did not return media ID');
  }

  const messageUrl = `${GRAPH_BASE}/${config.whatsapp.apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'document',
    document: {
      id: mediaId,
      filename,
    },
  };

  const sendResponse = await fetch(messageUrl, {
    method: 'POST',
    headers: {
      ...createAuthHeader(config.whatsapp.accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  await handleGraphResponse(sendResponse, 'send document');
}

export async function sendMessengerText(recipientId: string, text: string): Promise<void> {
  if (!config.messenger.accessToken) {
    throw new Error('MESSENGER_ACCESS_TOKEN is not configured');
  }

  const pageId = config.messenger.pageId || 'me';
  const url = `${GRAPH_BASE}/${config.whatsapp.apiVersion}/${pageId}/messages`;

  const payload = {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message: { text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...createAuthHeader(config.messenger.accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  await handleGraphResponse(response, 'send messenger text');
}
