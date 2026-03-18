/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | FlowMind",
  description: "FlowMind privacy policy.",
};

export const dynamic = "force-dynamic";

export default function PrivacyPolicyPage() {
  const effectiveDate = "March 17, 2026";
  const legalLogoWidth = 520;
  const legalLogoHeight = 160;

  return (
    <main className="mx-auto max-w-4xl px-6 pb-12 pt-0 text-zinc-900 dark:text-zinc-100">
      <div className="mb-3 flex items-center justify-center">
        <img
          src="/flowmind.png"
          alt="FlowMind"
          width={legalLogoWidth}
          height={legalLogoHeight}
          className="h-50 w-auto"
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Effective date: {effectiveDate}</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">1. Overview</h2>
          <p>
            FlowMind provides an AI-powered workflow assistant experience through web, Telegram, and WhatsApp.
            This policy explains what data we collect, how we use it, and your choices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">2. Data We Collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account information (name, email, avatar) from Google sign-in via Firebase.</li>
            <li>Integration identifiers (Telegram username, WhatsApp number).</li>
            <li>Workflow content you create (tasks, projects, related metadata).</li>
            <li>OAuth tokens for integrations you explicitly connect (Google, GitHub).</li>
            <li>Operational logs for reliability, debugging, and abuse prevention.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">3. How We Use Data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Authenticate users and secure access to personal workflows.</li>
            <li>Run requested AI actions and respond in connected channels.</li>
            <li>Maintain and improve platform reliability and security.</li>
            <li>Support connected integrations requested by the user.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">4. Data Sharing</h2>
          <p>
            We do not sell personal data. We share data only with service providers required to operate the
            platform, such as Google/Firebase, Notion, Telegram, Twilio, GitHub, and hosting infrastructure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">5. Data Retention</h2>
          <p>
            Data is retained while your account is active or as needed for legitimate operational and legal
            purposes. You may request deletion of linked integrations and account data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">6. Security</h2>
          <p>
            We use reasonable technical and organizational safeguards. No internet-based system can be guaranteed
            100% secure, but we continuously improve controls and monitoring.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">7. Your Choices</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Disconnect integrations from the dashboard.</li>
            <li>Request account/data deletion by contacting us.</li>
            <li>Stop using the service at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">8. Contact</h2>
          <p>
            Privacy requests and questions: <a className="underline" href="mailto:kaniujeffray@gmail.com">kaniujeffray@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
