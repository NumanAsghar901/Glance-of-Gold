import { MetaPixel } from "@/components/analytics/meta-pixel";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { QuickViewDialog } from "@/components/store/quick-view-dialog";
import { StoreProvider } from "@/components/store/store-provider";
import { getCategories } from "@/lib/data/catalog";
import { getAnnouncements, getGiftOffer, getSettings } from "@/lib/data/site";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, giftOffer, announcements, categories] = await Promise.all([
    getSettings(),
    getGiftOffer(),
    getAnnouncements(),
    getCategories(),
  ]);

  return (
    <StoreProvider settings={settings} giftOffer={giftOffer}>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <AnnouncementBar items={announcements} />
        <Header categories={categories} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <CartDrawer />
        <QuickViewDialog />
        <SmoothScroll />
        <MetaPixel />
      </div>
    </StoreProvider>
  );
}
