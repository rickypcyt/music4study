// Mientras cargan los tracks no se muestra nada: solo el fondo. Se reserva la altura para que la página no salte
// cuando llegan los datos, y se anuncia el estado a lectores de pantalla.
export default function LoadingCards() {
  return (
    <div role="status" aria-busy="true" className="min-h-[60vh] w-full">
      <span className="sr-only">Loading tracks</span>
    </div>
  );
}
