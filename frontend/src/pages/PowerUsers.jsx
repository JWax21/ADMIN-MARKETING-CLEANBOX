import React, { useState, useEffect } from "react";
import apiClient from "../api/axios";
import "./PowerUsers.css";

const PowerUsers = () => {
  const [powerUsers, setPowerUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30daysAgo");

  useEffect(() => {
    fetchPowerUsers();
  }, [dateRange]);

  const fetchPowerUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/visitors/power-users", {
        params: {
          startDate: dateRange,
          endDate: "today",
          minSessions: 3,
        },
      });

      if (response.data.success) {
        setPowerUsers(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching power users:", err);
      setError(err.response?.data?.error || "Failed to load power users");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    // Format YYYYMMDD to readable date
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${month}/${day}/${year}`;
    }
    return dateStr;
  };

  const formatLocation = (city, region, country) => {
    const parts = [];
    if (city && city !== "N/A") parts.push(city);
    if (region && region !== "N/A") {
      // Convert state name to abbreviation if needed
      const stateAbbr = getStateAbbreviation(region);
      parts.push(stateAbbr);
    }
    if (country) {
      const countryName = country === "United States" ? "US" : country;
      parts.push(countryName);
    }
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const getStateAbbreviation = (stateName) => {
    const stateMap = {
      Alabama: "AL",
      Alaska: "AK",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      Florida: "FL",
      Georgia: "GA",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Pennsylvania: "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
      "District of Columbia": "DC",
    };
    return stateMap[stateName] || stateName;
  };

  if (loading) {
    return (
      <div className="power-users-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading power users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="power-users-page">
        <div className="error-container">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="power-users-page">
      <div className="power-users-card">
        <div className="power-users-header">
          <div className="power-users-date-range-selector">
            <label htmlFor="date-range">Period:</label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="power-users-date-range-select"
            >
              <option value="7daysAgo">Last 7 Days</option>
              <option value="30daysAgo">Last 30 Days</option>
              <option value="90daysAgo">Last 90 Days</option>
            </select>
          </div>
        </div>
        <div className="power-users-table-container">
          <table className="power-users-table">
            <thead>
              <tr>
                <th className="location-column">Location</th>
                <th>First</th>
                <th>Last</th>
                <th>Sessions</th>
                <th>Page Views</th>
                <th>Avg Duration</th>
                <th>Total Duration</th>
                <th>Engagement Rate</th>
                <th>Bounce Rate</th>
                <th>Active Days</th>
                <th>Device</th>
                <th>Source</th>
                <th>First Page</th>
              </tr>
            </thead>
            <tbody>
              {powerUsers.length > 0 ? (
                powerUsers.map((user, index) => (
                  <tr key={index}>
                    <td className="location-column">
                      {formatLocation(user.city, user.region, user.country)}
                    </td>
                    <td>{formatDate(user.firstVisit)}</td>
                    <td>{formatDate(user.lastVisit)}</td>
                    <td className="number-cell">{formatNumber(user.sessions)}</td>
                    <td className="number-cell">{formatNumber(user.pageViews)}</td>
                    <td className="number-cell">
                      {formatDuration(user.avgSessionDuration)}
                    </td>
                    <td className="number-cell">
                      {formatDuration(user.totalEngagementDuration)}
                    </td>
                    <td className="number-cell">
                      {user.engagementRate?.toFixed(1)}%
                    </td>
                    <td className="number-cell">
                      {user.bounceRate?.toFixed(1)}%
                    </td>
                    <td className="number-cell">{user.uniqueDays}</td>
                    <td>
                      {user.operatingSystem} / {user.browser}
                    </td>
                    <td>{user.sessionSource || "N/A"}</td>
                    <td className="url-cell">
                      {user.landingPage || "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="no-data">
                    No power users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PowerUsers;

