"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useStore } from "@/components/store/store-provider";
import { whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Floating "chat on WhatsApp" button, bottom left. It drifts gently up and down (CSS, transform
 * only, see .wa-fab) and opens a chat with the shop's WhatsApp number from the settings.
 *
 * - Product pages lift it above the sticky add-to-bag bar on small screens.
 * - Hidden at checkout so it never covers the place-order button.
 */
export function WhatsAppButton() {
  const pathname = usePathname();
  const { settings } = useStore();

  if (pathname.startsWith("/checkout")) return null;
  const aboveBuyBar = pathname.startsWith("/product/");

  return (
    <div
      className={cn(
        "wa-fab fixed left-4 z-30 print:hidden sm:left-6",
        aboveBuyBar
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6",
      )}
    >
      <a
        href={whatsappLink("Hello Glance of Gold, I need some help.", settings.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-gold px-3 text-foreground shadow-lg transition-[transform,background-color,color] duration-200 ease-(--ease-out) hover:bg-gold-hover hover:text-white active:scale-95 sm:px-5"
      >
        <MessageCircle className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden text-[0.9375rem] font-medium sm:inline">Chat with us</span>
      </a>
    </div>
  );
}
