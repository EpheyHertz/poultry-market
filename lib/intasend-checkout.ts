/**
 * IntaSend Payment Button (InlineJS / WebSDK v4) — client-side helper.
 *
 * HOW THE PAYMENT BUTTON WORKS
 * ----------------------------
 * The documented IntaSend "Payment Button" (see skills/intasend/button-intasend.md)
 * is a plain element whose `data-*` attributes carry the checkout defaults, plus
 * the InlineJS SDK. At construction time the SDK:
 *
 *   1. runs `document.getElementsByClassName(element)` for the configured class,
 *   2. binds a `click` listener to each match,
 *   3. reads `btn.dataset` (all the `data-*` attributes) and POSTs it to
 *      `/api/v1/checkout/` with the publishable key,
 *   4. renders an IntaSend-hosted iframe modal where the customer picks a method
 *      (M-Pesa, card, bank — all of them are offered when `data-method` is blank).
 *
 * Because the SDK binds eagerly at construction, React must mount the button
 * FIRST and then attach from a `useEffect` (never render-on-attach). Each mount
 * uses a unique `element` class so the SDK never double-binds two listeners to
 * the same node.
 *
 * SECURITY MODEL
 * --------------
 * Everything sent from the DOM is attacker-controlled, so we do NOT trust the
 * button alone. Instead:
 *
 *   1. Our server creates a PENDING SupportTransaction that pins the amount,
 *      currency, api_ref (`support-{id}`) and the author's `wallet_id`.
 *   2. The API returns the publishable key + those fields so the button can be
 *      rendered, but the browser cannot change the amount or destination.
 *   3. Money is ONLY credited by the signed IntaSend webhook (challenge + amount
 *      check + idempotent credit); the client COMPLETE event only moves the UI.
 *
 * The SDK bundle is pinned to an exact version and guarded with subresource
 * integrity so a compromised CDN cannot inject a script into the payment page.
 */

const SDK_SRC = 'https://unpkg.com/intasend-inlinejs-sdk@4.0.0/build/intasend-inline.js';
const SDK_INTEGRITY = 'sha384-0wbkCp9uU6oi1xaDaWMUnQo4XfBnizgANO3x2LCMVSrr2D9uwOcr7I6MhzLu1LpR';
const SDK_SCRIPT_ID = 'intasend-inlinejs-sdk';

/** Payment states broadcast by the IntaSend checkout iframe. */
export type IntaSendState = 'COMPLETE' | 'FAILED' | 'IN-PROGRESS' | 'PENDING';

/** The modal element the SDK mounts on <body>. Needed to re-enable pointer events. */
export const INTASEND_MODAL_ELEMENT_ID = 'INTASEND-WEBSDK-MODAL-4';

/** Fields that can be passed to the Pay Button as `data-*` attributes. */
export interface IntaSendPayButtonPayload {
    amount?: number | string;
    currency?: string;
    api_ref?: string;
    wallet_id?: string;
    email?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    comment?: string;
    country?: string;
    method?: 'M-PESA' | 'CARD-PAYMENT' | 'BANK-PAYMENT';
    card_tarrif?: 'BUSINESS-PAYS' | 'CUSTOMER-PAYS';
    mobile_tarrif?: 'BUSINESS-PAYS' | 'CUSTOMER-PAYS';
    redirect_url?: string;
}

/** Drops empty values and stringifies the rest so they can be put in data-*. */
export function toIntaSendFields(payload: IntaSendPayButtonPayload): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null || value === '') continue;
        fields[key] = String(value);
    }
    return fields;
}

/** Converts a payload into `data-*` attributes spread onto the button element. */
export function toIntaSendDataAttributes(payload: IntaSendPayButtonPayload): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(toIntaSendFields(payload))) {
        attributes[`data-${key}`] = value;
    }
    return attributes;
}

