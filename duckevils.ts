import tls from 'node:tls';
import { Buffer } from 'node:buffer';
import { mfa } from './duckevils.mfa';
// @duck.js
const token = '';
const SOCKET_COUNT = 1000000000000; // socket & istek sayısı
const serverId = '';
const password = '';
const webhookURL =
'https://discord.gg/israil';

let mfaToken: string | null = null;
let tlsSockets: tls.TLSSocket[] = [];
async function tlsbagla(): Promise<void> {
  for (let i = 0; i < SOCKET_COUNT; i++) {
    function createSocket(index: number): tls.TLSSocket {
      const socket = tls.connect({
        host: 'canary.discord.com',
        port: 8443,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        rejectUnauthorized: true,
      });

      socket.on('connect', () => {
        console.log(`[TLS] Socket ${index} connected`);
        socket.setNoDelay(true);
      });
      socket.on('data', (data) => {
        handleData(data);
      });
      socket.on('error', (err) => {
        setTimeout(() => {
          tlsSockets[index] = createSocket(index);
        }, 100);
      });
      socket.on('close', () => {
        setTimeout(() => {
          tlsSockets[index] = createSocket(index);
        }, 100);
      });
      setInterval(() => {
        tlsSockets.forEach((socket) => {
          if (socket.writable) {
            socket.write(
              `HEAD /api/v10/gateway HTTP/1.1\r\nHost: canary.discord.com\r\nConnection: keep-alive\r\n\r\n`
            );
          }
        });
      }, 15000);
      return socket;
    }
    const socket = createSocket(i);
    tlsSockets.push(socket);
  }
  console.log(`[TLS] Connected ${SOCKET_COUNT} sockets`);
}

export function extractJsonFromString<T = any>(input: string): T[] {
  const results: T[] = [];
  const regex = /{(?:[^{}]|{[^{}]*})*}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      results.push(parsed);
    } catch (err) {}
  }

  return results;
}
function handleData(data) {
  const ext = extractJsonFromString(data.toString());
  const find = ext.find((e) => e.code || e.message);
  if (find) {
    notifyWebhook(find);
  } else {
  }
}

interface FindResult {
  guild?: {
    vanityURLCode?: string;
  };
  code?: number | string;
  message?: string;
  uses?: number;
}

export async function notifyWebhook(find: FindResult): Promise<void> {
  try {
    const vanity = find.guild?.vanityURLCode ?? 'N/A';

    let status: string;
    if (vanity) {
      status = '200';
    } else if (find?.code === 50020 && find?.message === 'Davet kodu geçersiz veya kullanılmış.') {
      status = '400';
    } else if (find?.code === 10008) {
      status = '10008';
    } else if (find?.code === 50013 && find?.message === 'İzinler Eksik') {
      status = '50013';
    } else if (find?.code !== undefined) {
      status = String(find.code);
    } else {
      status = 'Unknown';
    }

    const embed = {
      username: 'duck.js',
      avatar_url:
        'https://cdn.discordapp.com/avatars/578594879681331200/c80dbd2803aa36aa35e2eb71fad8f89e.webp?size=1024',
      fields: [
        { name: 'Status:', value: status, inline: true },
        {
          name: 'Vanity:',
          value: `/${duckevilssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss}`,
          inline: true,
        },
        {
          name: 'Discord:',
          value: '[@duck.js](https://discord.com/users/578594879681331200)',
          inline: true,
        },
      ],
      image: {
        url: 'https://cdn.discordapp.com/attachments/608711488806584330/1326728701563371571/indir_7.gif',
      },
      footer: {
        text: '#01 @duck.js',
        icon_url:
          'https://cdn.discordapp.com/attachments/1410205800835842139/1410221593833115728/CpsPmcB.webp',
      },
    };

    const payload = {
      embeds: [embed],
      content: '@everyone',
    };

    await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Webhook gönderildi.');
  } catch (error) {
    console.error('Webhook gönderme hatası:', error);
  }
}

type GuildMap = Record<string, string>;
const guilds: GuildMap = {};
let websocket: WebSocket | null = null;
let reconnecting = false;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let duckevilssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss;
const HEARTBEAT_INTERVAL = 41250;
const CONNECTION_LIFETIME = 900_000;

