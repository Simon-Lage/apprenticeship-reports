import { randomBytes } from 'node:crypto';

import { SaveIhkOselgbWeeklyReportInput } from '@/shared/ihk/ihk-oselgb';

const BASE_URL = 'https://www.bildung-ihk-oselgb.de';
const PORTAL_PATH = '/tibrosBB';
const LOGIN_PAGE = `${BASE_URL}${PORTAL_PATH}/BB_auszubildende.jsp`;
const LOGIN_URL = `${BASE_URL}${PORTAL_PATH}/azubiHome.jsp`;
const DEFAULT_CONTRACT_ID = '11';

const CHROME_NAVIGATION_HEADERS: Record<string, string> = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'cache-control': 'max-age=0',
  'sec-ch-ua':
    '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

type CookieRecord = {
  name: string;
  path: string;
  value: string;
};

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

type IhkOselgbPortalCredentials = {
  login: string;
  password: string;
};

type IhkRequestOptions = {
  body?: string | URLSearchParams;
  method?: string;
  headers?: Record<string, string>;
};

type WeeklyReportFormPage = {
  html: string;
  loggedIn: boolean;
  location: string | null;
  status: number;
  token: string | null;
};

function defaultCookiePath(url: string): string {
  const { pathname } = new URL(url);
  const lastSlashIndex = pathname.lastIndexOf('/');

  return lastSlashIndex > 0 ? pathname.slice(0, lastSlashIndex) : '/';
}

function readSetCookieHeaders(headers: Headers): string[] {
  const { getSetCookie } = headers as HeadersWithSetCookie;

  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers);
  }

  const header = headers.get('set-cookie');
  return header ? [header] : [];
}

function resolvePortalUrl(location: string): string {
  return new URL(location, `${BASE_URL}${PORTAL_PATH}/`).toString();
}

function isLoggedInHtml(html: string): boolean {
  return html.includes('logout.jsp') && !html.includes('name="pass"');
}

