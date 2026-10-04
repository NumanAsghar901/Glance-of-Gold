import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 px-6 text-center">
      <p className="font-heading text-6xl text-gold">404</p>
      <h1 className="font-heading text-3xl">Page not found</h1>
      <Link href="/" className="link-draw mx-auto">
        Back to Glance of Gold
      </Link>
    </main>
  );
}
