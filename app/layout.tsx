import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';
export const metadata: Metadata = { title:'奶记 · 宝宝喝奶记录', description:'轻松记录每一顿奶', manifest:'/manifest.webmanifest', appleWebApp:{capable:true,statusBarStyle:'default',title:'奶记'}, icons:{icon:'/icon-192.png',apple:'/icon-180.png'} };
export const viewport: Viewport = { width:'device-width', initialScale:1, viewportFit:'cover', themeColor:'#f5f7f5' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body><RegisterServiceWorker/>{children}</body></html>; }
