import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-6 md:p-12">
      <div className="max-w-3xl mx-auto glass-card p-8 rounded-3xl border-slate-800/50">
        <h1 className="text-3xl font-bold mb-6">About JNTUH CEJ Monitoring</h1>
        <div className="space-y-4 text-[var(--text-secondary)]">
          <p>
            Welcome to the JNTUH CEJ Gate Monitoring System. This platform provides real-time oversight of campus mobility, enhancing security and operational efficiency for students, faculty, and administration.
          </p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] pt-4">Legal & Privacy</h2>
          <p>
            Our commitment to data privacy is paramount. This system complies with modern security standards to ensure student and staff records are handled securely.
          </p>
          <div className="pt-6">
            <Link href="/" className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
