import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 정규화되기 전의 원본 URL 전체
  const rawUrl = req.url;

  // origin (http://localhost:3000) 이후의 path만 추출
  const pathname = rawUrl.replace(req.nextUrl.origin, '');

  // 슬래시가 두 번 이상 연속된 경우 차단
  if (/\/{2,}/.test(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*'
};
