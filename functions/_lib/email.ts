export interface EmailEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  mimeType?: string;
}

export interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  from?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';

const encodeBase64 = (input: string) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }

  const textEncoder = new TextEncoder();
  const bytes = textEncoder.encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const btoaFn = (globalThis as any)?.btoa as ((data: string) => string) | undefined;
  if (typeof btoaFn === 'function') {
    return btoaFn(binary);
  }

  throw new Error('Base64 encoding is not supported in this environment.');
};

interface ResendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    mime_type?: string;
  }>;
}

const buildResendPayload = (env: EmailEnv, request: EmailRequest): ResendPayload => {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email configuration error: RESEND_API_KEY is missing.');
  }

  const from = request.from || env.EMAIL_FROM;
  if (!from) {
    throw new Error('Email configuration error: EMAIL_FROM is missing.');
  }

  const payload: ResendPayload = {
    from,
    to: request.to,
    subject: request.subject,
    html: request.html,
  };

  if (request.text) {
    payload.text = request.text;
  }

  if (request.attachments && request.attachments.length > 0) {
    payload.attachments = request.attachments.map((attachment) => ({
      filename: attachment.filename,
      content: encodeBase64(attachment.content),
      mime_type: attachment.mimeType,
    }));
  }

  return payload;
};

export const sendEmail = async (env: EmailEnv, request: EmailRequest) => {
  const apiKey = env.RESEND_API_KEY;
  const payload = buildResendPayload(env, request);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Email provider responded with status ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMessage += `: ${errorBody.error}`;
        }
      } catch {
        // ignore body parse errors
      }
      throw new Error(errorMessage);
    }

    return await response.json().catch(() => undefined);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error while sending email.');
  }
};
