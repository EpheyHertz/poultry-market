/**
 * IntaSend Payment Button (InlineJS / WebSDK) — client-side helper.
 *
 * SECURITY MODEL
 * --------------
 * The IntaSend docs show a "Payment Button" that carries the amount/currency in
 * `data-*` attributes and lets the browser create the checkout with a publishable
 * key. We deliberately do NOT do that: anything in the DOM is attacker-controlled,
 * so a user could tip KES 1 while the UI says KES 500, and the checkout could not
 * be routed to the correct author wallet.
 *
 * Instead we use the SDK's `continue()` entry point:
 *
 *   1. Our server creates the checkout (`POST /checkout/` with the secret key),
 *      pinning the amount, currency, `api_ref` and the author's `wallet_id`.
 *   2. The browser only receives the opaque `checkoutId` + `signature`.
 *   3. `openIntaSendCheckout()` hands those to the SDK, which renders IntaSend's
 *      own hosted iframe (card / M-Pesa / bank — all methods).
 *   4. Money is only credited by the signed IntaSend webhook, never by the client.
 *
 * The SDK bundle is pinned to an exact version and guarded with subresource
 * integrity so a compromised CDN cannot inject a script into the payment page.
 */

const SDK_SRC = 'https://unpkg.com/intasend-inlinejs-sdk@4.0.0/build/intasend-inline.js';
const SDK_INTEGRITY = 'sha384-0wbkCp9uU6oi1xaDaWMUnQo4XfBnizgANO3x2LCMVSrr2D9uwOcr7I6MhzLu1LpR';
const SDK_SCRIPT_ID = 'intasend-inlinejs-sdk';

/** Payment states broadcast by the IntaSend checkout iframe. */
export type IntaSendState = 'COMPLETE' | 'FAILED' | 'IN-PROGRESS' | 'PENDING';

export interface IntaSendCheckoutSession {
    /** Checkout id returned by IntaSend when our server created the checkout. */
    checkoutId: string;
    /** Signature returned alongside the checkout id. Required by the SDK. */
    signature: string;
    /** false => IntaSend sandbox, true => production. Comes from the server. */
    live: boolean;
}

export interface OpenCheckoutOptions extends IntaSendCheckoutSession {
    onComplete?: (payload: unknown) => void;
    onFailed?: (payload: unknown) => void;
    onInProgress?: (payload: unknown) => void;
}

interface IntaSendInstance {
    on: (event: IntaSendState, cb: (payload: unknown) => void) => IntaSendInstance;
    continue: (payload: { checkoutID: string; signature: string; live: boolean }) => IntaSendInstance;
    exitPay: () => void;
}

type IntaSendConstructor = new (options: {
    publicAPIKey?: string;
    live?: boolean;
    mode?: 'popup' | 'inline';
}) => IntaSendInstance;

declare global {
    interface Window {
        IntaSend?: IntaSendConstructor;
    }
}

let sdkPromise: Promise<IntaSendConstructor> | null = null;

/** Injects the IntaSend SDK once per page and resolves with the constructor. */
function loadIntaSendSdk(): Promise<IntaSendConstructor> {
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

/**
 * Opens the IntaSend payment modal for a checkout that was already created and
 * priced on our server. Resolves once the modal is on screen; payment outcomes
 * arrive through the callbacks (and, authoritatively, through our webhook).
 */
export async function openIntaSendCheckout({
    checkoutId,
    signature,
    live,
    onComplete,
    onFailed,
    onInProgress,
}: OpenCheckoutOptions): Promise<() => void> {
    if (!checkoutId || !signature) {
        throw new Error('Missing IntaSend checkout session');
    }

    const IntaSend = await loadIntaSendSdk();
    const instance = new IntaSend({ live, mode: 'popup' });

    if (onComplete) instance.on('COMPLETE', onComplete);
    if (onFailed) instance.on('FAILED', onFailed);
    if (onInProgress) instance.on('IN-PROGRESS', onInProgress);

    instance.continue({ checkoutID: checkoutId, signature, live });

    // Caller can close the modal (e.g. on unmount) without leaking the iframe.
    return () => {
        try {
            instance.exitPay();
        } catch {
            /* modal already gone */
        }
    };
}
