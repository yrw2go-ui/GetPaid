export const metadata = {
  title: "GetPaid",
  description: "Track contractor hours and payments",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0f" }}>{children}</body>
    </html>
  );
}
