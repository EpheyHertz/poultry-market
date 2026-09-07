'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
    attachIntaSendPayButton,
    toIntaSendDataAttributes,
    type IntaSendPayButtonHandle,
    type IntaSendPayButtonPayload,
} from '@/lib/intasend-checkout';

export interface IntaSendPayButtonProps {
    /** Publishable key handed back by our API. */
    publicApiKey: string;
    /** true => production IntaSend, false => sandbox. */
    live: boolean;
    /** Checkout defaults rendered as `data-*` attributes on the button. */
    payload: IntaSendPayButtonPayload;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    /** Fired when the SDK reports the checkout is COMPLETE. */
    onComplete?: (payload: unknown) => void;
    /** Fired when the SDK reports the checkout FAILED. */
    onFailed?: (payload: unknown) => void;
    /** Fired when the customer starts paying (IN-PROGRESS). */
    onInProgress?: (payload: unknown) => void;
    /** Fired if the SDK cannot be loaded (blocked CDN, offline, SRI mismatch). */
    onSdkError?: (error: Error) => void;
    /** Fired on click, before IntaSend opens its modal. */
    onOpen?: () => void;
}

/**
 * IntaSend Payment Button, exactly as the InlineJS docs describe it: a button
 * carrying `data-*` checkout fields plus the InlineJS plugin, which binds a
 * click handler and opens IntaSend's hosted modal.
 *
 * Two React-specific details matter:
 *
 *  - The SDK binds listeners with `getElementsByClassName` when it is
 *    constructed, so the button must already be in the DOM. We render first and
 *    attach from an effect.
 *  - A unique class per mount (`intasend-pay-<id>`) keeps two buttons on the
 *    same page (e.g. the dialog and the full page) from stealing each other's
 *    events, and prevents double-binding on re-render.
 *
 * `data-method` is intentionally left unset so IntaSend offers every method
 * enabled on the account: M-Pesa, card and bank.
 */
export function IntaSendPayButton({
    publicApiKey,
    live,
    payload,
    children,
    className = '',
    disabled = false,
    onComplete,
    onFailed,
    onInProgress,
    onSdkError,
    onOpen,
}: IntaSendPayButtonProps) {
    // useId gives a stable, collision-free suffix; strip characters that are not
    // valid inside a CSS class name (React ids contain ':').
    const rawId = useId();
    const buttonClass = `intasend-pay-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    const [isReady, setIsReady] = useState(false);
    const handleRef = useRef<IntaSendPayButtonHandle | null>(null);

    // Keep the latest callbacks without re-attaching the SDK on every render.
    const callbacksRef = useRef({ onComplete, onFailed, onInProgress });
    callbacksRef.current = { onComplete, onFailed, onInProgress };

    const sdkErrorRef = useRef(onSdkError);
    sdkErrorRef.current = onSdkError;

    useEffect(() => {
        let cancelled = false;

        attachIntaSendPayButton({
            publicApiKey,
            live,
            buttonClass,
            onComplete: (data) => callbacksRef.current.onComplete?.(data),
            onFailed: (data) => callbacksRef.current.onFailed?.(data),
            onInProgress: (data) => callbacksRef.current.onInProgress?.(data),
        })
            .then((handle) => {
                if (cancelled) {
                    handle.destroy();
                    return;
                }
                handleRef.current = handle;
                setIsReady(true);
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                sdkErrorRef.current?.(
                    error instanceof Error ? error : new Error('Failed to load IntaSend')
                );
            });

        return () => {
            cancelled = true;
            handleRef.current?.destroy();
            handleRef.current = null;
        };
        // buttonClass is derived from a stable useId, so this runs once per mount
        // (and again only if the key/environment genuinely changes).
    }, [publicApiKey, live, buttonClass]);

    return (
        <button
            type="button"
            // `intaSendPayButton` is the SDK's documented default class; the unique
            // class is what our own instance listens on.
            className={`intaSendPayButton ${buttonClass} ${className}`}
            disabled={disabled || !isReady}
            onClick={() => onOpen?.()}
            {...toIntaSendDataAttributes(payload)}
        >
            {children}
        </button>
    );
}

export default IntaSendPayButton;
