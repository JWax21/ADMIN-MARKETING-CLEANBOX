import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import GeographyHeatmap from "../components/GeographyHeatmap";
import "./AudienceProfile.css";

const AudienceProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30daysAgo");
  const [activeTab, setActiveTab] = useState("geography");

  const getDateRangeLabel = (range) => {
    const labels = {
      "7daysAgo": "Last 7 Days",
      "30daysAgo": "Last 30 Days",
      "90daysAgo": "Last 90 Days",
    };
    return labels[range] || range;
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/analytics/audience", {
        params: {
          startDate: dateRange,
          endDate: "today",
        },
      });

      setProfile(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load audience profile");
      console.error("Error fetching audience profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="audience-profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading audience profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audience-profile-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audience-profile-page">
      {profile && (
        <>
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
            <div className="audience-summary-cards">
              <div className="audience-summary-card">
                <div className="audience-summary-label">Total Users</div>
                <div className="audience-summary-value">
                  {profile.overview?.activeUsers?.toLocaleString() || profile.totals?.users?.toLocaleString() || 0}
                </div>
              </div>
              <div className="audience-summary-card">
                <div className="audience-summary-label">Total Sessions</div>
                <div className="audience-summary-value">
                  {profile.overview?.sessions?.toLocaleString() || profile.totals?.sessions?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === "geography" ? "active" : ""}`}
              onClick={() => setActiveTab("geography")}
            >
              Geography
            </button>
            <button
              className={`tab ${activeTab === "device" ? "active" : ""}`}
              onClick={() => setActiveTab("device")}
            >
              Device
            </button>
            {profile.demographics && (
            <button
              className={`tab ${activeTab === "demographics" ? "active" : ""}`}
              onClick={() => setActiveTab("demographics")}
            >
              Demographics
            </button>
            )}
            <button
              className={`tab ${activeTab === "time" ? "active" : ""}`}
              onClick={() => setActiveTab("time")}
            >
              Time Analysis
            </button>
          </div>

          {activeTab === "geography" && (
            <>
              <div className="card">
                <div className="geographic-heatmap-header">
                  <h2>Geographic Heatmap</h2>
                  {(() => {
                    // Calculate US vs Non-US users
                    const usUsers = (profile.geographic || []).reduce((sum, geo) => {
                      const country = geo.country || "";
                      const countryLower = country.toLowerCase();
                      if (
                        country === "United States" ||
                        countryLower.includes("united states") ||
                        countryLower === "us" ||
                        countryLower === "usa"
                      ) {
                        return sum + (geo.users || 0);
                      }
                      return sum;
                    }, 0);
                    const nonUsUsers = (profile.geographic || []).reduce((sum, geo) => {
                      const country = geo.country || "";
                      const countryLower = country.toLowerCase();
                      if (
                        country !== "United States" &&
                        !countryLower.includes("united states") &&
                        countryLower !== "us" &&
                        countryLower !== "usa"
                      ) {
                        return sum + (geo.users || 0);
                      }
                      return sum;
                    }, 0);
                    return (
                      <div className="geographic-heatmap-stats">
                        US: {usUsers.toLocaleString()} | Non-U.S.: {nonUsUsers.toLocaleString()}
                      </div>
                    );
                  })()}
                </div>
                <GeographyHeatmap geographicData={profile.geographic} />
              </div>
              <h2>Geographic Breakdown</h2>
              <div className="table-container">
                <table className="audience-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>Region</th>
                      <th>Users</th>
                      <th>Sessions</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.geographic?.map((geo, index) => (
                      <tr key={index}>
                        <td>{geo.country}</td>
                        <td>{geo.region}</td>
                        <td>{geo.users?.toLocaleString()}</td>
                        <td>{geo.sessions?.toLocaleString()}</td>
                        <td>{geo.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "device" && (
            <>
              <h2>Device Breakdown</h2>
              <div className="table-container">
                <table className="audience-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Screen Resolution</th>
                      <th>Users</th>
                      <th>% of Users</th>
                      <th>Sessions</th>
                      <th>% of Sessions</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.device?.map((device, index) => (
                      <tr key={index}>
                        <td>{device.device}</td>
                        <td>{device.screenResolution || "N/A"}</td>
                        <td>{device.users?.toLocaleString()}</td>
                        <td>{device.userPercentage}%</td>
                        <td>{device.sessions?.toLocaleString()}</td>
                        <td>{device.sessionPercentage}%</td>
                        <td>{device.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "demographics" && profile.demographics && (
            <div className="demographics-section">
              {profile.visitorType && profile.visitorType.length > 0 && (
                <>
                  <h2>New vs Returning Visitors</h2>
                  <div className="table-container">
                    <table className="audience-table">
                      <thead>
                        <tr>
                          <th>Visitor Type</th>
                          <th>Users</th>
                          <th>Sessions</th>
                          <th>Page Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.visitorType.map((visitor, index) => (
                          <tr key={index}>
                            <td>{visitor.type}</td>
                            <td>{visitor.users?.toLocaleString()}</td>
                            <td>{visitor.sessions?.toLocaleString()}</td>
                            <td>{visitor.pageViews?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {profile.language && profile.language.length > 0 && (
                <>
                  <h2>Language Distribution</h2>
                  <div className="table-container">
                    <table className="audience-table">
                      <thead>
                        <tr>
                          <th>Language</th>
                          <th>Users</th>
                          <th>Sessions</th>
                          <th>Page Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.language.map((lang, index) => (
                          <tr key={index}>
                            <td>{lang.language}</td>
                            <td>{lang.users?.toLocaleString()}</td>
                            <td>{lang.sessions?.toLocaleString()}</td>
                            <td>{lang.pageViews?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {profile.newReturningMetrics && (
                <div className="card">
                  <h2>New vs Returning Users</h2>
                  <div className="overview-metrics-grid">
                    <div className="overview-metric-card">
                      <div className="overview-metric-label">New Users</div>
                      <div className="overview-metric-value">
                        {profile.newReturningMetrics.newUsers?.toLocaleString()}
                      </div>
                    </div>
                    <div className="overview-metric-card">
                      <div className="overview-metric-label">Returning Users</div>
                      <div className="overview-metric-value">
                        {profile.newReturningMetrics.returningUsers?.toLocaleString()}
                      </div>
                    </div>
                    <div className="overview-metric-card">
                      <div className="overview-metric-label">Total Users</div>
                      <div className="overview-metric-value">
                        {profile.newReturningMetrics.totalUsers?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {profile.demographics.ageBrackets && profile.demographics.ageBrackets.length > 0 && (
                <>
                  <h2>Age Distribution (userAgeBracket)</h2>
                  <div className="table-container">
                    <table className="audience-table">
                      <thead>
                        <tr>
                          <th>Age Bracket</th>
                          <th>Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.demographics.ageBrackets.map((ageData, index) => (
                          <tr key={index}>
                            <td>{ageData.bracket}</td>
                            <td>{ageData.users?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {profile.demographics.genders && profile.demographics.genders.length > 0 && (
                <>
                  <h2>Gender Distribution (userGender)</h2>
                  <div className="table-container">
                    <table className="audience-table">
                      <thead>
                        <tr>
                          <th>Gender</th>
                          <th>Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.demographics.genders.map((genderData, index) => (
                          <tr key={index}>
                            <td>{genderData.gender}</td>
                            <td>{genderData.users?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "time" && profile.timeAnalysis && (
            <>
              <h2>Traffic by Hour of Day</h2>
              <div className="table-container">
                <table className="audience-table">
                  <thead>
                    <tr>
                      <th>Hour</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.timeAnalysis.byHour?.map((hour, index) => (
                      <tr key={index}>
                        <td>{hour.hour}:00</td>
                        <td>{hour.sessions?.toLocaleString()}</td>
                        <td>{hour.users?.toLocaleString()}</td>
                        <td>{hour.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h2>Traffic by Day of Week</h2>
              <div className="table-container">
                <table className="audience-table">
                  <thead>
                    <tr>
                      <th>Day of Week</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th>Page Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.timeAnalysis.byDayOfWeek?.map((day, index) => (
                      <tr key={index}>
                        <td>{day.dayOfWeek}</td>
                        <td>{day.sessions?.toLocaleString()}</td>
                        <td>{day.users?.toLocaleString()}</td>
                        <td>{day.pageViews?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AudienceProfile;

