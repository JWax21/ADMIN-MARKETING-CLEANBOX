import React, { useState, useEffect, useRef } from "react";
import apiClient from "../api/axios";
import VisitorDetailsPanel from "../components/VisitorDetailsPanel";
import { detectDeviceModel } from "../utils/deviceDetection";
import { IoIosArrowUp } from "react-icons/io";
import "./Visitors.css";

const Visitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dateRange, setDateRange] = useState("7daysAgo");
  const [hoveredBar, setHoveredBar] = useState(null);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef(null);

  useEffect(() => {
    fetchVisitors();
    fetchDailyTrends();
    fetchMetrics();
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

  const fetchVisitors = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        startDate: dateRange,
        endDate: "today",
        limit: 100,
      };

      const response = await apiClient.get("/api/visitors", { params });

      if (response.data.success) {
        setVisitors(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching visitors:", error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyTrends = async () => {
    try {
      const params = {
        startDate: dateRange,
        endDate: "today",
      };

      const response = await apiClient.get("/api/visitors/daily-trends", { params });

      if (response.data.success) {
        setDailyTrends(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching daily trends:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const params = {
        startDate: dateRange,
        endDate: "today",
      };

      const response = await apiClient.get("/api/analytics/sessions", { params });

      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };


  const handleRowClick = async (visitor) => {
    try {
      console.log("Row clicked, visitor:", visitor);
      setLoading(true);
      const params = {
        startDate: dateRange,
        endDate: "today",
      };

      console.log("Fetching visitor details for ID:", visitor.id);
      const response = await apiClient.get(`/api/visitors/${encodeURIComponent(visitor.id)}`, {
        params,
      });

      console.log("Visitor details response:", response.data);
      if (response.data.success) {
        const visitorDetails = response.data.data;
        setSelectedVisitor(visitorDetails);
        setIsPanelOpen(true);
        
        // Update the visitor in the list with the actual landing page if it was empty
        if (visitorDetails.actualLandingPage && !visitor.landingPage) {
          setVisitors(prevVisitors => 
            prevVisitors.map(v => 
              v.id === visitor.id 
                ? { ...v, landingPage: visitorDetails.actualLandingPage }
                : v
            )
          );
        }
        
        console.log("Panel should be open, isPanelOpen:", true, "selectedVisitor:", visitorDetails);
      } else {
        console.error("Response not successful:", response.data);
      }
    } catch (error) {
      console.error("Error fetching visitor details:", error);
      console.error("Error details:", error.response?.data);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Convert state name to 2-letter abbreviation
  const getStateAbbreviation = (stateName) => {
    if (!stateName || stateName === "N/A" || stateName === "(not set)") return "";
    
    const stateMap = {
      "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
      "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
      "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
      "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
      "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
      "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
      "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
      "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
      "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
      "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
      "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
      "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
      "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
    };
    
    return stateMap[stateName] || stateName;
  };

  const formatLocation = (city, region, country) => {
    const parts = [];
    
    if (city && city !== "N/A" && city !== "(not set)") {
      parts.push(city);
    }
    
    if (region && region !== "N/A" && region !== "(not set)") {
      const stateAbbr = getStateAbbreviation(region);
      if (stateAbbr) parts.push(stateAbbr);
    }
    
    if (country && country !== "N/A") {
      const countryDisplay = country === "United States" ? "US" : country;
      parts.push(countryDisplay);
    }
    
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const formatDeviceInfo = (deviceCategory, deviceBrand, deviceModel, operatingSystem, browser) => {
    const parts = [];
    
    // Type (mobile or desktop)
    const type = deviceCategory ? deviceCategory.charAt(0).toUpperCase() + deviceCategory.slice(1) : "N/A";
    parts.push(type);
    
    // Device type - try to estimate using device detection table
    let deviceType = "N/A";
    
    try {
      // Use device detection to estimate device model
      const estimatedDevice = detectDeviceModel({
        deviceCategory: deviceCategory?.toLowerCase(),
        operatingSystem: operatingSystem,
        browser: browser,
        // If we have brand/model from GA4, use it as a hint
        deviceBrand: deviceBrand && deviceBrand !== "N/A" && deviceBrand !== "N/A (Desktop)" ? deviceBrand : undefined,
        deviceModel: deviceModel && deviceModel !== "N/A" && deviceModel !== "N/A (Desktop)" ? deviceModel : undefined,
      });
      
      // Use detected model if confidence is reasonable
      if (estimatedDevice.detectedModel && estimatedDevice.detectedModel !== "Unknown") {
        deviceType = estimatedDevice.detectedModel;
      } else if (deviceBrand && deviceBrand !== "N/A" && deviceBrand !== "N/A (Desktop)") {
        // Fallback to GA4 brand/model if detection didn't work
        if (deviceModel && deviceModel !== "N/A" && deviceModel !== "N/A (Desktop)") {
          deviceType = `${deviceBrand} ${deviceModel}`;
        } else {
          deviceType = deviceBrand;
        }
      }
    } catch (error) {
      console.warn("Device detection error:", error);
      // Fallback to GA4 brand/model
      if (deviceBrand && deviceBrand !== "N/A" && deviceBrand !== "N/A (Desktop)") {
        if (deviceModel && deviceModel !== "N/A" && deviceModel !== "N/A (Desktop)") {
          deviceType = `${deviceBrand} ${deviceModel}`;
        } else {
          deviceType = deviceBrand;
        }
      }
    }
    
    parts.push(deviceType);
    
    // OS
    parts.push(operatingSystem || "N/A");
    
    // Browser
    parts.push(browser || "N/A");
    
    return parts.join(" | ");
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
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

  const isToday = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return false;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}${month}${day}`;
    return dateStr === todayStr;
  };

  if (loading && visitors.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading visitors...</p>
      </div>
    );
  }

  if (error && visitors.length === 0) {
    return (
      <div className="visitors-page">
        <div className="card">
          <div className="error-message">
            <h3>⚠️ Error Loading Visitors</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="visitors-page">
      <div className="visitors-header-controls">
        <div className="period-control-group">
          <label>Period:</label>
          <div className="custom-dropdown" ref={periodDropdownRef}>
            <div
              className="custom-dropdown-trigger"
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
                className={`dropdown-arrow ${
                  isPeriodDropdownOpen ? "arrow-open" : "arrow-closed"
                }`}
              />
            </div>
            {isPeriodDropdownOpen && (
              <div className="custom-dropdown-menu">
                <div
                  className={`custom-dropdown-item ${
                    dateRange === "7daysAgo" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setDateRange("7daysAgo");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  <span>7D</span>
                </div>
                <div
                  className={`custom-dropdown-item ${
                    dateRange === "30daysAgo" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setDateRange("30daysAgo");
                    setIsPeriodDropdownOpen(false);
                  }}
                >
                  <span>30D</span>
                </div>
                <div
                  className={`custom-dropdown-item ${
                    dateRange === "90daysAgo" ? "selected" : ""
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
        
        {metrics && (
          <div className="visitors-metrics">
            {dailyTrends.length > 0 && (
              <div className="visitor-metric-card">
                <div className="visitor-metric-label">Today</div>
                <div className="visitor-metric-value">
                  {formatNumber(dailyTrends[dailyTrends.length - 1]?.total || 0)}
                </div>
              </div>
            )}
            <div className="visitor-metric-card">
              <div className="visitor-metric-label">Total Unique Visitors</div>
              <div className="visitor-metric-value">
                {formatNumber(metrics.activeUsers)}
              </div>
            </div>
            <div className="visitor-metric-card">
              <div className="visitor-metric-label">Engagement Rate</div>
              <div className="visitor-metric-value">
                {metrics.engagementRate ? metrics.engagementRate.toFixed(1) : "N/A"}%
              </div>
            </div>
            <div className="visitor-metric-card">
              <div className="visitor-metric-label">Bounce Rate</div>
              <div className="visitor-metric-value">
                {metrics.bounceRate ? metrics.bounceRate.toFixed(1) : "N/A"}%
              </div>
            </div>
            <div className="visitor-metric-card">
              <div className="visitor-metric-label">Average Duration</div>
              <div className="visitor-metric-value">
                {formatDuration(metrics.averageSessionDuration)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Trends Chart */}
      <div className="card trend-card">
        <div className="trend-chart">
          {dailyTrends.length > 0 ? (
            <div className="trend-chart-container">
              {/* Y-axis labels */}
              <div className="y-axis">
                {(() => {
                  const maxTotal = Math.max(
                    ...dailyTrends.map((d) => d.total),
                    100
                  );
                  const minTotal = 0;
                  const range = maxTotal - minTotal;
                  const steps = 5;
                  const stepValue = Math.ceil(range / steps);
                  return Array.from({ length: steps + 1 }, (_, i) => {
                    const value = minTotal + stepValue * (steps - i);
                    return (
                      <div key={i} className="y-axis-label">
                        {formatNumber(value)}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Chart area with grid lines */}
              <div className="chart-area">
                {/* Grid lines */}
                <div className="grid-lines">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="grid-line"></div>
                  ))}
                </div>

                {/* Stacked Bars */}
                <div className="trend-bars">
                  {dailyTrends.slice(-30).map((day, index) => {
                    const maxTotal = Math.max(
                      ...dailyTrends.map((d) => d.total),
                      100
                    );
                    const totalBarHeight = ((day.new + day.returning) / maxTotal) * 100;
                    const returningPercent = day.total > 0 ? (day.returning / day.total) * 100 : 0;
                    const newPercent = day.total > 0 ? (day.new / day.total) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="trend-bar-container"
                        onMouseEnter={() => setHoveredBar(index)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <div
                          className="trend-bar-stacked"
                          style={{
                            height: `${totalBarHeight}%`,
                          }}
                        >
                          {/* Returning visitors (bottom segment) */}
                          {day.returning > 0 && (
                            <div
                              className="trend-bar-segment returning"
                              style={{
                                height: `${returningPercent}%`,
                                minHeight: "2px",
                              }}
                            ></div>
                          )}
                          {/* New visitors (top segment) */}
                          {day.new > 0 && (
                            <div
                              className="trend-bar-segment new"
                              style={{
                                height: `${newPercent}%`,
                                minHeight: "2px",
                              }}
                            ></div>
                          )}
                          {hoveredBar === index && (
                            <div className="bar-tooltip">
                              <div className="tooltip-date">
                                {formatDate(day.date)}
                              </div>
                              <div className="tooltip-value">
                                New: {formatNumber(day.new)}
                              </div>
                              <div className="tooltip-value">
                                Returning: {formatNumber(day.returning)}
                              </div>
                              <div className="tooltip-value total">
                                Total: {formatNumber(day.total)}
                              </div>
                            </div>
                          )}
                        </div>
                        {index % 5 === 0 && (
                          <span className="trend-label">
                            {formatDate(day.date)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="visitors-table-container">
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>First Page</th>
                <th>Location</th>
                <th>Source</th>
                <th>Sessions</th>
                <th>Page Views</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length > 0 ? (
                visitors.map((visitor, index) => (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(visitor)}
                    className={`visitor-row ${isToday(visitor.date) ? 'today-row' : ''}`}
                  >
                    <td>{formatDate(visitor.date)}</td>
                    <td>
                      <span
                        className={`visitor-type ${
                          visitor.newVsReturning === "new"
                            ? "visitor-type-new"
                            : "visitor-type-returning"
                        }`}
                      >
                        {visitor.newVsReturning === "new" ? "New" : visitor.newVsReturning === "returning" ? "Return" : "N/A"}
                      </span>
                    </td>
                    <td>
                      <div className="first-page-info">
                        {visitor.landingPage && visitor.landingPage !== "(not set)" ? (
                          <span className="first-page-url">{visitor.landingPage}</span>
                        ) : (
                          <span className="first-page-url">N/A</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {formatLocation(visitor.city, visitor.region, visitor.country)}
                    </td>
                    <td>
                      <div className="source-info">
                        <span className="source">
                          {visitor.sessionSource || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="number-cell">
                      {formatNumber(visitor.sessions)}
                    </td>
                    <td className="number-cell">
                      {formatNumber(visitor.pageViews)}
                    </td>
                    <td className="number-cell">
                      {(visitor.totalDuration || 0) <= 10 ? (
                        <span className="duration-tag low-duration">
                          {formatDuration(visitor.totalDuration || 0)}
                        </span>
                      ) : (
                        formatDuration(visitor.totalDuration || 0)
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    No visitors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPanelOpen && selectedVisitor && (
        <VisitorDetailsPanel
          visitor={selectedVisitor}
          dateRange={dateRange}
          onClose={() => {
            console.log("Closing panel");
            setIsPanelOpen(false);
            setSelectedVisitor(null);
          }}
        />
      )}
      
      {/* Debug overlay - shows panel state */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          zIndex: 99999,
          fontSize: '12px',
          borderRadius: '4px'
        }}>
          Panel Open: {isPanelOpen ? 'Yes' : 'No'}<br/>
          Has Visitor: {selectedVisitor ? 'Yes' : 'No'}<br/>
          Visitor ID: {selectedVisitor?.visitorId?.substring(0, 30) || 'N/A'}...
        </div>
      )}
    </div>
  );
};

export default Visitors;

