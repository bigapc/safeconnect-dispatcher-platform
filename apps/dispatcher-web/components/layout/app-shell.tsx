import { Footer } from './footer';
import { Header } from './header';
import { Sidebar } from './sidebar';

export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="lg:grid lg:grid-cols-[18rem_1fr]">
    <Sidebar />
    <div className="min-h-screen">
      <Header />
      <main className="px-4 py-5 lg:px-6">{children}</main>
      <Footer />
    </div>
  </div>
);
