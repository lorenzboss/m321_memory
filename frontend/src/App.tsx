import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/home-page/HomePage";
import MultiplayerGamePage from "./pages/multiplayer-game-page/MultiplayerGamePage";
import NotFoundGamePage from "./pages/not-found-game-page/NotFoundGamePage";
import NotFoundPage from "./pages/not-found-page/NotFoundPage";
import PracticePage from "./pages/practice-page/PracticePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route
              path="/multiplayer/:gameId"
              element={<MultiplayerGamePage />}
            />
            <Route path="/game-not-found" element={<NotFoundGamePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
