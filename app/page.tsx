import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between px-16 py-32 sm:items-start">
        <Image
          className="dark:invert"
          src="/lr.png"
          alt="Light Reach logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-zinc-50">
            Light Reach Marketing
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-400">
            Open the admin area to manage users, content, analytics, and the
            content calendar.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-5 text-zinc-950 transition-colors hover:bg-white"
            href="/admin"
          >
            Admin dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
