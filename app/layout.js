import "./globals.css";

export const metadata = {
  title: "Container Solutions",
  description: "Mock frontend for testing container solution ideas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
