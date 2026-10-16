import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/ui';
import RegisterSW from '@/components/RegisterSW';

export const metadata = {
  title: 'Spare Parts Shop Manager',
  description: 'Inventory, billing and reports for a vehicle spare parts shop',
  manifest: '/manifest.json',
};
export const viewport = { themeColor: '#2e3440' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
