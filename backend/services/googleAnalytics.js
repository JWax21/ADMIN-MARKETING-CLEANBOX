import { google } from "googleapis";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Google Analytics Data API
let analyticsDataClient = null;

/**
 * Initialize the Google Analytics API client
 * Requires a service account key file
 */
export const initializeAnalytics = () => {
  try {
    const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;
    const GA_SERVICE_ACCOUNT_BASE64 = process.env.GA_SERVICE_ACCOUNT_BASE64;
    const GA_KEY_FILE = process.env.GA_KEY_FILE_PATH;

    if (!GA_PROPERTY_ID) {
      console.warn("⚠️  GA_PROPERTY_ID not set in environment variables");
      return null;
    }

    // Get credentials from either base64 env var (production) or file (local dev)
    let credentials;
    
    if (GA_SERVICE_ACCOUNT_BASE64) {
      // Production: decode base64 environment variable
      console.log("📦 Loading GA credentials from base64 environment variable");
      const decoded = Buffer.from(GA_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      credentials = JSON.parse(decoded);
    } else if (GA_KEY_FILE) {
      // Local development: read from file
      console.log("📁 Loading GA credentials from file");
      const keyFilePath = join(__dirname, "..", GA_KEY_FILE);
      credentials = JSON.parse(readFileSync(keyFilePath, "utf8"));
    } else {
      console.warn("⚠️  Neither GA_SERVICE_ACCOUNT_BASE64 nor GA_KEY_FILE_PATH set in environment variables");
      return null;
    }

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    analyticsDataClient = google.analyticsdata({
      version: "v1beta",
      auth,
    });

    console.log("✅ Google Analytics API initialized successfully");
    return analyticsDataClient;
  } catch (error) {
    console.error("❌ Error initializing Google Analytics:", error.message);
    return null;
  }
};

/**
 * Get overview metrics for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getOverviewMetrics = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
          { name: "conversions" },
        ],
      },
    });

    const row = response.data.rows?.[0];
    if (!row) {
      return null;
    }

    return {
      activeUsers: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
      pageViews: parseInt(row.metricValues[2].value),
      avgSessionDuration: parseFloat(row.metricValues[3].value),
      bounceRate: parseFloat(row.metricValues[4].value) * 100,
      conversions: parseInt(row.metricValues[5].value),
    };
  } catch (error) {
    console.error("Error fetching overview metrics:", error);
    throw error;
  }
};

/**
 * Get page views by page path
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} limit - Number of results to return
 */
export const getTopPages = async (
  startDate = "30daysAgo",
  endDate = "today",
  limit = 10
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
        limit,
      },
    });

    return (
      response.data.rows?.map((row) => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value,
        views: parseInt(row.metricValues[0].value),
        avgDuration: parseFloat(row.metricValues[1].value),
      })) || []
    );
  } catch (error) {
    console.error("Error fetching top pages:", error);
    throw error;
  }
};

/**
 * Get average session duration for all pages
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} Map of pagePath -> averageSessionDuration in seconds
 */
export const getPageAvgDurations = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "averageSessionDuration" }],
        limit: 10000, // Get as many pages as possible
      },
    });

    const durationMap = {};
    response.data.rows?.forEach((row) => {
      const pagePath = row.dimensionValues[0].value;
      const avgDuration = parseFloat(row.metricValues[0].value) || 0;
      durationMap[pagePath] = avgDuration;
    });

    return durationMap;
  } catch (error) {
    console.error("Error fetching page average durations:", error);
    throw error;
  }
};

/**
 * Get unique visitors and bounce rate per page
 * Fetches all-time data (uses a long date range to capture historical data)
 * @param {string} startDate - Start date in YYYY-MM-DD format (defaults to 2 years ago)
 * @param {string} endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns {Object} Map of pagePath -> { uniqueVisitors, bounceRate }
 */
export const getPageVisitorsAndBounceRate = async (
  startDate = null,
  endDate = "today"
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  // If no startDate provided, use 2 years ago to capture most historical data
  const effectiveStartDate = startDate || (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 2);
    return date.toISOString().split("T")[0];
  })();

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate: effectiveStartDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "activeUsers" }, // Unique visitors
          { name: "bounceRate" },
          { name: "sessions" }, // Sessions for weighting
        ],
        limit: 10000, // Get as many pages as possible
      },
    });

    const pageDataMap = {};
    response.data.rows?.forEach((row) => {
      const pagePath = row.dimensionValues[0].value;
      const uniqueVisitors = parseInt(row.metricValues[0].value) || 0;
      const bounceRate = parseFloat(row.metricValues[1].value) || 0;
      const sessions = parseInt(row.metricValues[2].value) || 0;
      pageDataMap[pagePath] = {
        uniqueVisitors,
        bounceRate: bounceRate * 100, // Convert to percentage
        sessions,
      };
    });

    return pageDataMap;
  } catch (error) {
    console.error("Error fetching page visitors and bounce rate:", error);
    throw error;
  }
};

/**
 * Get traffic by source/medium with enhanced attribution
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getTrafficSources = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get session-level (last-touch) attribution
    const sessionResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionDefaultChannelGroup" },
        ],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 100,
      },
    });

    // Get first-touch attribution
    const firstTouchResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [
          { name: "firstUserSource" },
          { name: "firstUserMedium" },
        ],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "newUsers" }],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 100,
      },
    });

    // Get landing pages
    const landingPageResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "landingPage" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "bounceRate" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 50,
      },
    });

    const sessionSources =
      sessionResponse.data.rows?.map((row) => ({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        channelGroup: row.dimensionValues[2].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        attribution: "last-touch",
      })) || [];

    const firstTouchSources =
      firstTouchResponse.data.rows?.map((row) => ({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        newUsers: parseInt(row.metricValues[2].value),
        attribution: "first-touch",
      })) || [];

    const landingPages =
      landingPageResponse.data.rows?.map((row) => ({
        landingPage: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        newUsers: parseInt(row.metricValues[2].value),
        bounceRate: parseFloat(row.metricValues[3].value) * 100,
      })) || [];

    return {
      sessionSources,
      firstTouchSources,
      landingPages,
    };
  } catch (error) {
    console.error("Error fetching traffic sources:", error);
    throw error;
  }
};

/**
 * Get daily trend data
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getDailyTrend = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: "date",
            },
            desc: false,
          },
        ],
      },
    });

    return (
      response.data.rows?.map((row) => ({
        date: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || []
    );
  } catch (error) {
    console.error("Error fetching daily trend:", error);
    throw error;
  }
};

/**
 * Get the analytics client (for use by other services)
 */
export const getAnalyticsClient = () => {
  return analyticsDataClient;
};

export default {
  initializeAnalytics,
  getOverviewMetrics,
  getTopPages,
  getTrafficSources,
  getDailyTrend,
  getAnalyticsClient,
};

