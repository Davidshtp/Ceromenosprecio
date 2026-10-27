
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import LoginPage from "./pages/public/LoginPage";

// Restaurant dashboard
import RestaurantDashboard from "./pages/restaurant/Dashboard";

// Customer ordering
import CustomerMenu from "./pages/customer/CustomerMenu";

// 404
import NotFoundPage from "./pages/NotFoundPage";

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
    </BrowserRouter>
  );
}

export default App;
