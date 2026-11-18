"use client";

import dynamic from "next/dynamic";

// client only: the garden reads the viewport, motion preferences and session storage, and owns two WebGL canvases
const MahimaPortfolio = dynamic(() => import("@/components/mahima/MahimaPortfolio").then((m) => m.MahimaPortfolio), { ssr: false });

export default function Home() {
  return <MahimaPortfolio />;
}
