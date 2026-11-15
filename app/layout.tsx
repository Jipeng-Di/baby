import type {Metadata, Viewport} from 'next';
import './globals.css';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';
export const metadata: Metadata = {
  title: 'Feedbook · Baby Feeding Log',
  description: 'Log every feeding with ease',
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable: true, statusBarStyle: 'default', title: 'Feedbook'},
  icons: {icon: '/icon-192.png', apple: '/icon-180.png'},
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#edf3ef'},
    {media: '(prefers-color-scheme: dark)', color: '#111916'},
  ],
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
