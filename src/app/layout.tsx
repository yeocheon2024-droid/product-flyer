import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '전단지 생성기 | 지구농산',
  description: '식자재 품목 전단지 자동 생성',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
