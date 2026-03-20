import "./globals.css";

export const metadata = {
  title: "Container Configurator | Container Solutions",
  description: "Interactive 3D configurator for 20ft ISO containers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <body className="antialiased">{children}</body>
    </html>
  );
}
