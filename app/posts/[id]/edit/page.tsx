'use client';

import dynamic from 'next/dynamic';

const EditForm = dynamic(() => import('./EditForm'), {
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

interface PostEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostEditPage({ params }: PostEditPageProps) {
  return <EditForm params={params} />;
}