import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./SEOMetrics.css";

const SEOMetrics = () => {
  const [metrics, setMetrics] = useState(null);
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
      const response = await apiClient.get("/api/analytics/seo", {
        params: {
          startDate: dateRange,
          endDate: "today",
        },
      });

      setMetrics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load SEO metrics");
      console.error("Error fetching SEO metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="seo-metrics-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading SEO metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seo-metrics-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seo-metrics-page">
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
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Organic Sessions</div>
              <div className="metric-value">
                {metrics.organicSearch?.totalSessions?.toLocaleString() || 0}
              </div>
              <div className="metric-description">
                {metrics.organicSearch?.totalUsers?.toLocaleString() || 0} users
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Keywords</div>
              <div className="metric-value">
                {metrics.keywords?.total?.toLocaleString() || 0}
              </div>
              <div className="metric-description">Keywords tracked</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Referring Domains</div>
              <div className="metric-value">
                {metrics.referringDomains?.total?.toLocaleString() || 0}
              </div>
              <div className="metric-description">External domains linking to site</div>
            </div>
          </div>

          {metrics.organicSearch?.sources && metrics.organicSearch.sources.length > 0 && (
            <div className="card">
              <h2>Organic Search Sources</h2>
              <div className="table-container">
                <table className="seo-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Medium</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.organicSearch.sources.map((source, index) => (
                      <tr key={index}>
                        <td>{source.source}</td>
                        <td>{source.medium}</td>
                        <td>{source.sessions?.toLocaleString()}</td>
                        <td>{source.users?.toLocaleString()}</td>
                        <td>{source.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metrics.keywords?.topKeywords && metrics.keywords.topKeywords.length > 0 && (
            <div className="card">
              <h2>Top Keywords</h2>
              <div className="table-container">
                <table className="seo-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Sessions</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.keywords.topKeywords.map((keyword, index) => (
                      <tr key={index}>
                        <td>{keyword.keyword}</td>
                        <td>{keyword.sessions?.toLocaleString()}</td>
                        <td>{keyword.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metrics.referringDomains?.domains && metrics.referringDomains.domains.length > 0 && (
            <div className="card">
              <h2>Referring Domains (Backlinks Alternative)</h2>
              {metrics.referringDomains.note && (
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                  {metrics.referringDomains.note}
                </p>
              )}
              <div className="table-container">
                <table className="seo-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.referringDomains.domains.map((domain, index) => (
                      <tr key={index}>
                        <td>{domain.domain}</td>
                        <td>{domain.sessions?.toLocaleString()}</td>
                        <td>{domain.users?.toLocaleString()}</td>
                        <td>{domain.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metrics.searchConsoleLinks && (
            <div className="info-card">
              <h3>Search Console Links Data</h3>
              <p>
                {metrics.searchConsoleLinks.apiAvailable
                  ? "Links data from Search Console API"
                  : metrics.searchConsoleLinks.externalLinks?.note ||
                    "The Links report shown in Google Search Console UI is not available through the API. You can manually export this data from the Search Console interface, or use the referring domains data above from GA4."}
              </p>
            </div>
          )}

          {metrics.note && (
            <div className="info-card">
              <h3>Additional SEO Data</h3>
              <p>{metrics.note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SEOMetrics;

