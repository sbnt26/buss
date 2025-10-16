export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">WhatsApp Invoicer</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Vytvářejte faktury přes WhatsApp s webovým CRM
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/signup"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Začít zdarma
          </a>
          <a
            href="/login"
            className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Přihlásit se
          </a>
        </div>
      </div>
    </main>
  );
}