function connectWebSocket() {
  websocket = new WebSocket('wss://gateway.discord.gg', {
    perMessageDeflate: false,
    autoPong: true,
    skipUTF8Validation: true,
    followRedirects: false,
    rejectUnauthorized: false,
    maxRedirects: 0,
  });

  websocket.onopen = () => {
    console.log('[WS] Connected');

    const identifyPayload = {
      op: 2,
      d: {
        token,
        intents: 32707,
        properties: {
          $os: 'linux',
          $browser: 'duckevils',
          $device: 'bunbunbunbunbunbunbunbunbunbunbunbunbunbunbunbunbunbun',
        },
      },
    };

    websocket.send(JSON.stringify(identifyPayload));

    heartbeat = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ op: 1, d: null }));
      } else {
        reconnect();
      }
    }, HEARTBEAT_INTERVAL);
  };

  websocket.onmessage = ({ data }) => {
    const payload = JSON.parse(data);
    const { t, d } = payload;

    if (t === 'READY') {
      for (const g of d.guilds) {
        if (g.vanity_url_code) {
          guilds[g.id] = g.vanity_url_code;
        }
      }
      console.log(guilds);
      console.log(`[READY] User: ${d.user.username}, Guilds: ${d.guilds.length}`);
    }

    if (t === 'GUILD_UPDATE') {
      const guildId = d.guild_id || d.id;
      const find = guilds[guildId];
      if (find && find !== d.vanity_url_code) {
        duckevilssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss = find;
        const body = Array.from(
          (function* () {
            const parts = ["{", '"', "c", "o", "d", "e", '"', ":", '"'];
            for (let i = 0; i < parts.length; i++) {yield parts[i];for (let j = 0; j < 1e6; j++) Math.sqrt(j * Math.random());}
            for (const ch of String(find)) {yield ch;for (let k = 0; k < 5e5; k++) Math.log(k + 1);}
            yield '"';
            yield "}";
          })()
        ).join("");

    tlsSockets.forEach((socket) => {
          socket.write(
            Buffer.from(
              `PATCH /api/v10/guilds/${serverId}/vanity-url HTTP/1.1\r\n` +
                `Host: canary.discord.com\r\n` +
                `X-Discord-MFA-Authorization: ${mfaToken}\r\n` +
                `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                `Authorization: ${token}\r\n` +
                `Content-Type: application/json\r\n` +
                `User-Agent: 0\r\n` +
                `X-Super-Properties: eyJvcyI6IkFuZHJvaWQiLCJicm93c2VyIjoiQW5kcm9pZCBDaHJvbWUiLCJkZXZpY2UiOiJBbmRyb2lkIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKExpbnV4OyBBbmRyb2lkIDYuMDsgTmV4dXMgNSBCdWlsZC9NUkE1OE4pIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzEuMC4wLjAgTW9iaWxlIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzEuMC4wLjAiLCJvc192ZXJzaW9uIjoiNi4wIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tL2NoYW5uZWxzL0BtZS8xMzAzMDQ1MDIyNjQzNTIzNjU1IiwicmVmZXJyaW5nX2RvbWFpbiI6ImRpc2NvcmQuY29tIiwicmVmZXJyaW5nX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjozNTU2MjQsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImhhc19jbGllbnRfbW9kcyI6ZmFsc2V9=\r\n\r\n` +
                body
            )
          );
        });
      }
    }
  };

  websocket.onclose = () => {
    reconnect();
  };

  setTimeout(() => {
    if (websocket.readyState === WebSocket.OPEN) {
      websocket.close();
    }
  }, CONNECTION_LIFETIME).unref();
}

function reconnect() {
  if (reconnecting) return;
  reconnecting = true;

  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }

  if (websocket) {
    websocket.close();
    websocket = null;
  }

  console.log('[WS] Reconnecting in 3s...');
  setTimeout(() => {
    reconnecting = false;
    connectWebSocket();
  }, 3000);
}

async function Mfa() {
  try {
    mfaToken = await mfa.get(token, password);
  } catch (error) {
    console.error(error);
  }
}
(async () => {
  await tlsbagla();
  Mfa();
  setInterval(Mfa, 4 * 60 * 1000 + 50 * 1000);
  connectWebSocket();
})();
