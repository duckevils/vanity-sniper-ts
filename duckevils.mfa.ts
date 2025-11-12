import http2 from 'node:http2';
import tls from 'node:tls';
import { Buffer } from 'node:buffer';

const CUSTOM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x32) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9164 Chrome/124.0.6367.243 Electron/30.2.0 Safari/537.36',
  'X-Super-Properties':
    'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC45MTY0Iiwib3NfdmVyc2lvbiI6IjEwLjAuMjI2MzEiLCJvc19hcmNoIjoieDY0IiwiYXBwX2FyY2giOiJ4NjQiLCJzeXN0ZW1fbG9jYWxlIjoidHIiLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBkaXNjb3JkLzEuMC45MTY0IENocm9tZS8xMjQuMC42MzY3LjI0MyBFbGVjdHJvbi8zMC4yLjAgU2FmYXJpLzUzNy4zNiIsImJyb3dzZXJfdmVyc2lvbiI6IjMwLjIuMCIsIm9zX3Nka192ZXJzaW9uIjoiMjI2MzEiLCJjbGllbnRfdnVibF9udW1iZXIiOjUyODI2LCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ==',
  'X-Discord-Timezone': 'Europe/Istanbul',
  'X-Discord-Locale': 'en-US',
  'X-Debug-Options': 'bugReporterEnabled',
  'Content-Type': 'application/json',
  Priority: 'u=1, i',
  'Sec-CH-UA': `"Not)A;Brand";v="8", "Chromium";v="138"`,
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': `"Windows"`,
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  Connection: 'keep-alive',
};

class MFAClient {
  private session: http2.ClientHttp2Session | null = null;
  private connecting = false;

  constructor() {
    this.createSession();
  }

  private createSession() {
    if (this.connecting) return;

    this.connecting = true;

    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.session = http2.connect('https://canary.discord.com', {
      settings: {
        enablePush: false,
        noDelay: true,
        keepAlive: true,
        rejectUnauthorized: false,
        zeroRtt: true,
        handshakeTimeout: 0,
      },
      secureContext: tls.createSecureContext({ ciphers: 'ECDHE-RSA-AES128-GCM-SHA256' }),
    });

    this.session.on('error', (err) => {
      console.error('[Session] Error:', err);
      this.connecting = false;
      setTimeout(() => this.createSession(), 3000);
    });

    this.session.on('connect', () => {
      this.connecting = false;
    });

    this.session.on('close', () => {
      console.log('[Session] Closed');
      this.connecting = false;
      setTimeout(() => this.createSession(), 3000);
    });
  }

  private request(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.session || this.session.destroyed) {
        return reject(new Error('HTTP/2 session not ready.'));
      }
      const customHeaders = {
        ...CUSTOM_HEADERS,
        ...headers,
      };
      const stream = this.session.request({
        ':method': method,
        ':path': path,
        ':authority': 'canary.discord.com',
        ...headers,
        ...customHeaders,
      });

      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
      stream.on('error', reject);

      if (body) stream.end(body);
      else stream.end();
    });
  }

  public async get(token: string, password: string): Promise<string | null> {
    try {
      const authHeaders = {
        Authorization: token,
        'Content-Type': 'application/json',
      };
      const initialResponse = await this.request(
        'PATCH',
        '/api/v10/guilds/0/vanity-url',
        authHeaders,
        JSON.stringify({ code: '' })
      );

      if (!initialResponse || initialResponse.trim() === '') {
        console.error('[MFA] Empty response received');
        return null;
      }

      let data: any;
      try {
        data = JSON.parse(initialResponse);
      } catch (err) {
        return null;
      }

      if (!data) {
        return null;
      }

      if (data.code === 60003) {
        const ticket = data.mfa?.ticket;
        if (!ticket) {
          return null;
        }

        const mfaBody = JSON.stringify({
          ticket,
          mfa_type: 'password',
          data: password,
        });

        const mfaResponse = await this.request('POST', '/api/v10/mfa/finish', authHeaders, mfaBody);

        if (!mfaResponse || mfaResponse.trim() === '') {
          return null;
        }

        let mfaJson: any;
        try {
          mfaJson = JSON.parse(mfaResponse);
        } catch (err) {
          return null;
        }

        if (mfaJson.token) {
          console.log('[+] MFA verified');
          return mfaJson.token;
        }

        console.warn('[-]', mfaJson);
        return null;
      }

      return null;
    } catch (err) {
      return null;
    }
  }
}

export const mfa = new MFAClient();
