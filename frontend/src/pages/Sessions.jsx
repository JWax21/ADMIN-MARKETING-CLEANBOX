import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./Sessions.css";

const Sessions = () => {
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
      const response = await apiClient.get("/api/analytics/sessions", {
        params: {
          startDate: dateRange,
          endDate: "today",
        },
      });

      setMetrics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load session metrics");
      console.error("Error fetching session metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="sessions-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading session metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sessions-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="sessions-page">
        <div className="error-container">
          <p>No session metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-page">
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

      <div className="card">
        <div className="sessions-metrics-list">
          <div className="session-metric-item">
            <span className="metric-label">Average session duration</span>
            <span className="metric-value">
              {formatDuration(metrics.averageSessionDuration)}
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Bounce rate</span>
            <span className="metric-value">
              {metrics.bounceRate?.toFixed(2)}%
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Engaged sessions</span>
            <span className="metric-value">
              {metrics.engagedSessions?.toLocaleString()}
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Engaged sessions per active user</span>
            <span className="metric-value">
              {metrics.engagedSessionsPerActiveUser?.toFixed(2)}
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Engagement rate</span>
            <span className="metric-value">
              {metrics.engagementRate?.toFixed(2)}%
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Session key event rate</span>
            <span className="metric-value">
              {metrics.sessionKeyEventRate !== null
                ? `${metrics.sessionKeyEventRate.toFixed(2)}%`
                : "N/A (Key events not configured)"}
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Sessions</span>
            <span className="metric-value">
              {metrics.sessions?.toLocaleString()}
            </span>
          </div>
          <div className="session-metric-item">
            <span className="metric-label">Sessions per active user</span>
            <span className="metric-value">
              {metrics.sessionsPerActiveUser?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sessions;

