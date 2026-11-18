import { Bodoni_Moda, DM_Sans, Gloock, Fraunces, Instrument_Serif, Inter, Playfair_Display } from "next/font/google";

// Botanical Dream: soft, organic Fraunces with DM Sans. Botanical Editorial: Playfair Display with Inter.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-mahima-fraunces", axes: ["SOFT", "opsz"], style: ["normal", "italic"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-mahima-dmsans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-mahima-playfair", style: ["normal", "italic"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-mahima-inter" });
// display faces: Instrument Serif (soft, airy, garden-journal) for Dream; Bodoni Moda (high-contrast, magazine) for Editorial
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-mahima-instrument" });
// the hero line: Gloock, a bold, characterful display serif
const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-mahima-gloock" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-mahima-bodoni" });

export const mahimaFonts = [fraunces.variable, dmSans.variable, playfair.variable, inter.variable, instrument.variable, bodoni.variable, gloock.variable].join(" ");
