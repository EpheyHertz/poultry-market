/**
 * trackSearchClick — client-side click telemetry helper (§9, §12.7).
 *
 * Fire-and-forget POST to /api/blog/search/click. Attribution requires a
 * search context: either the `queryId` from the search envelope (preferred)
 * or the raw `query` string as fallback. When neither exists (e.g. related
 * posts on an article page reached without a prior search) the call is
 * skipped — there is nothing to attribute against.
 *
 * Telemetry must never break or block the UI: all failures are swallowed.
 */

export type ClickSource = 'results' | 'related' | 'didYouMean';

export interface TrackClickPayload {
  /** search_queries row id from the envelope (preferred attribution key) */
  queryId?: string;
  /** raw query fallback — resolves the newest matching search row */
  query?: string;
  postId: string;
  source: ClickSource;
  /** 0-based position in the results list */
  position?: number;
  /** ms between results render and the click */
  timeToClickMs?: number;
}

/** Max timeToClickMs accepted by the API (1 hour). */
const MAX_TIME_TO_CLICK_MS = 3_600_000;

export function trackSearchClick(payload: TrackClickPayload): void {
  if (typeof window === 'undefined') return;
  // Nothing to attribute against — skip silently.
  if (!payload.queryId && !payload.query) return;
  if (!payload.postId) return;

  const body: Record<string, unknown> = {
    postId: payload.postId,
    source: payload.source,
  };
  if (payload.queryId) body.queryId = payload.queryId;
  if (payload.query) body.query = payload.query;
  if (typeof payload.position === 'number') body.position = payload.position;
  if (typeof payload.timeToClickMs === 'number' && payload.timeToClickMs >= 0) {
    body.timeToClickMs = Math.min(Math.floor(payload.timeToClickMs), MAX_TIME_TO_CLICK_MS);
  }

  try {
    void fetch('/api/blog/search/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      /* telemetry is fire-and-forget */
    });
  } catch {
    // Never let telemetry break the UI.
  }
}
