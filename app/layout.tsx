import type { Metadata, Viewport } from 'next'
import './globals.css'
import MainLayout from './main-layout'
export const metadata: Metadata = { title:'KLIMATIX: BANTAY BAHA', description:'Community flood reporting and flood intelligence for the Philippines.', icons:{icon:'/icon.svg',apple:'/apple-icon.png'} }
export const viewport: Viewport = { themeColor:'#0B1354', colorScheme:'dark', width:'device-width', initialScale:1, userScalable:false }
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><MainLayout>{children}</MainLayout></body></html>}
