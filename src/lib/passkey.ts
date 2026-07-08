// Small helpers shared by the passkey login and passkey register buttons.

/** Does this browser/device support the WebAuthn (passkey) API? */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

// Flatten an error's name + message down the whole .cause chain into one string
// (Supabase may wrap the underlying WebAuthn DOMException as a cause).
function collectErrorStrings(err: unknown, depth = 0): string {
  if (!err || depth > 5) return "";
  if (typeof err === "string") return err;
  if (typeof err !== "object") return String(err);
  const e = err as { name?: unknown; message?: unknown; cause?: unknown };
  const parts: string[] = [];
  if (typeof e.name === "string") parts.push(e.name);
  if (typeof e.message === "string") parts.push(e.message);
  if (e.cause) parts.push(collectErrorStrings(e.cause, depth + 1));
  return parts.join(" ");
}

/**
 * Classify a passkey error so the UI can stay quiet when the *user* cancelled
 * the OS dialog, and give a useful message for real failures. Detection is
 * best-effort: it scans the DOMException name and message text down the whole
 * cause chain (the experimental Supabase API doesn't guarantee a stable shape).
 */
export function describePasskeyError(err: unknown): {
  canceled: boolean;
  message: string;
} {
  const blob = collectErrorStrings(err);
  const text = blob.toLowerCase();
  const canceled =
    blob.includes("NotAllowedError") ||
    blob.includes("AbortError") ||
    text.includes("not allowed") ||
    text.includes("cancel") ||
    text.includes("abort") ||
    text.includes("timed out");
  if (canceled) return { canceled: true, message: "" };
  if (blob.includes("InvalidStateError")) {
    return {
      canceled: false,
      message: "このデバイスには既にパスキーが登録されています。",
    };
  }
  if (blob.includes("SecurityError")) {
    return {
      canceled: false,
      message: "このサイト（ドメイン）ではパスキーを利用できません。",
    };
  }
  return { canceled: false, message: "" }; // caller supplies a default
}

/** localStorage key marking that this device registered a passkey for a user. */
export function passkeyRegisteredKey(userId: string): string {
  return `passkey_registered:${userId}`;
}
