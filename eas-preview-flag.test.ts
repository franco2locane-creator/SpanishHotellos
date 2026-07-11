import fs from 'fs';
import path from 'path';

describe('EXPO_PUBLIC_PREMIUM_PREVIEW build profile safety', () => {
  const eas = JSON.parse(fs.readFileSync(path.join(__dirname, 'eas.json'), 'utf8'));

  it('is set on the preview profile', () => {
    expect(eas.build.preview.env?.EXPO_PUBLIC_PREMIUM_PREVIEW).toBe('1');
  });

  it('is never set on the production profile', () => {
    expect(eas.build.production.env?.EXPO_PUBLIC_PREMIUM_PREVIEW).toBeUndefined();
  });

  it('is never set on the development profile', () => {
    expect(eas.build.development.env?.EXPO_PUBLIC_PREMIUM_PREVIEW).toBeUndefined();
  });
});
