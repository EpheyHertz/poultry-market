import { redirect } from 'next/navigation';

export default function NewPostPage() {
  // Redirect to the existing blog submit page
  redirect('/blog/submit');
}
