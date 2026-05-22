import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dictationstar.app',
  appName: '听写小状元',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