interface IntaSendInstance {
    on: (event: IntaSendState, cb: (payload: unknown) => void) => IntaSendInstance;
    run: (payload: Record<string, string>) => IntaSendInstance;
    continue: (payload: { checkoutID: string; signature: string; live: boolean }) => IntaSendInstance;
    exitPay: () => void;
}

type IntaSendConstructor = new (options: {
    publicAPIKey?: string;
    live?: boolean;
    mode?: 'popup' | 'inline';
    element?: string;
    redirectURL?: string;
}) => IntaSendInstance;

declare global {
    interface Window {
        IntaSend?: IntaSendConstructor;
    }
}

let sdkPromise: Promise<IntaSendConstructor> | null = null;

/** Injects the IntaSend SDK once per page and resolves with the constructor. */
export function loadIntaSendSdk(): Promise<IntaSendConstructor> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('IntaSend SDK can only be loaded in the browser'));
    }

    if (window.IntaSend) {
        return Promise.resolve(window.IntaSend);
    }

    if (sdkPromise) {
        return sdkPromise;
    }

    sdkPromise = new Promise<IntaSendConstructor>((resolve, reject) => {
        const settle = () => {
            if (window.IntaSend) {
                resolve(window.IntaSend);
            } else {
                sdkPromise = null;
                reject(new Error('IntaSend SDK loaded but did not register'));
            }
        };

        const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', settle, { once: true });
            existing.addEventListener(
                'error',
                () => {
                    sdkPromise = null;
                    reject(new Error('Failed to load IntaSend SDK'));
                },
                { once: true }
            );
            return;
        }

        const script = document.createElement('script');
        script.id = SDK_SCRIPT_ID;
        script.src = SDK_SRC;
        script.integrity = SDK_INTEGRITY;
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = settle;
        script.onerror = () => {
            script.remove();
            sdkPromise = null;
            reject(new Error('Failed to load IntaSend SDK'));
        };
        document.head.appendChild(script);
    });

    return sdkPromise;
}

export interface AttachPayButtonOptions {
    /** Publishable key returned by our API (never hard-coded in the client). */
    publicApiKey: string;
    live: boolean;
    /** Unique class already present on a rendered button element in the DOM. */
    buttonClass: string;
    onComplete?: (payload: unknown) => void;
    onFailed?: (payload: unknown) => void;
    onInProgress?: (payload: unknown) => void;
}

export interface IntaSendPayButtonHandle {
    /** Programmatically opens a checkout (e.g. after the server has prepared it). */
    open: (payload: IntaSendPayButtonPayload) => void;
    /** Tears down the instance and closes any open modal. */
    destroy: () => void;
}

/**
 * Attaches a live IntaSend Pay Button to elements that already carry
 * `buttonClass`. The SDK binds its click listeners NOW, so call this from a
 * `useEffect` after the button is mounted. Returns a handle to open the
 * checkout programmatically and to tear the instance down on unmount.
 */
export async function attachIntaSendPayButton({
    publicApiKey,
    live,
    buttonClass,
    onComplete,
    onFailed,
    onInProgress,
}: AttachPayButtonOptions): Promise<IntaSendPayButtonHandle> {
    if (!publicApiKey) throw new Error('Missing IntaSend publishable key');
    if (!buttonClass) throw new Error('Missing IntaSend payment button class');

    const IntaSend = await loadIntaSendSdk();

    let alive = true;
    const guard =
        (cb?: (payload: unknown) => void) =>
            (payload: unknown) => {
                if (alive) cb?.(payload);
            };

    const instance = new IntaSend({
        publicAPIKey: publicApiKey,
        live,
        mode: 'popup',
        element: buttonClass,
    });

    instance.on('COMPLETE', guard(onComplete));
    instance.on('FAILED', guard(onFailed));
    instance.on('IN-PROGRESS', guard(onInProgress));

    return {
        open: (payload) => {
            if (alive) instance.run(toIntaSendFields(payload));
        },
        destroy: () => {
            alive = false;
            try {
                instance.exitPay();
            } catch {
                /* modal already gone */
            }
        },
    };
}
