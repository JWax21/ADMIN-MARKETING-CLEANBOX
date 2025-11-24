import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get technical performance metrics (Core Web Vitals, page load time, 404 errors)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getTechnicalPerformance = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get Core Web Vitals
    const vitalsResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "averagePageLoadTime" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
        limit: 50,
      },
    });

    const pageLoadData =
      vitalsResponse.data.rows?.map((row) => ({
        path: row.dimensionValues[0].value,
        avgLoadTime: parseFloat(row.metricValues[0].value),
        views: parseInt(row.metricValues[1].value),
      })) || [];

    // Get 404 errors (pages with low engagement or error events)
    const errorResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "CONTAINS",
              value: "404",
            },
          },
        },
        limit: 50,
      },
    });

    const errorPages =
      errorResponse.data.rows?.map((row) => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value,
        views: parseInt(row.metricValues[0].value),
        bounceRate: parseFloat(row.metricValues[1].value) * 100,
        avgDuration: parseFloat(row.metricValues[2].value),
      })) || [];

    // Get mobile vs desktop performance
    const deviceResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [
          { name: "averagePageLoadTime" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
      },
    });

    const devicePerformance =
      deviceResponse.data.rows?.map((row) => ({
        device: row.dimensionValues[0].value,
        avgLoadTime: parseFloat(row.metricValues[0].value),
        views: parseInt(row.metricValues[1].value),
        bounceRate: parseFloat(row.metricValues[2].value) * 100,
      })) || [];

    // Calculate overall averages
    const totalLoadTime = pageLoadData.reduce(
      (sum, p) => sum + p.avgLoadTime * p.views,
      0
    );
    const totalViews = pageLoadData.reduce((sum, p) => sum + p.views, 0);
    const overallAvgLoadTime =
      totalViews > 0 ? (totalLoadTime / totalViews).toFixed(2) : 0;

    return {
      overallAvgLoadTime: parseFloat(overallAvgLoadTime),
      pageLoadTimes: pageLoadData,
      errorPages,
      devicePerformance,
      total404Errors: errorPages.reduce((sum, p) => sum + p.views, 0),
    };
  } catch (error) {
    console.error("Error fetching technical performance:", error);
    throw error;
  }
};

/**
 * Get Core Web Vitals metrics (LCP, CLS, INP)
 * Note: These require specific event tracking in GA4
 */
export const getCoreWebVitals = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Try to get Core Web Vitals events if they're tracked
    const vitalsResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "LCP",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "CLS",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "INP",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "FID",
                  },
                },
              },
            ],
          },
        },
      },
    });

    const vitals = {};
    vitalsResponse.data.rows?.forEach((row) => {
      const eventName = row.dimensionValues[0].value;
      const count = parseInt(row.metricValues[0].value);
      vitals[eventName] = count;
    });

    return {
      vitals,
      available: Object.keys(vitals).length > 0,
      note: "Core Web Vitals require custom event tracking in GA4",
    };
  } catch (error) {
    console.warn("Core Web Vitals not available:", error.message);
    return {
      vitals: {},
      available: false,
      note: "Core Web Vitals require custom event tracking in GA4",
    };
  }
};

