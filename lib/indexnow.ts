// IndexNow integration for PoultryMarket Kenya
// Notifies search engines (Bing, Yandex, Naver, Seznam, etc.) about URL changes
// so they can be crawled and indexed quickly.
//
// Docs: https://www.indexnow.org/documentation
import { SITE_URL } from '@/lib/seo';

// The IndexNow API key. This MUST match the key file hosted at the site root:
//   https://www.poultrymarket.app/5a20dd3f46e243ca8db1181a0d0253f6.txt
export const INDEXNOW_KEY = '5a20dd3f46e243ca8db1181a0d0253f6';

// Public location where search engines verify ownership of the key.
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

// IndexNow submission endpoint. api.indexnow.org forwards to all participating engines.
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export type IndexNowAction = 'created' | 'updated' | 'deleted';

export interface IndexNowResult {
  ok: boolean;
  status: number;
  statusText: string;
  message: string;
  submitted: number;
}

const STATUS_MESSAGES: Record<number, string> = {
  200: 'URLs submitted successfully.',
  202: 'URLs received. Key validation pending.',
  400: 'Bad request — invalid request format.',
  403: 'Forbidden — key not valid (key not found, or key file does not contain the key).',
  422: 'Unprocessable Entity — URLs do not belong to the host or key does not match the schema.',
  429: 'Too Many Requests — potential spam, slow down.',
};

/**
 * Submit one or more URLs to IndexNow.
 *
 * @param urls Absolute URLs (must belong to SITE_URL host).
 * @param action Optional content action hint for the URLs.
 */
export async function submitToIndexNow(
  urls: string | string[],
  action?: IndexNowAction,
): Promise<IndexNowResult> {
  const urlList = (Array.isArray(urls) ? urls : [urls])
    .map((u) => u.trim())
    .filter(Boolean);

  if (urlList.length === 0) {
    return {
      ok: false,
      status: 0,
      statusText: 'No URLs',
      message: 'No URLs provided to submit.',
      submitted: 0,
    };
  }

  // IndexNow accepts a maximum of 10,000 URLs per request.
  if (urlList.length > 10000) {
    return {
      ok: false,
      status: 0,
      statusText: 'Too many URLs',
      message: 'IndexNow accepts a maximum of 10,000 URLs per request.',
      submitted: 0,
    };
  }

  const host = new URL(SITE_URL).host;

  const payload: Record<string, unknown> = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };

  if (action) {
    // contentTags is an optional array aligned with urlList.
    payload.contentTags = urlList.map(() => ({ type: action }));
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const ok = response.status === 200 || response.status === 202;

    return {
      ok,
      status: response.status,
      statusText: response.statusText,
      message:
        STATUS_MESSAGES[response.status] ||
        `Unexpected response (${response.status}).`,
      submitted: ok ? urlList.length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      message:
        error instanceof Error
          ? `Failed to reach IndexNow: ${error.message}`
          : 'Failed to reach IndexNow.',
      submitted: 0,
    };
  }
}

/**
 * Convenience helper: build an absolute URL from a path and submit it.
 */
export async function submitPathToIndexNow(
  path: string | string[],
  action?: IndexNowAction,
): Promise<IndexNowResult> {
  const paths = Array.isArray(path) ? path : [path];
  const urls = paths.map((p) =>
    p.startsWith('http') ? p : `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`,
  );
  return submitToIndexNow(urls, action);
}
