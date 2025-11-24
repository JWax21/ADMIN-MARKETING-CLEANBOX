import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./ContentInsights.css";

const ContentInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30daysAgo");
  const [activeTab, setActiveTab] = useState("exits");

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/analytics/content", {
        params: {
          startDate: dateRange,
          endDate: "today",
        },
      });

      setInsights(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load content insights");
      console.error("Error fetching content insights:", err);
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
      <div className="content-insights-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading content insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-insights-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-insights-page">
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

      {insights && (
        <>
          <div className="tabs">
            <button
              className={`tab ${activeTab === "exits" ? "active" : ""}`}
              onClick={() => setActiveTab("exits")}
            >
              Top Exit Pages
            </button>
            <button
              className={`tab ${activeTab === "engagement" ? "active" : ""}`}
              onClick={() => setActiveTab("engagement")}
            >
              High Engagement Pages
            </button>
            <button
              className={`tab ${activeTab === "flows" ? "active" : ""}`}
              onClick={() => setActiveTab("flows")}
            >
              User Flows
            </button>
            {insights.contentGrouping && insights.contentGrouping.length > 0 && (
              <button
                className={`tab ${activeTab === "grouping" ? "active" : ""}`}
                onClick={() => setActiveTab("grouping")}
              >
                Content Grouping
              </button>
            )}
          </div>

          {activeTab === "exits" && (
            <div className="card">
              <h2>Top Exit Pages</h2>
              <div className="table-container">
                <table className="insights-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Exits</th>
                      <th>Views</th>
                      <th>Exit Rate</th>
                      <th>Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.topExitPages?.map((page, index) => (
                      <tr key={index}>
                        <td>
                          <div className="page-info">
                            <div className="page-title">{page.title}</div>
                            <div className="page-path">{page.path}</div>
                          </div>
                        </td>
                        <td>{page.exits?.toLocaleString()}</td>
                        <td>{page.views?.toLocaleString()}</td>
                        <td>{page.exitRate}%</td>
                        <td>{formatDuration(page.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "engagement" && (
            <div className="card">
              <h2>High Engagement Pages</h2>
              <div className="table-container">
                <table className="insights-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Views</th>
                      <th>Sessions</th>
                      <th>Avg. Duration</th>
                      <th>Total Engagement</th>
                      <th>Engagement/View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.highEngagementPages?.map((page, index) => (
                      <tr key={index}>
                        <td>
                          <div className="page-info">
                            <div className="page-title">{page.title}</div>
                            <div className="page-path">{page.path}</div>
                          </div>
                        </td>
                        <td>{page.views?.toLocaleString()}</td>
                        <td>{page.sessions?.toLocaleString()}</td>
                        <td>{formatDuration(page.avgDuration)}</td>
                        <td>{formatDuration(page.totalEngagement)}</td>
                        <td>{formatDuration(page.engagementPerView)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "flows" && (
            <div className="card">
              <h2>User Flows</h2>
              <div className="table-container">
                <table className="insights-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Total Views</th>
                      <th>Top Sources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.userFlows?.map((flow, index) => (
                      <tr key={index}>
                        <td>
                          <div className="page-info">
                            <div className="page-path">{flow.page}</div>
                          </div>
                        </td>
                        <td>{flow.totalViews?.toLocaleString()}</td>
                        <td>
                          <div className="sources-list">
                            {flow.sources?.map((source, sIndex) => (
                              <div key={sIndex} className="source-item">
                                <span className="source-from">{source.from}</span>
                                <span className="source-views">
                                  ({source.views} views)
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "grouping" && insights.contentGrouping && (
            <div className="card">
              <h2>Content Grouping</h2>
              <p className="text-muted" style={{ marginBottom: "1rem" }}>
                Content grouping data (if configured in GA4)
              </p>
              <div className="table-container">
                <table className="insights-table">
                  <thead>
                    <tr>
                      <th>Content Group 1</th>
                      <th>Content Group 2</th>
                      <th>Page Views</th>
                      <th>Sessions</th>
                      <th>Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.contentGrouping.map((group, index) => (
                      <tr key={index}>
                        <td>{group.group1}</td>
                        <td>{group.group2}</td>
                        <td>{group.pageViews?.toLocaleString()}</td>
                        <td>{group.sessions?.toLocaleString()}</td>
                        <td>{group.users?.toLocaleString()}</td>
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

export default ContentInsights;

