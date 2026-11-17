import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HostPage } from "./pages/HostPage";
import { GuestPage } from "./pages/GuestPage";
import { ScreenPage } from "./pages/ScreenPage";
import { PrepPage } from "./pages/PrepPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HostPage />} />
        <Route path="/vote/:pollId" element={<GuestPage />} />
        <Route path="/screen/:eventId" element={<ScreenPage />} />
        <Route path="/prep/:eventId" element={<PrepPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}