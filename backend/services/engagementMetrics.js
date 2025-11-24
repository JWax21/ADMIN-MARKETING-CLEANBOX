import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get engagement metrics (bounce rate, session duration, pages per session, scroll depth, CTA clicks)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getEngagementMetrics = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get overall engagement metrics
    const overallResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "eventCount" },
        ],
      },
    });

    const overallRow = overallResponse.data.rows?.[0];
    if (!overallRow) {
      return null;
    }

    const sessions = parseInt(overallRow.metricValues[3].value);
    const pageViews = parseInt(overallRow.metricValues[2].value);
    const bounceRate = parseFloat(overallRow.metricValues[0].value) * 100;
    const avgSessionDuration = parseFloat(overallRow.metricValues[1].value);

    // Get scroll depth events
    const scrollResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: {
              matchType: "CONTAINS",
              value: "scroll",
            },
          },
        },
      },
    });

    let scrollDepthData = {};
    scrollResponse.data.rows?.forEach((row) => {
      const eventName = row.dimensionValues[0].value;
      const count = parseInt(row.metricValues[0].value);
      scrollDepthData[eventName] = count;
    });

    // Get CTA click events (common event names for CTAs)
    const ctaResponse = await analyticsDataClient.properties.runReport({
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
                    value: "click",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "cta",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "button",
                  },
                },
              },
            ],
          },
        },
      },
    });

    let ctaClicks = 0;
    ctaResponse.data.rows?.forEach((row) => {
      ctaClicks += parseInt(row.metricValues[0].value);
    });

    return {
      bounceRate,
      averageSessionDuration: avgSessionDuration,
      pagesPerSession: sessions > 0 ? (pageViews / sessions).toFixed(2) : 0,
      scrollDepth: scrollDepthData,
      ctaClicks,
      totalSessions: sessions,
      totalPageViews: pageViews,
    };
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    throw error;
  }
};

/**
 * Get engagement metrics by page
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} limit - Number of results to return
 */
export const getEngagementByPage = async (
  startDate = "30daysAgo",
  endDate = "today",
  limit = 20
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "screenPageViews" },
          { name: "sessions" },
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
      response.data.rows?.map((row) => {
        const sessions = parseInt(row.metricValues[3].value);
        const pageViews = parseInt(row.metricValues[2].value);
        return {
          path: row.dimensionValues[0].value,
          title: row.dimensionValues[1].value,
          bounceRate: parseFloat(row.metricValues[0].value) * 100,
          avgSessionDuration: parseFloat(row.metricValues[1].value),
          pageViews,
          sessions,
          pagesPerSession: sessions > 0 ? (pageViews / sessions).toFixed(2) : 0,
        };
      }) || []
    );
  } catch (error) {
    console.error("Error fetching engagement by page:", error);
    throw error;
  }
};

