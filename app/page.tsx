import { redirect } from 'next/navigation';

export default async function Home() {
  // Always redirect to landing page - users can sign in from there
  redirect('/landing');
}