function extractToken(html: string): string | null {
  const inputMatches = html.match(/<input\b[^>]*>/gi) || [];
  const tokenInput = inputMatches.find((input) =>
    /\bname\s*=\s*["']?token["']?/i.test(input),
  );

  if (tokenInput) {
    const valueMatch = tokenInput.match(
      /\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );

    return valueMatch?.[1] || valueMatch?.[2] || valueMatch?.[3] || null;
  }

  const textareaMatch = html.match(
    /<textarea\b[^>]*\bname\s*=\s*["']?token["']?[^>]*>([^<]*)/i,
  );
  return textareaMatch?.[1]?.trim() || null;
}

function toPortalDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function createWeeklyReportFields(input: {
  token: string;
  weekStart: string;
  weekEnd: string;
  area: string;
  supervisorEmail: string;
  workText: string;
  trainingText: string;
  schoolText: string;
}): Array<[string, string]> {
  return [
    ['token', input.token],
    ['lfdnr', '0'],
    ['edtvon', toPortalDate(input.weekStart)],
    ['edtbis', toPortalDate(input.weekEnd)],
    ['ausbabschnitt', input.area],
    ['ausbabschnitt', ''],
    ['ausbMail', input.supervisorEmail],
    ['ausbMail2', input.supervisorEmail],
    ['ausbinhalt1', input.workText],
    ['stdMo', '0'],
    ['stdDi', '0'],
    ['stdMi', '0'],
    ['stdDo', '0'],
    ['stdFr', '0'],
    ['stdSa', '0'],
    ['stdSo', '0'],
    ['ausbinhalt2', input.trainingText],
    ['ausbinhalt12', 'null'],
    ['ausbinhalt3', input.schoolText],
    ['ausbinhalt13', 'null'],
    ['save', ''],
  ];
}

function buildMultipartBody(fields: Array<[string, string]>): {
  boundary: string;
  body: string;
  contentLength: number;
} {
  const boundary = `----WebKitFormBoundary${randomBytes(12)
    .toString('base64url')
    .slice(0, 16)}`;
  const fieldParts = fields.map(
    ([name, value]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
  );
  const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename=""\r\nContent-Type: application/octet-stream\r\n\r\n\r\n`;
  const endPart = `--${boundary}--\r\n`;

  const body = [...fieldParts, filePart, endPart].join('');

  return { body, boundary, contentLength: Buffer.byteLength(body, 'utf8') };
}

export default class IhkOselgbPortalClient {
  private readonly cookieJar: CookieRecord[] = [];

  private readonly credentials: IhkOselgbPortalCredentials;

  constructor(credentials: IhkOselgbPortalCredentials) {
    this.credentials = credentials;
  }

  async saveWeeklyReport(input: SaveIhkOselgbWeeklyReportInput): Promise<void> {
    await this.login();

    const formPage = await this.openNewWeeklyReportForm();

    if (!formPage.loggedIn) {
      const location = formPage.location
        ? ` Location: ${formPage.location}`
        : '';
      throw new Error(
        `IHK weekly report form is unauthenticated with HTTP ${formPage.status}.${location}`,
      );
    }

    if (!formPage.token) {
      throw new Error('IHK weekly report form token missing.');
    }

    const fields = createWeeklyReportFields({
      token: formPage.token,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      area: input.area,
      supervisorEmail: input.supervisorEmail,
      workText: input.workText,
      trainingText: input.trainingText,
      schoolText: input.schoolText,
    });
    const { body, boundary, contentLength } = buildMultipartBody(fields);
    const response = await this.request(
      `${BASE_URL}${PORTAL_PATH}/azubiHeftAdd.jsp`,
      {
        method: 'POST',
        body,
        headers: {
          ...CHROME_NAVIGATION_HEADERS,
          'content-length': String(contentLength),
          'content-type': `multipart/form-data; boundary=${boundary}`,
          origin: BASE_URL,
          referer: `${BASE_URL}${PORTAL_PATH}/azubiHeftEditForm.jsp`,
        },
      },
    );

    if (response.status !== 302 && !response.ok) {
      throw new Error(
        `IHK weekly report save failed with HTTP ${response.status}.`,
      );
    }
  }

  private async login(): Promise<void> {
    const initialResponse = await this.request(LOGIN_PAGE, {
      headers: CHROME_NAVIGATION_HEADERS,
    });

    if (!initialResponse.ok) {
      throw new Error(
        `IHK login page failed with HTTP ${initialResponse.status}.`,
      );
    }

    const loginResponse = await this.request(LOGIN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        login: this.credentials.login,
        pass: this.credentials.password,
        anmelden: '',
        old_url: 'null',
      }),
      headers: {
        ...CHROME_NAVIGATION_HEADERS,
        'content-type': 'application/x-www-form-urlencoded',
        origin: BASE_URL,
        referer: LOGIN_PAGE,
      },
    });
    const html = await loginResponse.text();

    if (!loginResponse.ok || !isLoggedInHtml(html)) {
      throw new Error(`IHK login failed with HTTP ${loginResponse.status}.`);
    }
  }

  private async openNewWeeklyReportForm(): Promise<WeeklyReportFormPage> {
    const reportsUrl = this.weeklyReportsUrl();

    await this.request(reportsUrl, {
      headers: CHROME_NAVIGATION_HEADERS,
    });

    let response = await this.request(
      `${BASE_URL}${PORTAL_PATH}/azubiHeftEditForm.jsp`,
      {
        method: 'POST',
        body: new URLSearchParams({ neu: '' }),
        headers: {
          ...CHROME_NAVIGATION_HEADERS,
          'content-type': 'application/x-www-form-urlencoded',
          origin: BASE_URL,
          referer: reportsUrl,
        },
      },
    );

    const redirectLocation = response.headers.get('location');
    if (response.status === 302 && redirectLocation) {
      response = await this.request(resolvePortalUrl(redirectLocation), {
        headers: {
          ...CHROME_NAVIGATION_HEADERS,
          referer: `${BASE_URL}${PORTAL_PATH}/azubiHeftEditForm.jsp`,
        },
      });
    }

    const html = await response.text();

    return {
      html,
      loggedIn: response.ok && isLoggedInHtml(html),
      location: redirectLocation,
      status: response.status,
      token: extractToken(html),
    };
  }

  private weeklyReportsUrl(contractId = DEFAULT_CONTRACT_ID): string {
    return `${BASE_URL}${PORTAL_PATH}/azubiHeft.jsp?azubvtrg=${encodeURIComponent(contractId)}`;
  }

  private async request(
    url: string,
    options: IhkRequestOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      ...options.headers,
    };
    const cookies = this.cookieHeader(url);

    if (cookies) {
      headers.cookie = cookies;
    }

    const response = await fetch(url, {
      redirect: 'manual',
      ...options,
      headers,
    });

    this.rememberCookies(readSetCookieHeaders(response.headers), url);
    return response;
  }

  private rememberCookies(
    setCookieHeaders: string[],
    requestUrl: string,
  ): void {
    setCookieHeaders.forEach((header) => {
      const [pair, ...attributes] = header.split(';');
      const separator = pair.indexOf('=');

      if (separator <= 0) {
        return;
      }

      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const pathAttribute = attributes.find((attribute) =>
        attribute.trim().toLowerCase().startsWith('path='),
      );
      const path = pathAttribute
        ? pathAttribute.trim().slice('path='.length)
        : defaultCookiePath(requestUrl);
      const existingCookie = this.cookieJar.find(
        (cookie) => cookie.name === name && cookie.path === path,
      );

      if (existingCookie) {
        existingCookie.value = value;
        return;
      }

      this.cookieJar.push({ name, path, value });
    });
  }

  private cookieHeader(url: string): string {
    const { pathname } = new URL(url);

    return this.cookieJar
      .filter((cookie) => pathname.startsWith(cookie.path))
      .sort((left, right) => right.path.length - left.path.length)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }
}
