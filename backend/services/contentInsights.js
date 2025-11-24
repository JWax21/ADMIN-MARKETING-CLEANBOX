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
    // Note: GA4 doesn't have an "exits" metric, so we use sessions as a proxy
    // Pages with high sessions relative to views are likely exit pages
    const exitResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "sessions",
            },
            desc: true,
          },
        ],
        limit: 20,
      },
    });

    const topExitPages =
      exitResponse.data.rows?.map((row) => {
        const sessions = parseInt(row.metricValues[0].value);
        const views = parseInt(row.metricValues[1].value);
        // Calculate exit rate: if sessions ≈ views, it's likely an exit page
        // Higher ratio of sessions to views indicates more exits
        const exitRate = views > 0 ? ((sessions / views) * 100).toFixed(2) : "0.00";
        return {
          path: row.dimensionValues[0].value,
          title: row.dimensionValues[1].value,
          exits: sessions, // Using sessions as proxy for exits
          views,
          exitRate,
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

    // Try to get content grouping (if configured in GA4)
    let contentGrouping = null;
    try {
      const contentGroupResponse = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "contentGroup1" },
            { name: "contentGroup2" },
          ],
          metrics: [
            { name: "screenPageViews" },
            { name: "sessions" },
            { name: "activeUsers" },
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

      contentGrouping =
        contentGroupResponse.data.rows?.map((row) => ({
          group1: row.dimensionValues[0].value || "N/A",
          group2: row.dimensionValues[1].value || "N/A",
          pageViews: parseInt(row.metricValues[0].value),
          sessions: parseInt(row.metricValues[1].value),
          users: parseInt(row.metricValues[2].value),
        })) || [];
    } catch (error) {
      // Content grouping not configured - this is optional
      console.warn("Content grouping not available (may not be configured in GA4):", error.message);
    }

    // Get user flows (common page paths)
    // Note: GA4 doesn't have previousPagePath dimension, so we'll use pageReferrer instead
    // This shows where users came from (external referrers or internal navigation)
    let topFlows = [];
    try {
      const flowResponse = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "pagePath" },
            { name: "pageReferrer" },
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
          limit: 100,
        },
      });

      // Process user flows
      const flows = {};
      flowResponse.data.rows?.forEach((row) => {
        const currentPage = row.dimensionValues[0].value;
        const referrer = row.dimensionValues[1].value || "(entrance)";
        const views = parseInt(row.metricValues[0].value);

        // Clean up referrer - if it's from the same domain, show as internal
        let previousPage = referrer;
        if (referrer !== "(entrance)" && referrer !== "(not set)") {
          try {
            const referrerUrl = new URL(referrer);
            const currentHost = new URL("https://proteinbarnerd.com").hostname;
            if (referrerUrl.hostname === currentHost || referrerUrl.hostname.includes("proteinbarnerd.com")) {
              previousPage = referrerUrl.pathname || "(internal)";
            } else {
              previousPage = referrerUrl.hostname || referrer;
            }
          } catch (e) {
            // If URL parsing fails, use as-is
            previousPage = referrer;
          }
        }

        if (!flows[currentPage]) {
          flows[currentPage] = {
            page: currentPage,
            totalViews: 0,
            sources: [],
          };
        }

        flows[currentPage].totalViews += views;
        
        // Check if this source already exists
        const existingSource = flows[currentPage].sources.find(s => s.from === previousPage);
        if (existingSource) {
          existingSource.views += views;
        } else {
          flows[currentPage].sources.push({
            from: previousPage,
            views,
          });
        }
      });

      // Sort and limit flows
      topFlows = Object.values(flows)
        .map((flow) => ({
          ...flow,
          sources: flow.sources
            .sort((a, b) => b.views - a.views)
            .slice(0, 5), // Top 5 sources per page
        }))
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 20);
    } catch (error) {
      console.warn("Error fetching user flows (pageReferrer may not be available):", error.message);
      // Fallback: just show top pages without referrer data
      const topPagesResponse = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [
            {
              metric: {
                metricName: "screenPageViews",
              },
              desc: true,
            },
          ],
          limit: 20,
        },
      });

      topFlows = topPagesResponse.data.rows?.map((row) => ({
        page: row.dimensionValues[0].value,
        totalViews: parseInt(row.metricValues[0].value),
        sources: [{ from: "(data not available)", views: 0 }],
      })) || [];
    }

    return {
      topExitPages,
      highEngagementPages,
      userFlows: topFlows,
      contentGrouping,
    };
  } catch (error) {
    console.error("Error fetching content insights:", error);
    throw error;
  }
};

