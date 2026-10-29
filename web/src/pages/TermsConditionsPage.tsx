import { BookOpen, Copyright, Gift } from "lucide-react";

import LegalPage from "@/components/LegalPage.tsx";
import Seo from "@/components/Seo.tsx";

// Mirrored in api/seo.py (PAGE_COPY["terms"], _legal_body).
export default function TermsConditionsPage() {
  return (
    <>
      <Seo
        title="Terms &amp; Conditions"
        description="Terms and conditions for using Prof. Mujahid Sajjad's free Urdu poetry digital library."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Terms & Conditions",
          url: "https://www.msurdupoetry.com/terms",
        }}
      />
      <LegalPage
        eyebrow="Terms"
        title="Terms & Conditions"
        urdu="شرائط و ضوابط"
        lead="Welcome to the digital library and archive of Prof. Syed Mujahid Sajjad. By using this site you agree to these terms and conditions."
        updated="October 2026"
        highlights={[
          {
            icon: Gift,
            title: "Free to read",
            text: "Every book, poem and verse is free, read online or download, no account, no payment.",
          },
          {
            icon: BookOpen,
            title: "Personal use",
            text: "Read and download for yourself and for study, not for commercial use.",
          },
          {
            icon: Copyright,
            title: "Ask before republishing",
            text: "Republishing, redistributing or selling the content needs permission.",
          },
        ]}
        sections={[
          {
            id: "free-access",
            title: "Free access",
            body: (
              <p>
                Every book, poem and verse on this site is provided free of charge. You may read
                online or download PDF editions without creating an account or making any payment.
              </p>
            ),
          },
          {
            id: "copyright",
            title: "Copyright",
            body: (
              <>
                <p>
                  All books, poems, criticism and other content on this site are the property of
                  Prof. Syed Mujahid Sajjad or their respective rights holders, and are protected
                  by copyright.
                </p>
                <p>
                  You may read and download content for personal, non-commercial use. You may not
                  republish, redistribute or sell any content from this site without permission.
                </p>
              </>
            ),
          },
          {
            id: "no-warranty",
            title: "No warranty",
            body: (
              <p>
                The site and its content are provided &ldquo;as is&rdquo;, without warranty of any
                kind. We do not guarantee that the site will always be available or free of errors.
              </p>
            ),
          },
          {
            id: "links",
            title: "Links to other sites",
            body: (
              <p>
                The site may contain links to external websites. We are not responsible for the
                content or privacy practices of those sites.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes to these terms",
            body: (
              <p>
                We may update these terms from time to time. Your continued use of the site after
                changes are posted means you accept the updated terms.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
