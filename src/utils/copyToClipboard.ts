/**
 * Copies text to clipboard; works inside SAP Fiori iframes where navigator.clipboard is blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Prefer modern API (works on localhost and HTTPS top-level frames)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  // execCommand fallback — works inside iframes without clipboard-write permission
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
