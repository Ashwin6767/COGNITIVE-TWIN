import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Cognitive Twin — Supply Chain Intelligence",
  description: "Decision-intelligence system for supply chain management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
