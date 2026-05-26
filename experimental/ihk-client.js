const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const BASE_URL = 'https://www.bildung-ihk-oselgb.de';
const PORTAL_PATH = '/tibrosBB';
const LOGIN_PAGE = `${BASE_URL}${PORTAL_PATH}/BB_auszubildende.jsp`;
const LOGIN_URL = `${BASE_URL}${PORTAL_PATH}/azubiHome.jsp`;
const COOKIE_FILE = path.join(__dirname, 'data', 'cookies.json');
const LAST_FORM_FILE = path.join(__dirname, 'data', 'last-weekly-form.html');
const DEFAULT_CONTRACT_ID = '11';
const CHROME_NAVIGATION_HEADERS = {
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

const cookieJar = [];

async function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');

  try {
    const content = await fs.readFile(envPath, 'utf8');

    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const separator = trimmed.indexOf('=');
      if (separator <= 0) {
        return;
      }

      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1);

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function getCredentials() {
  await loadEnvLocal();

  const username = process.env.IHK_AZUBI_LOGIN || process.env.AZUBI_IDENT_NR;
  const password = process.env.IHK_AZUBI_PASSWORD || process.env.IHK_AZUBI_PASS;

  if (!username || !password) {
    throw new Error(
      'Missing env vars. Set IHK_AZUBI_LOGIN (or AZUBI_IDENT_NR) and IHK_AZUBI_PASSWORD.',
    );
  }

  return { login: username, password };
}

function defaultCookiePath(url) {
  const { pathname } = new URL(url);
  const lastSlashIndex = pathname.lastIndexOf('/');

  return lastSlashIndex > 0 ? pathname.slice(0, lastSlashIndex) : '/';
}

function rememberCookies(setCookieHeaders, requestUrl) {
  setCookieHeaders.forEach((header) => {
    const [pair, ...attributes] = header.split(';');
    const separator = pair.indexOf('=');

    if (separator > 0) {
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const pathAttribute = attributes.find((attribute) =>
        attribute.trim().toLowerCase().startsWith('path='),
      );
      const cookiePath = pathAttribute
        ? pathAttribute.trim().slice('path='.length)
        : defaultCookiePath(requestUrl);
      const existingCookie = cookieJar.find(
        (cookie) => cookie.name === name && cookie.path === cookiePath,
      );

      if (existingCookie) {
        existingCookie.value = value;
        return;
      }

      cookieJar.push({ name, path: cookiePath, value });
    }
  });
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const header = headers.get('set-cookie');
  return header ? [header] : [];
}

function cookieHeader(url) {
  const { pathname } = new URL(url);

  return cookieJar
    .filter((cookie) => pathname.startsWith(cookie.path))
    .sort((left, right) => right.path.length - left.path.length)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

async function loadCookies() {
  try {
    const content = await fs.readFile(COOKIE_FILE, 'utf8');
    const cookies = JSON.parse(content);

    if (Array.isArray(cookies)) {
      cookies.forEach((cookie) => {
        if (cookie.name && cookie.value) {
          cookieJar.push({
            name: String(cookie.name),
            path: String(cookie.path || '/'),
            value: String(cookie.value),
          });
        }
      });
      return;
    }

    Object.entries(cookies).forEach(([name, value]) => {
      cookieJar.push({ name, path: '/', value: String(value) });
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function saveCookies() {
  await fs.mkdir(path.dirname(COOKIE_FILE), { recursive: true });
  await fs.writeFile(COOKIE_FILE, JSON.stringify(cookieJar, null, 2), 'utf8');
}

async function request(url, options = {}) {
  const headers = {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    ...options.headers,
  };

  const cookies = cookieHeader(url);
  if (cookies) {
    headers.cookie = cookies;
  }

  const response = await fetch(url, {
    redirect: 'manual',
    ...options,
    headers,
  });

  rememberCookies(readSetCookieHeaders(response.headers), url);
  return response;
}

function resolvePortalUrl(location) {
  return new URL(location, `${BASE_URL}${PORTAL_PATH}/`).toString();
}

function isLoggedInHtml(html) {
  return html.includes('logout.jsp') && !html.includes('name="pass"');
}

async function login() {
  const credentials = await getCredentials();

  const initialResponse = await request(LOGIN_PAGE, {
    headers: {
      ...CHROME_NAVIGATION_HEADERS,
    },
  });

  if (!initialResponse.ok) {
    throw new Error(`Login page failed with HTTP ${initialResponse.status}`);
  }

  const loginResponse = await request(LOGIN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      login: credentials.login,
      pass: credentials.password,
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
  await saveCookies();

  if (!loginResponse.ok || !isLoggedInHtml(html)) {
    throw new Error(`Login failed with HTTP ${loginResponse.status}`);
  }

  return { status: loginResponse.status };
}

async function withLoginRetry(operation) {
  await loadEnvLocal();
  await loadCookies();

  const firstResult = await operation();

  if (firstResult.loggedIn) {
    await saveCookies();
    return firstResult;
  }

  let loginResult;
  try {
    loginResult = await login();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Session expired, login retry failed. First request HTTP ${firstResult.status}. ${message}`,
    );
  }

  const retryResult = await operation();
  await saveCookies();

  if (!retryResult.loggedIn) {
    const location = retryResult.location
      ? ` Location: ${retryResult.location}.`
      : '';

    throw new Error(
      `Session expired, login retry succeeded with HTTP ${loginResult.status}, but the retried request is still unauthenticated with HTTP ${retryResult.status}.${location}`,
    );
  }

  return retryResult;
}

function htmlDecode(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractField(html, label) {
  const pattern = new RegExp(
    `${label}:\\s*</div><div class=['"]col-md-8['"]>([\\s\\S]*?)</div>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? htmlDecode(match[1]) : null;
}

function parseWeeklyReports(html) {
  return html
    .split("<div class=' reihe'>")
    .slice(1)
    .map((chunk) => {
      const editMatch = chunk.match(/azubiHeftEditForm\.jsp\?lfdnr=(\d+)/);

      return {
        id: editMatch?.[1] ?? null,
        period: extractField(chunk, 'Zeitraum'),
        department: extractField(chunk, 'Ausbildungsabschnitt/-abteilung'),
        supervisorEmail: extractField(chunk, 'Betreuer'),
        status: extractField(chunk, 'Status'),
      };
    })
    .filter((report) => report.period);
}

function weeklyReportsUrl(
  contractId = process.env.IHK_CONTRACT_ID || DEFAULT_CONTRACT_ID,
) {
  const contractQuery = contractId
    ? `?azubvtrg=${encodeURIComponent(contractId)}`
    : '';

  return `${BASE_URL}${PORTAL_PATH}/azubiHeft.jsp${contractQuery}`;
}

async function getWeeklyReports(
  contractId = process.env.IHK_CONTRACT_ID || DEFAULT_CONTRACT_ID,
) {
  const url = weeklyReportsUrl(contractId);

  const result = await withLoginRetry(async () => {
    const response = await request(url, {
      headers: {
        ...CHROME_NAVIGATION_HEADERS,
      },
    });
    const html = await response.text();

    return {
      loggedIn: response.ok && isLoggedInHtml(html),
      reports: parseWeeklyReports(html),
      status: response.status,
    };
  });

  return result.reports;
}

async function openWeeklyReportsPage(
  contractId = process.env.IHK_CONTRACT_ID || DEFAULT_CONTRACT_ID,
) {
  return request(weeklyReportsUrl(contractId), {
    headers: {
      ...CHROME_NAVIGATION_HEADERS,
    },
  });
}

function extractToken(html) {
  const inputMatches = html.match(/<input\b[^>]*>/gi) || [];
  const tokenInput = inputMatches.find((input) =>
    /\bname\s*=\s*["']?token["']?/i.test(input),
  );

  if (tokenInput) {
    const valueMatch = tokenInput.match(
      /\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );

    return valueMatch?.[1] || valueMatch?.[2] || valueMatch?.[3] || '';
  }

  const textareaMatch = html.match(
    /<textarea\b[^>]*\bname\s*=\s*["']?token["']?[^>]*>([^<]*)/i,
  );
  return textareaMatch?.[1]?.trim() || null;
}

async function saveLastFormHtml(html) {
  await fs.mkdir(path.dirname(LAST_FORM_FILE), { recursive: true });
  await fs.writeFile(LAST_FORM_FILE, html, 'utf8');
}

async function openNewWeeklyReportForm() {
  const contractId = process.env.IHK_CONTRACT_ID || DEFAULT_CONTRACT_ID;
  const reportsUrl = weeklyReportsUrl(contractId);

  await openWeeklyReportsPage(contractId);

  let response = await request(
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
    response = await request(resolvePortalUrl(redirectLocation), {
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

function createWeeklyReportFields(input) {
  return [
    ['token', input.token],
    ['lfdnr', '0'],
    ['edtvon', input.weekStart],
    ['edtbis', input.weekEnd],
    ['ausbabschnitt', input.department],
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

function buildMultipartBody(fields) {
  const boundary = `----WebKitFormBoundary${crypto
    .randomBytes(12)
    .toString('base64url')
    .slice(0, 16)}`;
  const fieldParts = fields.map(
    ([name, value]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
  );
  const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename=""\r\nContent-Type: application/octet-stream\r\n\r\n\r\n`;
  const endPart = `--${boundary}--\r\n`;
  const body = Buffer.from([...fieldParts, filePart, endPart].join(''), 'utf8');

  return { body, boundary };
}

async function saveWeeklyReport(input) {
  return withLoginRetry(async () => {
    const formPage = await openNewWeeklyReportForm();

    if (formPage.status >= 500) {
      await saveLastFormHtml(formPage.html);
      throw new Error(
        `Weekly report form failed with HTTP ${formPage.status}. Saved ${LAST_FORM_FILE}`,
      );
    }

    if (!formPage.loggedIn) {
      await saveLastFormHtml(formPage.html);
      return {
        loggedIn: false,
        location: formPage.location,
        status: formPage.status,
      };
    }

    if (!formPage.token) {
      await saveLastFormHtml(formPage.html);
      throw new Error(
        `Could not find weekly report form token. Saved ${LAST_FORM_FILE}`,
      );
    }

    const fields = createWeeklyReportFields({
      token: formPage.token,
      ...input,
    });
    const { body, boundary } = buildMultipartBody(fields);

    const response = await request(
      `${BASE_URL}${PORTAL_PATH}/azubiHeftAdd.jsp`,
      {
        method: 'POST',
        body,
        headers: {
          ...CHROME_NAVIGATION_HEADERS,
          'content-length': String(body.length),
          'content-type': `multipart/form-data; boundary=${boundary}`,
          origin: BASE_URL,
          referer: `${BASE_URL}${PORTAL_PATH}/azubiHeftEditForm.jsp`,
        },
      },
    );

    if (response.status >= 500) {
      const html = await response.text();
      await saveLastFormHtml(html);
      throw new Error(
        `Weekly report save failed with HTTP ${response.status}. Saved ${LAST_FORM_FILE}`,
      );
    }

    return {
      loggedIn: response.status === 302 || response.ok,
      location: response.headers.get('location'),
      status: response.status,
    };
  });
}

module.exports = {
  COOKIE_FILE,
  getWeeklyReports,
  login,
  saveWeeklyReport,
};
