/**
 * @jest-environment node
 */
// __tests__/lib/carousel-settings.test.ts
// Verifies the new homepage carousel settings feature: admin-configurable
// autoplay/transition/arrows/dots/counter behavior, persisted via the
// existing filesystem-backed site-settings store (src/lib/siteSettings.ts),
// and exposed publicly (no auth) via GET /api/carousel-settings since a
// visitor's homepage load needs it before any login.

const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

import { readSettings, writeSettings, defaultSettings } from '@/lib/siteSettings';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('readSettings', () => {
  it('returns the full defaults, including carousel, when no settings file exists', () => {
    mockFs.existsSync.mockReturnValue(false);
    const settings = readSettings();
    expect(settings.carousel).toEqual(defaultSettings.carousel);
  });

  it('fills in carousel defaults for a settings file saved before that category existed', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      general: { siteName: 'Custom Name' },
      // no `carousel` key at all — simulates a pre-existing settings file
    }));
    const settings = readSettings();
    expect(settings.general.siteName).toBe('Custom Name');
    expect(settings.carousel).toEqual(defaultSettings.carousel);
  });

  it('merges a partially-saved carousel section with defaults', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      carousel: { autoplaySpeed: 8, transitionEffect: 'slide' },
    }));
    const settings = readSettings();
    expect(settings.carousel).toEqual({
      ...defaultSettings.carousel,
      autoplaySpeed: 8,
      transitionEffect: 'slide',
    });
  });
});

describe('writeSettings', () => {
  it('writes the given settings object to disk', () => {
    mockFs.existsSync.mockReturnValue(true);
    const result = writeSettings({ ...defaultSettings, carousel: { ...defaultSettings.carousel, autoplayEnabled: false } });
    expect(result).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('site-settings.json'),
      expect.stringContaining('"autoplayEnabled": false'),
      'utf8'
    );
  });
});

describe('GET /api/carousel-settings', () => {
  it('returns the carousel settings without requiring authentication', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const { GET } = require('@/app/api/carousel-settings/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(defaultSettings.carousel);
  });

  it('reflects saved carousel settings', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      carousel: { autoplaySpeed: 3, showArrows: false },
    }));
    const { GET } = require('@/app/api/carousel-settings/route');
    const res = await GET();
    const body = await res.json();
    expect(body.data.autoplaySpeed).toBe(3);
    expect(body.data.showArrows).toBe(false);
  });
});
