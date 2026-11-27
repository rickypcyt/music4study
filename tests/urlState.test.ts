import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushUrl, replaceUrl } from '@/lib/urlState';

afterEach(() => vi.unstubAllGlobals());

describe('urlState', () => {
  it('no hace nada en el servidor', () => {
    expect(() => {
      replaceUrl('/?view=genres');
      pushUrl('/?view=genres');
    }).not.toThrow();
  });

  it('replaceUrl y pushUrl usan el método correspondiente del historial', () => {
    const history = { replaceState: vi.fn(), pushState: vi.fn() };
    vi.stubGlobal('window', { history });

    replaceUrl('/?sort=date');
    pushUrl('/?genre=lofi');

    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/?sort=date');
    expect(history.pushState).toHaveBeenCalledWith(null, '', '/?genre=lofi');
  });
});
