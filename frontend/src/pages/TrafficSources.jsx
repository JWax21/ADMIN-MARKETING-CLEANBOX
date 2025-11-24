import React, { useState, useEffect, useRef } from "react";
import apiClient from "../api/axios";
import { IoIosArrowUp } from "react-icons/io";
import "./TrafficSources.css";

const TrafficSources = () => {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30daysAgo");
  const [activeTab, setActiveTab] = useState("last-touch");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef(null);

  useEffect(() => {
    fetchTrafficSources();
  }, [dateRange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPeriodDropdownOpen &&
        periodDropdownRef.current &&
        !periodDropdownRef.current.contains(event.target)
      ) {
        setIsPeriodDropdownOpen(false);
      }
    };

    if (isPeriodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPeriodDropdownOpen]);

  const fetchTrafficSources = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        startDate: dateRange,
        endDate: "today",
      };

      const response = await apiClient.get("/api/analytics/traffic-sources", {
        params,
      });

      if (response.data.success) {
        setTrafficData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching traffic sources:", error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Calculate totals
  const sessionSources = trafficData?.sessionSources || [];
  const firstTouchSources = trafficData?.firstTouchSources || [];
  const landingPages = trafficData?.landingPages || [];

  const totalSessions = sessionSources.reduce(
    (sum, source) => sum + (source.sessions || 0),
    0
  );
  const totalUsers = sessionSources.reduce(
    (sum, source) => sum + (source.users || 0),
    0
  );

  if (loading && !trafficData) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading traffic sources...</p>
      </div>
    );
  }

  if (error && !trafficData) {
    return (
      <div className="traffic-sources-page">
        <div className="traffic-sources-card">
          <div className="traffic-sources-error-message">
            <h3>⚠️ Error Loading Traffic Sources</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="traffic-sources-page">
      <div className="traffic-sources-header-controls">
        <div className="traffic-sources-period-control-group">
          <label>Period:</label>
          <div className="traffic-sources-custom-dropdown" ref={periodDropdownRef}>
            <div
              className="traffic-sources-custom-dropdown-trigger"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
            >
              <span>
                {dateRange === "7daysAgo"
                  ? "7D"
                  : dateRange === "30daysAgo"
                  ? "30D"
                  : dateRange === "90daysAgo"
                  ? "90D"
                  : "365D"}
              </span>
              <IoIosArrowUp
                className={`traffic-sources-dropdown-arrow ${
                  isPeriodDropdownOpen ? "traffic-sources-arrow-open" : "traffic-sources-arrow-closed"
                }`}
              />
            </div>
            {isPeriodDropdownOpen && (
              <div className="traffic-sources-custom-dropdown-menu">
                <div
                  className={`traffic-sources-custom-dropdown-item ${
                    dateRange === "7daysAgo" ? "traffic-sources-selected" : ""
                  }`}
                  onClick={() => {
                    setDateRange("7daysAgo");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  <span>7D</span>
                </div>
                <div
                  className={`traffic-sources-custom-dropdown-item ${
                    dateRange === "30daysAgo" ? "traffic-sources-selected" : ""
                  }`}
                  onClick={() => {
                    setDateRange("30daysAgo");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  <span>30D</span>
                </div>
                <div
                  className={`traffic-sources-custom-dropdown-item ${
                    dateRange === "90daysAgo" ? "traffic-sources-selected" : ""
                  }`}
                  onClick={() => {
                    setDateRange("90daysAgo");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  <span>90D</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {trafficData && (
          <div className="traffic-sources-summary-stats">
          <div className="traffic-summary-card">
            <div className="traffic-summary-label">Total Sources</div>
            <div className="traffic-summary-value">{sessionSources.length}</div>
          </div>
          <div className="traffic-summary-card">
            <div className="traffic-summary-label">Total Sessions</div>
            <div className="traffic-summary-value">{formatNumber(totalSessions)}</div>
          </div>
          <div className="traffic-summary-card">
            <div className="traffic-summary-label">Total Users</div>
            <div className="traffic-summary-value">{formatNumber(totalUsers)}</div>
          </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {trafficData && (
        <div className="traffic-sources-tabs">
          <button
            className={`traffic-sources-tab ${activeTab === "last-touch" ? "traffic-sources-active" : ""}`}
            onClick={() => setActiveTab("last-touch")}
          >
            Last-Touch Attribution
          </button>
          <button
            className={`traffic-sources-tab ${activeTab === "first-touch" ? "traffic-sources-active" : ""}`}
            onClick={() => setActiveTab("first-touch")}
          >
            First-Touch Attribution
          </button>
          <button
            className={`traffic-sources-tab ${activeTab === "landing-pages" ? "traffic-sources-active" : ""}`}
            onClick={() => setActiveTab("landing-pages")}
          >
            Landing Pages
          </button>
        </div>
      )}

      {/* Last-Touch Attribution Table */}
      {activeTab === "last-touch" && (
        <div className="traffic-sources-card">
          <div className="traffic-sources-data-table">
            {sessionSources.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Channel Group</th>
                    <th>Sessions</th>
                    <th>Users</th>
                    <th>Sessions %</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionSources.map((source, index) => {
                    const sessionsPercent =
                      totalSessions > 0
                        ? ((source.sessions / totalSessions) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={index}>
                        <td>
                          <div className="traffic-sources-source-with-favicon">
                            <img
                              src={`https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${source.source}&size=32`}
                              alt=""
                              className="traffic-sources-source-favicon"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                            <span>{source.source}</span>
                          </div>
                        </td>
                        <td>
                          <span className="traffic-sources-medium-badge">{source.medium}</span>
                        </td>
                        <td>
                          <span className="traffic-sources-channel-badge">{source.channelGroup}</span>
                        </td>
                        <td className="traffic-sources-number-cell">
                          {formatNumber(source.sessions)}
                        </td>
                        <td className="traffic-sources-number-cell">
                          {formatNumber(source.users)}
                        </td>
                        <td className="traffic-sources-number-cell">
                          <div className="traffic-sources-percentage-cell">
                            <span>{sessionsPercent}%</span>
                            <div className="traffic-sources-percentage-bar">
                              <div
                                className="traffic-sources-percentage-fill"
                                style={{ width: `${sessionsPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="traffic-sources-text-muted">No traffic source data available</p>
            )}
          </div>
        </div>
      )}

      {/* First-Touch Attribution Table */}
      {activeTab === "first-touch" && (
        <div className="traffic-sources-card">
          <div className="traffic-sources-data-table">
            {firstTouchSources.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Sessions</th>
                    <th>Users</th>
                    <th>New Users</th>
                    <th>Sessions %</th>
                  </tr>
                </thead>
                <tbody>
                  {firstTouchSources.map((source, index) => {
                    const totalFirstTouchSessions = firstTouchSources.reduce(
                      (sum, s) => sum + (s.sessions || 0),
                      0
                    );
                    const sessionsPercent =
                      totalFirstTouchSessions > 0
                        ? ((source.sessions / totalFirstTouchSessions) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={index}>
                        <td>
                          <div className="traffic-sources-source-with-favicon">
                            <img
                              src={`https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${source.source}&size=32`}
                              alt=""
                              className="traffic-sources-source-favicon"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                            <span>{source.source}</span>
                          </div>
                        </td>
                        <td>
                          <span className="traffic-sources-medium-badge">{source.medium}</span>
                        </td>
                        <td className="traffic-sources-number-cell">
                          {formatNumber(source.sessions)}
                        </td>
                        <td className="traffic-sources-number-cell">
                          {formatNumber(source.users)}
                        </td>
                        <td className="traffic-sources-number-cell">
                          {formatNumber(source.newUsers)}
                        </td>
                        <td className="traffic-sources-number-cell">
                          <div className="traffic-sources-percentage-cell">
                            <span>{sessionsPercent}%</span>
                            <div className="traffic-sources-percentage-bar">
                              <div
                                className="traffic-sources-percentage-fill"
                                style={{ width: `${sessionsPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="traffic-sources-text-muted">No first-touch data available</p>
            )}
          </div>
        </div>
      )}

      {/* Landing Pages Table */}
      {activeTab === "landing-pages" && (
        <div className="traffic-sources-card">
          <div className="traffic-sources-data-table">
            {landingPages.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Landing Page</th>
                    <th>Sessions</th>
                    <th>Users</th>
                    <th>New Users</th>
                    <th>Bounce Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPages.map((page, index) => (
                    <tr key={index}>
                      <td>{page.landingPage}</td>
                      <td className="traffic-sources-number-cell">
                        {formatNumber(page.sessions)}
                      </td>
                      <td className="traffic-sources-number-cell">
                        {formatNumber(page.users)}
                      </td>
                      <td className="traffic-sources-number-cell">
                        {formatNumber(page.newUsers)}
                      </td>
                      <td className="traffic-sources-number-cell">
                        {page.bounceRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="traffic-sources-text-muted">No landing page data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficSources;

