import { redirect } from 'next/navigation';

// /features → first of the four detailed feature pages.
export default function FeaturesIndex() {
  redirect('/features/content');
}
