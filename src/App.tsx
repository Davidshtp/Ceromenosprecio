
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { lazy, Suspense } from "react";

import LoginPage from "./pages/public/LoginPage";

const RestaurantDashboard = lazy(() => import("./pages/restaurant/Dashboard"));
const CustomerMenu = lazy(() => import("./pages/customer/CustomerMenu"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        duration={4000}
        toastOptions={{
          className: "app-toast",
        }}
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <Routes>
        {/* Public access */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Restaurant Dashboard Routes */}
        <Route path="/restaurant/*" element={<RestaurantDashboard />} />

        {/* Customer Ordering Route */}
        <Route path="/menu/:slug" element={<CustomerMenu />} />

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
