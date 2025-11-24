import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./TechnicalPerformance.css";

const TechnicalPerformance = () => {
  const [performance, setPerformance] = useState(null);
  const [coreWebVitals, setCoreWebVitals] = useState(null);
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
      const [perfRes, vitalsRes] = await Promise.all([
        apiClient.get("/api/analytics/technical", {
          params: {
            startDate: dateRange,
            endDate: "today",
          },
        }),
        apiClient.get("/api/analytics/core-web-vitals", {
          params: {
            startDate: dateRange,
            endDate: "today",
          },
        }),
      ]);

      setPerformance(perfRes.data.data);
      setCoreWebVitals(vitalsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load technical performance");
      console.error("Error fetching technical performance:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatLoadTime = (seconds) => {
    if (!seconds) return "0.00s";
    return `${seconds.toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="technical-performance-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading technical performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="technical-performance-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="technical-performance-page">
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

      {performance && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Avg. Session Duration</div>
              <div className="metric-value">
                {formatLoadTime(performance.overallAvgLoadTime)}
              </div>
              <div className="metric-description">
                Approximated from session duration
                {performance.note && (
                  <span style={{ fontSize: "0.75rem", display: "block", marginTop: "0.25rem", color: "#6b7280" }}>
                    {performance.note}
                  </span>
                )}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">404 Errors</div>
              <div className="metric-value">
                {performance.total404Errors?.toLocaleString() || 0}
              </div>
              <div className="metric-description">Total 404 page views</div>
            </div>
          </div>

          {coreWebVitals && (
            <div className="card">
              <h2>Core Web Vitals</h2>
              {coreWebVitals.available ? (
                <div className="vitals-grid">
                  {Object.entries(coreWebVitals.vitals).map(([name, count]) => (
                    <div key={name} className="vital-card">
                      <div className="vital-name">{name}</div>
                      <div className="vital-value">{count?.toLocaleString()}</div>
                      <div className="vital-description">Events tracked</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="info-message">
                  <p>{coreWebVitals.note}</p>
                </div>
              )}
            </div>
          )}

          {performance.devicePerformance && performance.devicePerformance.length > 0 && (
            <div className="card">
              <h2>Performance by Device</h2>
              <div className="table-container">
                <table className="performance-table">
                  <thead>
                      <tr>
                        <th>Device</th>
                        <th>Avg. Session Duration</th>
                        <th>Page Views</th>
                        <th>Bounce Rate</th>
                      </tr>
                  </thead>
                  <tbody>
                    {performance.devicePerformance.map((device, index) => (
                      <tr key={index}>
                        <td>{device.device}</td>
                        <td>{formatLoadTime(device.avgLoadTime)}</td>
                        <td>{device.views?.toLocaleString()}</td>
                        <td>{device.bounceRate?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {performance.pageLoadTimes && performance.pageLoadTimes.length > 0 && (
            <div className="card">
              <h2>Page Load Times</h2>
              <div className="table-container">
                <table className="performance-table">
                  <thead>
                      <tr>
                        <th>Page</th>
                        <th>Avg. Session Duration</th>
                        <th>Views</th>
                        <th>Bounce Rate</th>
                      </tr>
                  </thead>
                  <tbody>
                    {performance.pageLoadTimes.slice(0, 20).map((page, index) => (
                      <tr key={index}>
                        <td>
                          <div className="page-path">{page.path}</div>
                        </td>
                        <td>{formatLoadTime(page.avgLoadTime)}</td>
                        <td>{page.views?.toLocaleString()}</td>
                        <td>{page.bounceRate?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {performance.errorPages && performance.errorPages.length > 0 && (
            <div className="card">
              <h2>404 Error Pages</h2>
              <div className="table-container">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Views</th>
                      <th>Bounce Rate</th>
                      <th>Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.errorPages.map((page, index) => (
                      <tr key={index}>
                        <td>
                          <div className="page-info">
                            <div className="page-title">{page.title}</div>
                            <div className="page-path">{page.path}</div>
                          </div>
                        </td>
                        <td>{page.views?.toLocaleString()}</td>
                        <td>{page.bounceRate?.toFixed(1)}%</td>
                        <td>{formatLoadTime(page.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TechnicalPerformance;

