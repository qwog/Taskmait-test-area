'use client';import { getDB, saveDB } from '@/lib/data';
export default function Page(){const db=getDB(); return <main><h1 className='text-2xl font-bold mb-3'>Reservations</h1><pre className='card overflow-auto text-xs'>{JSON.stringify(db.reservations,null,2)}</pre></main>}
