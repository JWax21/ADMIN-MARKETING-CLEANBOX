import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./ConversionMetrics.css";

const ConversionMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [sourceMetrics, setSourceMetrics] = useState([]);
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
      const [metricsRes, sourcesRes] = await Promise.all([
        apiClient.get("/api/analytics/conversion", {
          params: {
            startDate: dateRange,
            endDate: "today",
          },
        }),
        apiClient.get("/api/analytics/conversion/by-source", {
          params: {
            startDate: dateRange,
            endDate: "today",
          },
        }),
      ]);

      setMetrics(metricsRes.data.data);
      setSourceMetrics(sourcesRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load conversion metrics");
      console.error("Error fetching conversion metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="conversion-metrics-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading conversion metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversion-metrics-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversion-metrics-page">
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
            <div className="metric-label">Conversion Rate</div>
            <div className="metric-value">{metrics.conversionRate}%</div>
            <div className="metric-description">
              {metrics.totalConversions} conversions from {metrics.totalSessions} sessions
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Total Conversions</div>
            <div className="metric-value">
              {metrics.totalConversions?.toLocaleString() || 0}
            </div>
            <div className="metric-description">All conversion events</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Form Submissions</div>
            <div className="metric-value">
              {metrics.formSubmissions?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Total form submissions</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Email Opt-ins</div>
            <div className="metric-value">
              {metrics.emailOptIns?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Newsletter signups</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Purchases</div>
            <div className="metric-value">
              {metrics.purchases?.toLocaleString() || 0}
            </div>
            <div className="metric-description">Total purchases</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value">
              ${metrics.revenue?.toLocaleString() || "0.00"}
            </div>
            <div className="metric-description">Total revenue</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Cart Abandonment Rate</div>
            <div className="metric-value">{metrics.cartAbandonmentRate}%</div>
            <div className="metric-description">
              {metrics.addToCart} add to cart events
            </div>
          </div>
        </div>
      )}

      {sourceMetrics.length > 0 && (
        <div className="card">
          <h2>Conversions by Source</h2>
          <div className="table-container">
            <table className="conversion-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Medium</th>
                  <th>Conversions</th>
                  <th>Sessions</th>
                  <th>Users</th>
                  <th>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceMetrics.map((source, index) => (
                  <tr key={index}>
                    <td>{source.source}</td>
                    <td>{source.medium}</td>
                    <td>{source.conversions?.toLocaleString()}</td>
                    <td>{source.sessions?.toLocaleString()}</td>
                    <td>{source.users?.toLocaleString()}</td>
                    <td>{source.conversionRate}%</td>
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

export default ConversionMetrics;

