'use client';

import dynamic from 'next/dynamic';

// ✅ ssr: false로 완전히 클라이언트에서만 렌더링
const WriteForm = dynamic(() => import('./WriteForm'), {
  ssr: false,
  loading: () => (
    <div className="container my-4">
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  )
});

export default function PostWritePage() {
  return <WriteForm />;
}