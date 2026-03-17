import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | FlowMind",
  description: "FlowMind terms of service.",
};

export default function TermsOfServicePage() {
  const effectiveDate = "March 17, 2026";

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Effective date: {effectiveDate}</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">1. Acceptance</h2>
          <p>
            By accessing or using FlowMind, you agree to these Terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">2. Service Description</h2>
          <p>
            FlowMind provides AI-assisted workflow functionality, integrations, and messaging interactions. Features
            may evolve over time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">3. Account Responsibility</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You are responsible for your account and connected integrations.</li>
            <li>You must provide accurate information and keep credentials secure.</li>
            <li>You are responsible for actions executed through your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">4. Acceptable Use</h2>
          <p>You agree not to misuse the service, including:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Unauthorized access attempts or abuse of integrations.</li>
            <li>Violating applicable laws or third-party terms.</li>
            <li>Disrupting platform security, stability, or availability.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">5. Third-Party Services</h2>
          <p>
            FlowMind depends on third-party providers (such as Google, Notion, Telegram, Twilio, and GitHub). Their
            availability and terms may affect your experience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">6. Intellectual Property</h2>
          <p>
            FlowMind and related branding, software, and content are protected by applicable intellectual property
            laws. You may not copy or redistribute protected material without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">7. Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, to the extent allowed
            by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, FlowMind is not liable for indirect, incidental, special,
            consequential, or punitive damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">9. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use after updates constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">10. Contact</h2>
          <p>
            Terms questions: <a className="underline" href="mailto:kaniujeffray@gmail.com">kaniujeffray@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
