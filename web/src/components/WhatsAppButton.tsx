import { MessageCircle } from "lucide-react";

import { site } from "@/lib/site";

/** Persistent way to reach the author now that the contact page is gone. */
export default function WhatsAppButton() {
  return (
    <a
      href={site.whatsapp}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 end-5 z-30 grid size-12 place-items-center rounded-full bg-whatsapp text-white shadow-lg transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle aria-hidden="true" className="size-6" />
    </a>
  );
}
