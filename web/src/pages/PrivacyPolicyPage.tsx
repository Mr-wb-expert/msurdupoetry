import { Cookie, ShieldCheck, UserX } from "lucide-react";

import LegalPage from "@/components/LegalPage.tsx";
import Seo from "@/components/Seo.tsx";

// Mirrored in api/seo.py (PAGE_COPY["privacy"], _legal_body).
export default function PrivacyPolicyPage() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How Prof. Mujahid Sajjad's digital library handles visitor information, cookies and advertising."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Privacy Policy",
          url: "https://www.msurdupoetry.com/privacy",
        }}
      />
      <LegalPage
        eyebrow="Privacy"
        title="Privacy Policy"
        urdu="رازداری کی پالیسی"
        lead="This site is a free digital library of Urdu poetry, books and verses, operated by Prof. Syed Mujahid Sajjad. This page explains what information is involved when you visit."
        updated="October 2026"
        highlights={[
          {
            icon: UserX,
            title: "No account needed",
            text: "Reading or downloading any book needs no sign-up, so the site collects no name or email.",
          },
          {
            icon: ShieldCheck,
            title: "We don't sell data",
            text: "Your personal information is never sold to anyone.",
          },
          {
            icon: Cookie,
            title: "Standard cookies",
            text: "Cookies keep the site working, measure visits and support ads. You can turn them off.",
          },
        ]}
        sections={[
          {
            id: "who-we-are",
            title: "Who we are",
            body: (
              <p>
                This site is operated by Prof. Syed Mujahid Sajjad (&ldquo;we&rdquo;,
                &ldquo;us&rdquo;, &ldquo;our&rdquo;). It is a free digital library of Urdu poetry,
                books and verses. We do not sell your personal information.
              </p>
            ),
          },
          {
            id: "information",
            title: "Information we collect",
            body: (
              <p>
                We do not require an account, sign-up or login to read or download any book, so we
                do not collect your name, email or contact details through the site itself.
              </p>
            ),
          },
          {
            id: "cookies",
            title: "Cookies, analytics and advertising",
            body: (
              <>
                <p>
                  Like most websites, we use standard technologies to keep the site working and to
                  understand how visitors use it:
                </p>
                <dl className="grid gap-3">
                  {[
                    ["Cookies", "Small files stored by your browser to remember preferences and keep features working."],
                    ["Analytics", "Anonymised, aggregate data about page visits so we can improve the library."],
                    ["Advertising", "Third-party ad networks (such as Google AdSense) may serve ads and use cookies to show relevant advertising and measure ad performance."],
                  ].map(([term, text]) => (
                    <div key={term} className="rounded-sm border border-line bg-cream-50 p-4">
                      <dt className="font-semibold text-ink-900">{term}</dt>
                      <dd className="mt-1 text-sm text-muted">{text}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ),
          },
          {
            id: "choices",
            title: "Your choices",
            body: (
              <p>
                You can control or disable cookies through your browser settings. Disabling cookies
                may prevent some parts of the site from working correctly.
              </p>
            ),
          },
          {
            id: "contacting-us",
            title: "When you contact us",
            body: (
              <p>
                If you contact us by WhatsApp, email or any other channel, the details you provide
                are used only to respond to you and are not shared with third parties.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
