import { redirect } from 'next/navigation';

// La vista de combinaciones vive en la página principal (?view=combinations).
export default function CombinationsPage() {
  redirect('/?view=combinations');
}
