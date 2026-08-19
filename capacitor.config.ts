import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sdr.srushtiai',
  appName: 'Srushti AI',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.92:3000',
    cleartext: true,
    androidScheme: 'http',
  },
}

export default config
