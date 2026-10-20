import './globals.css';

export const metadata = {
  title: 'BenciRuta',
  description: 'Encuentra la bencinera que más te conviene en Ñuñoa',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
