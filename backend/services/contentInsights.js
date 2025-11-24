import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get content insights (top exit pages, high engagement pages, user flows)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getContentInsights = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get top exit pages
    const exitResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "exits" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "exits",
            },
            desc: true,
          },
        ],
        limit: 20,
      },
    });

    const topExitPages =
      exitResponse.data.rows?.map((row) => {
        const exits = parseInt(row.metricValues[0].value);
        const views = parseInt(row.metricValues[1].value);
        return {
          path: row.dimensionValues[0].value,
          title: row.dimensionValues[1].value,
          exits,
          views,
          exitRate: views > 0 ? ((exits / views) * 100).toFixed(2) : "0.00",
          avgDuration: parseFloat(row.metricValues[2].value),
        };
      }) || [];

    // Get high engagement pages (by session duration and page views)
    const engagementResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "userEngagementDuration" },
          { name: "sessions" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "userEngagementDuration",
            },
            desc: true,
          },
        ],
        limit: 20,
      },
    });

    const highEngagementPages =
      engagementResponse.data.rows?.map((row) => {
        const views = parseInt(row.metricValues[0].value);
        const avgDuration = parseFloat(row.metricValues[1].value);
        const totalEngagement = parseFloat(row.metricValues[2].value);
        const sessions = parseInt(row.metricValues[3].value);
        return {
          path: row.dimensionValues[0].value,
          title: row.dimensionValues[1].value,
          views,
          avgDuration,
          totalEngagement,
          sessions,
          engagementPerView: views > 0 ? (totalEngagement / views).toFixed(2) : "0.00",
        };
      }) || [];

    // Get user flows (common page paths)
    const flowResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "pagePath" },
          { name: "previousPagePath" },
        ],
        metrics: [{ name: "screenPageViews" }],
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

    // Process user flows
    const flows = {};
    flowResponse.data.rows?.forEach((row) => {
      const currentPage = row.dimensionValues[0].value;
      const previousPage = row.dimensionValues[1].value || "(entrance)";
      const views = parseInt(row.metricValues[0].value);

      if (!flows[currentPage]) {
        flows[currentPage] = {
          page: currentPage,
          totalViews: 0,
          sources: [],
        };
      }

      flows[currentPage].totalViews += views;
      flows[currentPage].sources.push({
        from: previousPage,
        views,
      });
    });

    // Sort and limit flows
    const topFlows = Object.values(flows)
      .map((flow) => ({
        ...flow,
        sources: flow.sources
          .sort((a, b) => b.views - a.views)
          .slice(0, 5), // Top 5 sources per page
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 20);

    return {
      topExitPages,
      highEngagementPages,
      userFlows: topFlows,
    };
  } catch (error) {
    console.error("Error fetching content insights:", error);
    throw error;
  }
};

