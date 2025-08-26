
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teams');
  }, [router]);

  return (
      <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
        <p>Redirecting to the new Teams page...</p>
      </div>
  );
}
