import { useRouter } from "next/router";
import Head from "next/head";
import { FormEvent, useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";

const AdminLogin = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login fehlgeschlagen.");
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login – Swibble</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-sm flex-col justify-center">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#000D36]">
          CMS Login
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[#2A3342]">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-lg bg-[#F6F6F6] pl-3 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[10px] bg-[#B718EC] py-3 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:opacity-50"
          >
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Already logged in → straight to the dashboard.
  if (isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin", permanent: false } };
  }
  return { props: {} };
};

export default AdminLogin;
