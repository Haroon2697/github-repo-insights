import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ANALYSIS_API_BASE, fetchJson } from "../utils/api";
import "../App.css";

const loadAnalyticsView = () => import("../components/AnalyticsView");
const AnalyticsView = lazy(loadAnalyticsView);

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("Haroon2697");
  const [ownership, setOwnership] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [type, setType] = useState("all");
  const [tag, setTag] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [minScore, setMinScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repos, setRepos] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function prefetchAnalytics() {
    loadAnalyticsView();
  }

  const query = useMemo(
    () =>
      `ownership=${ownership}&visibility=${visibility}&type=${type}&sortBy=${sortBy}&sortOrder=${sortOrder}&tag=${tag}&minScore=${minScore}&limit=200`,
    [ownership, visibility, type, sortBy, sortOrder, tag, minScore]
  );

  function exportReposCsv() {
    if (!repos.length) return;
    const headers = [
      "name",
      "fullName",
      "githubId",
      "finalScore",
      "stars",
      "forks",
      "language",
      "visibility",
      "tags",
    ];
    const rows = repos.map((r) => [
      r.name,
      r.fullName,
      r.githubId,
      r.finalScore,
      r.stars,
      r.forks,
      r.language || "",
      r.visibility,
      (r.tags || []).join(";"),
    ]);
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repos-${username}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchDashboardData(overrideLogin) {
    const login =
      overrideLogin != null && String(overrideLogin).trim() !== ""
        ? String(overrideLogin).trim()
        : username;
    setLoading(true);
    setError("");
    try {
      const [reposData, summaryData] = await Promise.all([
        fetchJson(`${ANALYSIS_API_BASE}/${login}/repos?${query}`),
        fetchJson(`${ANALYSIS_API_BASE}/${login}/summary`),
      ]);
      setRepos(reposData.repositories || []);
      setSummary(summaryData || null);
      setSelectedRepo(null);
    } catch (err) {
      setError(err?.message || "Failed to fetch repositories");
      setRepos([]);
      setSummary(null);
      setSelectedRepo(null);
    } finally {
      setLoading(false);
    }
  }

  const urlLogin = (
    searchParams.get("username") ||
    searchParams.get("user") ||
    ""
  ).trim();

  useEffect(() => {
    if (!urlLogin) return;
    setUsername(urlLogin);
    fetchDashboardData(urlLogin);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- share-link bootstrap when ?username / ?user changes only
  }, [urlLogin]);

  async function loadRepositoryDetails(githubId) {
    try {
      const data = await fetchJson(
        `${ANALYSIS_API_BASE}/${username}/repos/${githubId}`
      );
      setSelectedRepo(data.repository);
      setAiError("");
    } catch (err) {
      setError(err?.message || "Failed to load repository details");
    }
  }

  async function generateAiInsights(force = false) {
    if (!selectedRepo?.githubId) return;
    setAiLoading(true);
    setAiError("");
    try {
      const data = await fetchJson(
        `${ANALYSIS_API_BASE}/${username}/repos/${selectedRepo.githubId}/ai-insights${
          force ? "?force=true" : ""
        }`,
        {
          method: "POST",
        }
      );
      setSelectedRepo((prev) =>
        prev
          ? {
              ...prev,
              aiInsights: data.aiInsights || null,
            }
          : prev
      );
    } catch (err) {
      setAiError(err?.message || "Failed to generate AI insights");
    } finally {
      setAiLoading(false);
    }
  }

  const topTenScoreData = useMemo(
    () =>
      repos
        .slice(0, 10)
        .map((repo) => ({ name: repo.name.slice(0, 12), score: repo.finalScore })),
    [repos]
  );

  const languageData = useMemo(() => {
    const distribution = summary?.languageDistribution || {};
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [summary]);

  const tagData = useMemo(() => {
    const distribution = summary?.tagDistribution || {};
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [summary]);

  return (
    <main className="container">
      <h1>GitHub Intelligence Dashboard</h1>
      <p className="subtitle">Phase 4: ranked repos, details view, and analytics charts</p>

      <section className="controls">
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username"
          />
        </label>

        <label>
          Ownership
          <select value={ownership} onChange={(e) => setOwnership(e.target.value)}>
            <option value="all">All</option>
            <option value="own">Own</option>
            <option value="fork">Forked/Cloned</option>
          </select>
        </label>

        <label>
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>

        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            <option value="owner">Owner</option>
            <option value="member">Member</option>
          </select>
        </label>

        <label>
          Sort By
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Score</option>
            <option value="stars">Stars</option>
            <option value="updated">Updated</option>
          </select>
        </label>

        <label>
          Order
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>

        <label>
          Tag
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">All</option>
            <option value="fullstack">Fullstack</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="ai">AI</option>
            <option value="devops">DevOps</option>
            <option value="data">Data</option>
          </select>
        </label>

        <label>
          Min Score
          <input
            type="number"
            min="0"
            step="0.1"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
          />
        </label>

        <button onClick={fetchDashboardData} disabled={loading}>
          {loading ? "Loading..." : "Load Dashboard"}
        </button>
        <button
          type="button"
          className="secondaryBtn"
          onClick={exportReposCsv}
          disabled={!repos.length}
        >
          Export CSV
        </button>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="tabs">
        <button
          className={activeView === "dashboard" ? "active" : ""}
          onClick={() => setActiveView("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={activeView === "analytics" ? "active" : ""}
          onClick={() => setActiveView("analytics")}
          onMouseEnter={prefetchAnalytics}
          onFocus={prefetchAnalytics}
        >
          Analytics
        </button>
      </section>

      {summary ? (
        <section className="summaryGrid">
          <article className="summaryCard">
            <h3>Total Repositories</h3>
            <p>{summary.totalRepositories}</p>
          </article>
          <article className="summaryCard">
            <h3>Average Score</h3>
            <p>{summary.averageScore}</p>
          </article>
          <article className="summaryCard">
            <h3>Top Repository</h3>
            <p>{summary.topRepository?.name || "N/A"}</p>
          </article>
        </section>
      ) : null}

      {activeView === "dashboard" ? (
        <section className="layout">
          <section className="results">
            <h2>Ranked Repositories ({repos.length})</h2>
            {repos.slice(0, 30).map((repo) => (
              <article key={repo.githubId} className="card">
                <div>
                  <h3>{repo.name}</h3>
                  <p>{repo.description || "No description"}</p>
                </div>
                <div className="meta">
                  <strong>Score: {repo.finalScore}</strong>
                  <span>Stars: {repo.stars}</span>
                  <span>Forks: {repo.forks}</span>
                  <span>Commits: {repo.commitCount ?? "n/a"}</span>
                  <span>Visibility: {repo.visibility}</span>
                  <span>Tags: {(repo.tags || []).join(", ") || "none"}</span>
                  <button onClick={() => loadRepositoryDetails(repo.githubId)}>
                    View Details
                  </button>
                  <Link to={`/repo/${username}/${repo.githubId}`}>Open page</Link>
                </div>
              </article>
            ))}
          </section>

          <aside className="details">
            <h2>Repository Details</h2>
            {!selectedRepo ? (
              <p>Select a repository from the list.</p>
            ) : (
              <>
                <h3>{selectedRepo.fullName}</h3>
                <p>
                  <Link to={`/repo/${username}/${selectedRepo.githubId}`}>
                    Open full page
                  </Link>
                </p>
                <p>{selectedRepo.description || "No description"}</p>
                <div className="detailsList">
                  <span>Score: {selectedRepo.finalScore}</span>
                  <span>Tech Stack Score: {selectedRepo.breakdown?.techStack}</span>
                  <span>Architecture Score: {selectedRepo.breakdown?.architecture}</span>
                  <span>Activity Score: {selectedRepo.breakdown?.activity}</span>
                  <span>Popularity: {selectedRepo.breakdown?.popularity}</span>
                  <span>Commit Count: {selectedRepo.breakdown?.commitCount}</span>
                  <span>Tags: {(selectedRepo.tags || []).join(", ") || "none"}</span>
                </div>
                <div className="aiActions">
                  <button onClick={() => generateAiInsights(false)} disabled={aiLoading}>
                    {aiLoading ? "Generating..." : "Generate AI Insight"}
                  </button>
                  <button
                    onClick={() => generateAiInsights(true)}
                    disabled={aiLoading}
                    className="secondaryBtn"
                  >
                    Regenerate
                  </button>
                </div>
                {aiError ? <p className="error">{aiError}</p> : null}
                {selectedRepo.aiInsights ? (
                  <section className="aiPanel">
                    <h4>AI Complexity Insight</h4>
                    <p className="aiMeta">
                      Provider: <strong>{selectedRepo.aiInsights.provider || "—"}</strong>
                      {selectedRepo.aiInsights.model
                        ? ` · Model: ${selectedRepo.aiInsights.model}`
                        : null}
                    </p>
                    {Array.isArray(selectedRepo.aiInsights.attemptLog) &&
                    selectedRepo.aiInsights.attemptLog.length > 0 ? (
                      <div className="attemptLog">
                        <strong>Provider attempts</strong>
                        <ul>
                          {selectedRepo.aiInsights.attemptLog.map((a, i) => (
                            <li key={`${a.provider}-${i}`}>
                              {a.provider}: {a.ok ? "ok" : `failed — ${a.error || ""}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p>{selectedRepo.aiInsights.summary || "No summary returned."}</p>
                    <div className="aiListGroup">
                      <strong>Complexity Reasons</strong>
                      <ul>
                        {(selectedRepo.aiInsights.complexityReasons || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="aiListGroup">
                      <strong>Technologies</strong>
                      <ul>
                        {(selectedRepo.aiInsights.technologies || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="aiListGroup">
                      <strong>Recommendations</strong>
                      <ul>
                        {(selectedRepo.aiInsights.recommendations || []).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ) : (
                  <p className="muted">
                    No AI insight yet. Configure at least one AI provider in the backend (e.g.
                    GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY).
                  </p>
                )}
              </>
            )}
          </aside>
        </section>
      ) : (
        <Suspense fallback={<p>Loading analytics charts...</p>}>
          <AnalyticsView
            topTenScoreData={topTenScoreData}
            languageData={languageData}
            tagData={tagData}
          />
        </Suspense>
      )}
    </main>
  );
}
