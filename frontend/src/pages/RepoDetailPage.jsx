import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ANALYSIS_API_BASE, fetchJson } from "../utils/api";
import "../App.css";

export default function RepoDetailPage() {
  const { username, githubId } = useParams();
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson(
          `${ANALYSIS_API_BASE}/${username}/repos/${githubId}`
        );
        if (!cancelled) setRepo(data.repository);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, githubId]);

  if (error) {
    return (
      <main className="container">
        <p className="error">{error}</p>
        <Link to="/">← Back to dashboard</Link>
      </main>
    );
  }

  if (!repo) {
    return (
      <main className="container">
        <p>Loading repository…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <p>
        <Link to="/">← Dashboard</Link>
      </p>
      <h1>{repo.fullName}</h1>
      <p className="subtitle">{repo.description || "No description"}</p>
      <div className="detailsList">
        <span>Score: {repo.finalScore}</span>
        <span>Stars: {repo.stars}</span>
        <span>Forks: {repo.forks}</span>
        <span>Language: {repo.language || "—"}</span>
        <span>Tags: {(repo.tags || []).join(", ") || "none"}</span>
      </div>
      {repo.htmlUrl ? (
        <p>
          <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
            Open on GitHub
          </a>
        </p>
      ) : null}
    </main>
  );
}
