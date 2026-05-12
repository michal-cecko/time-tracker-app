import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.studio.lapse',
  appName: 'Lapse',
  webDir: 'dist',
  server: {
    // Android origin = http://localhost (matches the existing CORS_ORIGINS
    // entry on the API). Once the API allowlist also includes
    // https://localhost we can switch this back to 'https' for parity with
    // iOS. iOS always uses capacitor://localhost so it's unaffected.
    androidScheme: 'http',
  },
  ios: {
    contentInset: 'always',
    scheme: 'Lapse',
    backgroundColor: '#100f0d',
  },
  android: {
    backgroundColor: '#100f0d',
  },
};

export default config;
