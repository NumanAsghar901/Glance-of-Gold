"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Meta Pixel. Loaded after the page is interactive (lazyOnload) so it never competes with
 * the first paint on slow phones. Renders nothing until NEXT_PUBLIC_META_PIXEL_ID is set.
 */
export function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  const first = useRef(true);

  // The pixel records the first PageView itself; report later client-side navigations.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  // Only a numeric id is ever written into the script.
  if (!id || !/^\d{8,20}$/.test(id)) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="lazyOnload">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`}
      </Script>
      {/* The pixel's own fallback for visitors with JavaScript turned off. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1x1 tracking image, not content */}
        <img height="1" width="1" alt="" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
