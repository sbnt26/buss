export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-green-600">✅ Test stránka funguje!</h1>
        <p className="text-xl text-gray-600 mb-8">
          Základní Next.js aplikace se načítá správně.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Domů
          </a>
          <a
            href="/app/clients"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Klienti
          </a>
          <a
            href="/login"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Přihlášení
          </a>
        </div>
      </div>
    </div>
  );
}
