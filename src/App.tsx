import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { EstablishmentProvider } from "@/components/EstablishmentProvider";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SelectPlanPage from "./pages/auth/SelectPlanPage";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import OrdersPage from "./pages/dashboard/OrdersPage";
import ProductsPage from "./pages/dashboard/ProductsPage";
import LogisticsPage from "./pages/dashboard/LogisticsPage";
import DriversPage from "./pages/dashboard/DriversPage";
import CouponsPage from "./pages/dashboard/CouponsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import SubscriptionPage from "./pages/dashboard/SubscriptionPage";
import MenuPage from "./pages/MenuPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <EstablishmentProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/select-plan" element={<SelectPlanPage />} />
              <Route path="/auth/register" element={<Signup />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pedido/:id" element={<OrderTrackingPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="logistics" element={<LogisticsPage />} />
                <Route path="coupons" element={<CouponsPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="/:slug" element={<MenuPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </EstablishmentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
