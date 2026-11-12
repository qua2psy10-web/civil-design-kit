import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'土木設計室 | 擁壁安定計算',description:'条件と根拠がつながる土木設計ワークスペース'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
