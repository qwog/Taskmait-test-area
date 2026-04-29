import Link from 'next/link';
export default function Nav(){return <nav className='flex gap-3 mb-4 text-sm'><Link href='/'>Home</Link><Link href='/reserve'>Reserve</Link><Link href='/availability'>Availability</Link><Link href='/admin'>Admin</Link></nav>}
