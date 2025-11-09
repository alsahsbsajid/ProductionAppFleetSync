'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  return (
    <>
      <h1 className='text-3xl font-bold tracking-tight'>
        Search Results for &quot;{query}&quot;
      </h1>
      <div className='flex items-center justify-center h-48 border-2 border-dashed rounded-lg'>
        <p className='text-muted-foreground'>
          Search results will be displayed here.
        </p>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
} 