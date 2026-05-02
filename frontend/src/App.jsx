import { Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import RepoDetailPage from "./pages/RepoDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/repo/:username/:githubId" element={<RepoDetailPage />} />
    </Routes>
  );
}
