import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./EngagementMetrics.css";

const EngagementMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [pageMetrics, setPageMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30daysAgo");

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, pagesRes] = await Promise.all([
        apiClient.get("/api/analytics/engagement", {
          params: {
            startDate: dateRange,
            endDate: "today",
          },
        }),
        apiClient.get("/api/analytics/engagement/by-page", {
          params: {
            startDate: dateRange,
            endDate: "today",
            limit: 20,
          },
        }),
      ]);

      setMetrics(metricsRes.data.data);
      setPageMetrics(pagesRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load engagement metrics");
      console.error("Error fetching engagement metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="engagement-metrics-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading engagement metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="engagement-metrics-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="engagement-metrics-page">
      <div className="page-header">
        <div className="date-range-selector">
          <label htmlFor="date-range">Period:</label>
          <select
            id="date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="7daysAgo">Last 7 Days</option>
            <option value="30daysAgo">Last 30 Days</option>
            <option value="90daysAgo">Last 90 Days</option>
          </select>
        </div>
      </div>

      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Bounce Rate</div>
            <div className="metric-value">{metrics.bounceRate?.toFixed(1)}%</div>
            <div className="metric-description">
              Percentage of single-page sessions
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Avg. Session Duration</div>
            <div className="metric-value">
              {formatDuration(metrics.averageSessionDuration)}
            </div>
            <div className="metric-description">Average time per session</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Pages per Session</div>
            <div className="metric-value">{metrics.pagesPerSession}</div>
            <div className="metric-description">Average pages viewed per session</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">CTA Clicks</div>
            <div className="metric-value">
              {metrics.ctaClicks?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Total call-to-action clicks</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Total Sessions</div>
            <div className="metric-value">
              {metrics.totalSessions?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Total number of sessions</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Total Page Views</div>
            <div className="metric-value">
              {metrics.totalPageViews?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Total pages viewed</div>
          </div>
        </div>
      )}

      {pageMetrics.length > 0 && (
        <div className="card">
          <h2>Engagement by Page</h2>
          <div className="table-container">
            <table className="engagement-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Page Views</th>
                  <th>Sessions</th>
                  <th>Bounce Rate</th>
                  <th>Avg. Duration</th>
                  <th>Pages/Session</th>
                </tr>
              </thead>
              <tbody>
                {pageMetrics.map((page, index) => (
                  <tr key={index}>
                    <td>
                      <div className="page-info">
                        <div className="page-title">{page.title}</div>
                        <div className="page-path">{page.path}</div>
                      </div>
                    </td>
                    <td>{page.pageViews?.toLocaleString()}</td>
                    <td>{page.sessions?.toLocaleString()}</td>
                    <td>{page.bounceRate?.toFixed(1)}%</td>
                    <td>{formatDuration(page.avgSessionDuration)}</td>
                    <td>{page.pagesPerSession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngagementMetrics;

