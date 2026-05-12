import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.studio.lapse',
  appName: 'Lapse',
  webDir: 'dist',
  server: {
    // For `npx cap run ios --livereload --external`, point at the dev server.
    // Set CAP_DEV=1 to enable hot-reload from the host.
    androidScheme: 'https',
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
