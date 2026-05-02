import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function AnalyticsView({ topTenScoreData, languageData, tagData }) {
  return (
    <section className="chartsGrid">
      <article className="chartCard">
        <h3>Top 10 Repository Scores</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topTenScoreData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="chartCard">
        <h3>Language Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={languageData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              fill="#16a34a"
              label
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </article>

      <article className="chartCard">
        <h3>Tag Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tagData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
}

export default AnalyticsView;
