import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get session metrics
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getSessionMetrics = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get session metrics
    const response = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "sessions" },
          { name: "activeUsers" },
        ],
      },
    });

    const row = response.data.rows?.[0];
    if (!row) {
      return null;
    }

    const averageSessionDuration = parseFloat(row.metricValues[0].value) || 0;
    const bounceRate = parseFloat(row.metricValues[1].value) * 100 || 0;
    const engagedSessions = parseInt(row.metricValues[2].value) || 0;
    const engagementRate = parseFloat(row.metricValues[3].value) * 100 || 0;
    const sessions = parseInt(row.metricValues[4].value) || 0;
    const activeUsers = parseInt(row.metricValues[5].value) || 0;

    // Calculate derived metrics
    const engagedSessionsPerActiveUser =
      activeUsers > 0 ? (engagedSessions / activeUsers).toFixed(2) : 0;
    const sessionsPerActiveUser =
      activeUsers > 0 ? (sessions / activeUsers).toFixed(2) : 0;

    // Note: Session key event rate requires key events to be configured in GA4
    // This is typically a custom metric based on specific key events
    // For now, we'll return null and note it in the response
    const sessionKeyEventRate = null; // Requires key events configuration

    return {
      activeUsers,
      averageSessionDuration,
      bounceRate,
      engagedSessions,
      engagedSessionsPerActiveUser: parseFloat(engagedSessionsPerActiveUser),
      engagementRate,
      sessionKeyEventRate,
      sessions,
      sessionsPerActiveUser: parseFloat(sessionsPerActiveUser),
    };
  } catch (error) {
    console.error("Error fetching session metrics:", error);
    throw error;
  }
};
