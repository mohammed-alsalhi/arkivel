import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import DiscoverPage from './DiscoverPage';

it('keeps library errors visible and never presents stale results or an empty success after a failed search', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  let failSearch = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/watchlist')) return { ok: false, json: async () => ({ error: 'Library unavailable' }) };
    if (url.includes('/health')) return { ok: true, json: async () => ({ can_edit: true, catalog: 'sample' }) };
    return { ok: !failSearch, json: async () => failSearch ? { error: 'Search unavailable' } : [{ id: 1, title: 'Old result', media_type: 'movie', poster_path: null }] };
  }));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DiscoverPage />));
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(container.textContent).toContain('Old result');
    failSearch = true;
    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'New query');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Library unavailable');
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(container.textContent).not.toContain('Old result');
    expect(container.textContent).not.toContain('No titles found');
    expect(container.textContent).toContain('Try again');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
