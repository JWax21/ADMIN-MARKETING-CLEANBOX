import React, { useState, useEffect, useRef } from "react";
import apiClient from "../api/axios";
import { IoIosCheckmarkCircle, IoIosArrowUp } from "react-icons/io";
import { GoArrowSwitch } from "react-icons/go";
import "./PageIndex.css";

const PageIndex = () => {
  const [pages, setPages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [indexedFilter, setIndexedFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "uniqueVisitors",
    direction: "desc",
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSortDropdownOpen &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isSortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/search-console/page-index", {
        params: { limit: 1000 },
      });
      if (response.data.success) {
        setPages(response.data.data.pages || response.data.data);
        setStats(response.data.data.stats || null);
      }
    } catch (err) {
      console.error("Error fetching page index:", err);
      setError(
        err.response?.data?.error ||
          "Error Loading Page Index. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatCTR = (ctr) => {
    if (!ctr && ctr !== 0) return "N/A";
    return `${(ctr * 100).toFixed(2)}%`;
  };

  const formatPosition = (pos) => {
    if (!pos && pos !== 0) return "N/A";
    return pos.toFixed(1);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const formatUrl = (url, category) => {
    if (!url) return "N/A";
    // Extract path after .com
    const match = url.match(/\.com(.*)/);
    let path = match && match[1] ? match[1] : "/";

    // Category-specific URL shortening
    if (category === "rankings") {
      path = path.replace(/^\/articles\/rankings\//, "");
    } else if (category === "ingredient-checker") {
      path = path.replace(/^\/ingredient-checker/, "");
    } else if (category === "reviews") {
      path = path.replace(/^\/articles\/bars\/reviews\//, "");
    }

    return path || "/";
  };

  const formatBounceRate = (rate) => {
    if (!rate && rate !== 0) return "N/A";
    return `${rate.toFixed(1)}%`;
  };

  const categories = [
    "all",
    "landing",
    "reviews",
    "rankings",
    "tool",
    "ingredient-checker",
    "about",
    "directory",
    "other",
  ];

  const filteredPages = pages.filter((page) => {
    const categoryMatch =
      selectedCategory === "all" || page.category === selectedCategory;
    const indexedMatch =
      indexedFilter === "all" ||
      (indexedFilter === "indexed" && page.indexed) ||
      (indexedFilter === "not-indexed" && !page.indexed);
    return categoryMatch && indexedMatch;
  });

  // Sort filtered pages
  const sortedPages = [...filteredPages].sort((a, b) => {
    let aVal, bVal;

    switch (sortConfig.key) {
      case "position":
        aVal = a.position || 0;
        bVal = b.position || 0;
        // Treat 0 as lowest priority (sort to bottom for ASC, top for DESC)
        if (aVal === 0 && bVal === 0) return 0;
        if (aVal === 0) return 1;
        if (bVal === 0) return -1;
        break;
      case "uniqueVisitors":
        aVal = a.uniqueVisitors || 0;
        bVal = b.uniqueVisitors || 0;
        break;
      case "bounceRate":
        aVal = a.bounceRate || 0;
        bVal = b.bounceRate || 0;
        break;
      case "impressions":
        aVal = a.impressions || 0;
        bVal = b.impressions || 0;
        break;
      case "clicks":
        aVal = a.clicks || 0;
        bVal = b.clicks || 0;
        break;
      case "ctr":
        aVal = a.ctr || 0;
        bVal = b.ctr || 0;
        break;
      case "avgDuration":
        aVal = a.avgDuration || 0;
        bVal = b.avgDuration || 0;
        break;
      default:
        return 0;
    }

    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
  });

  const sortOptions = [
    { key: "uniqueVisitors", label: "All-time" },
    { key: "bounceRate", label: "Bounce" },
    { key: "position", label: "AVG" },
    { key: "impressions", label: "Imp" },
    { key: "clicks", label: "Clicks" },
    { key: "ctr", label: "CTR" },
    { key: "avgDuration", label: "Avg" },
  ];

  // Filter pages by selected category for stats calculation
  const categoryFilteredPages =
    selectedCategory === "all"
      ? pages
      : pages.filter((p) => p.category === selectedCategory);

  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat === "all") {
      acc[cat] = pages.length;
    } else {
      acc[cat] = pages.filter((p) => p.category === cat).length;
    }
    return acc;
  }, {});

  // Calculate stats based on selected category
  const categoryStats = {
    totalPages: categoryFilteredPages.length,
    indexedCount: categoryFilteredPages.filter((p) => p.indexed).length,
    notIndexedCount: categoryFilteredPages.filter((p) => !p.indexed).length,
  };
  categoryStats.notIndexedPercent =
    categoryStats.totalPages > 0
      ? (
          (categoryStats.notIndexedCount / categoryStats.totalPages) *
          100
        ).toFixed(2)
      : "0.00";

  // Calculate average position for the selected category
  const indexedPagesInCategory = categoryFilteredPages.filter(
    (p) => p.indexed && p.position > 0
  );
  categoryStats.avgPosition =
    indexedPagesInCategory.length > 0
      ? (
          indexedPagesInCategory.reduce(
            (sum, p) => sum + (p.position || 0),
            0
          ) / indexedPagesInCategory.length
        ).toFixed(1)
      : "N/A";

  // Calculate engagement metrics for the selected category
  const totalUniqueVisitors = categoryFilteredPages.reduce(
    (sum, p) => sum + (p.uniqueVisitors || 0),
    0
  );

  // Calculate weighted average bounce rate (only pages with sessions > 0)
  const pagesWithSessions = categoryFilteredPages.filter(
    (p) => p.sessions > 0 && p.uniqueVisitors >= 1
  );
  const totalSessions = pagesWithSessions.reduce(
    (sum, p) => sum + (p.sessions || 0),
    0
  );
  const weightedBounceRate =
    totalSessions > 0
      ? pagesWithSessions.reduce(
          (sum, p) => sum + ((p.bounceRate || 0) / 100) * (p.sessions || 0),
          0
        ) / totalSessions
      : 0;
  categoryStats.engagementRate = ((1 - weightedBounceRate) * 100).toFixed(1);

  // Calculate average duration (weighted by sessions or page views)
  const pagesWithDuration = categoryFilteredPages.filter(
    (p) => p.avgDuration && p.avgDuration > 0
  );
  const totalDurationWeight = pagesWithDuration.reduce(
    (sum, p) => sum + (p.sessions || p.uniqueVisitors || 1),
    0
  );
  categoryStats.avgDuration =
    totalDurationWeight > 0
      ? pagesWithDuration.reduce(
          (sum, p) =>
            sum + (p.avgDuration || 0) * (p.sessions || p.uniqueVisitors || 1),
          0
        ) / totalDurationWeight
      : 0;

  const indexedCount = pages.filter((p) => p.indexed).length;
  const notIndexedCount = pages.filter((p) => !p.indexed).length;

  if (loading && pages.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading page index...</p>
      </div>
    );
  }

  if (error && pages.length === 0) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchPages} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-index-page">
      <div className="page-index-tabs-container">
        <div className="page-index-tabs-title">PAGES</div>
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${
                selectedCategory === cat ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {(cat.charAt(0).toUpperCase() + cat.slice(1)).substring(0, 10)}
            </button>
          ))}
        </div>
      </div>

      <div className="page-index-stats-container">
        <div className="page-index-stats-title">Stats</div>
        <div className="filters-section">
          <div className="sort-controls-left" ref={sortDropdownRef}>
            <div className="sort-controls-row">
              <div className="sort-dropdown-wrapper">
                <div className="custom-dropdown">
                  <div
                    className="custom-dropdown-trigger"
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  >
                    <span>
                      {sortOptions.find((opt) => opt.key === sortConfig.key)
                        ?.label || "All-time"}
                    </span>
                    <IoIosArrowUp
                      className={`dropdown-arrow ${
                        isSortDropdownOpen ? "arrow-open" : "arrow-closed"
                      }`}
                    />
                  </div>
                  {isSortDropdownOpen && (
                    <div className="custom-dropdown-menu">
                      {sortOptions.map((option) => (
                        <div
                          key={option.key}
                          className={`custom-dropdown-item ${
                            sortConfig.key === option.key ? "selected" : ""
                          }`}
                          onClick={() => {
                            setSortConfig((prev) => ({
                              key: option.key,
                              direction:
                                prev.key === option.key &&
                                prev.direction === "asc"
                                  ? "desc"
                                  : "asc",
                            }));
                            setIsSortDropdownOpen(false);
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="sort-direction-button"
                onClick={() => {
                  setSortConfig((prev) => ({
                    ...prev,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                  }));
                }}
              >
                <GoArrowSwitch
                  className={`sort-arrow ${
                    sortConfig.direction === "desc" ? "rotated" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {stats && (
            <div className="index-stats-inline">
              <div className="stat-box">
                <div className="stat-label">Unique</div>
                <div className="stat-value">
                  {formatNumber(totalUniqueVisitors)}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Engagement</div>
                <div className="stat-value">
                  {categoryStats.engagementRate || "0.0"}%
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Duration</div>
                <div className="stat-value">
                  {categoryStats.avgDuration
                    ? formatDuration(categoryStats.avgDuration)
                    : "N/A"}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Index</div>
                <div className="stat-value index-status-value">
                  {formatNumber(categoryStats.indexedCount)} /{" "}
                  {formatNumber(categoryStats.totalPages)} (
                  {(
                    (categoryStats.indexedCount / categoryStats.totalPages) *
                    100
                  ).toFixed(1)}
                  %)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="pages-table-container">
          <table className="pages-table">
            <thead>
              <tr>
                <th className="center-cell">Index</th>
                <th className="center-cell narrow-column">AVG</th>
                <th>Category</th>
                <th>URL</th>
                <th className="center-cell narrow-column">All-time</th>
                <th className="center-cell narrow-column">Bounce</th>
                <th className="center-cell narrow-column">Imp</th>
                <th className="center-cell narrow-column">Clicks</th>
                <th className="center-cell narrow-column">CTR</th>
                <th className="center-cell narrow-column">Avg</th>
              </tr>
            </thead>
            <tbody>
              {sortedPages.length > 0 ? (
                sortedPages.map((page, index) => (
                  <tr key={index}>
                    <td className="index-cell center-cell">
                      <IoIosCheckmarkCircle
                        className={`index-icon ${
                          page.indexed ? "indexed" : "not-indexed"
                        }`}
                      />
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatPosition(page.position)}
                    </td>
                    <td>
                      <span
                        className={`category-badge category-${page.category}`}
                      >
                        {page.category}
                      </span>
                    </td>
                    <td className="url-cell">
                      {formatUrl(page.url, page.category)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatNumber(page.uniqueVisitors || 0)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatBounceRate(page.bounceRate || 0)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatNumber(page.impressions)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatNumber(page.clicks)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {formatCTR(page.ctr)}
                    </td>
                    <td className="number-cell center-cell narrow-column">
                      {page.avgDuration
                        ? formatDuration(page.avgDuration)
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="no-data">
                    No pages found
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

export default PageIndex;
