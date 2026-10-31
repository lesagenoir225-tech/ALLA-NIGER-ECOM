import React from 'react';
import { StoreProvider } from './context/StoreContext';
import { useRoute, scrollToTop } from './utils/router';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationBanner } from './components/ui/NotificationBanner';
import { Home } from './pages/Home';
import { Electronique } from './pages/Electronique';
import { Textile } from './pages/Textile';
import { ProductDetail } from './pages/ProductDetail';
import { Contact } from './pages/Contact';
import { Legal } from './pages/Legal';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

function AppContent() {
  const route = useRoute();

  // Guarantee user always lands at the top of the new page
  React.useLayoutEffect(() => {
    scrollToTop(true);
  }, [route]);

  const segments = route.split('/').filter(Boolean);
  const [first, second, third] = segments;

  let currentShop: 'electronique' | 'textile' | 'home' = 'home';
  let pageComponent: React.ReactNode = null;

  if (!first) {
    currentShop = 'home';
    pageComponent = <Home />;
  } else if (first === 'electronique') {
    currentShop = 'electronique';
    if (second === 'p' && third) {
      pageComponent = <ProductDetail shop="electronique" id={third} />;
    } else {
      const sub = segments.slice(1).join('/');
      pageComponent = <Electronique subRoute={sub} />;
    }
  } else if (first === 'textile') {
    currentShop = 'textile';
    if (second === 'p' && third) {
      pageComponent = <ProductDetail shop="textile" id={third} />;
    } else {
      const sub = segments.slice(1).join('/');
      pageComponent = <Textile subRoute={sub} />;
    }
  } else if (first === 'contact') {
    currentShop = 'home';
    pageComponent = <Contact />;
  } else if (first === 'mentions-legales') {
    currentShop = 'home';
    pageComponent = <Legal type="mentions" />;
  } else if (first === 'confidentialite') {
    currentShop = 'home';
    pageComponent = <Legal type="privacy" />;
  } else if (first === 'admin') {
    currentShop = 'home';
    pageComponent = <Admin />;
  } else {
    currentShop = 'home';
    pageComponent = <NotFound />;
  }

  const isTextileTheme = currentShop === 'textile';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isTextileTheme ? 'bg-[var(--ivory)]' : 'bg-white'
      }`}
    >
      <Header currentShop={currentShop} currentPath={route} />
      <div className="flex-1">
        <ErrorBoundary>{pageComponent}</ErrorBoundary>
      </div>
      <Footer />
      <NotificationBanner />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
