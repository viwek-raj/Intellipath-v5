'use client';

// The instructor dashboard already shows all batches.
// This page acts as a redirect or duplicate of the instructor dashboard batch list.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InstructorBatchesPage() {
    const router = useRouter();
    useEffect(() => { router.replace('/instructor'); }, [router]);
    return null;
}
