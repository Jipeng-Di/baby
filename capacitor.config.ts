import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jipengdi.feedbook',
  appName: 'Feedbook',
  webDir: 'out-native',
  ios: {contentInset: 'never', backgroundColor: '#edf3ef'},
  plugins: {
    SplashScreen: {launchShowDuration: 0, backgroundColor: '#edf3ef'},
    StatusBar: {style: 'DEFAULT', overlaysWebView: true},
    Keyboard: {resize: 'native', resizeOnFullScreen: true},
  },
};
export default config;
