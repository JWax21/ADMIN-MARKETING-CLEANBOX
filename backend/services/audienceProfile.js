import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get audience profile (geography, device breakdown, demographics)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getAudienceProfile = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get geographic breakdown
    const geoResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "country" }, { name: "region" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "activeUsers",
            },
            desc: true,
          },
        ],
        limit: 50,
      },
    });

    const geographicData =
      geoResponse.data.rows?.map((row) => ({
        country: row.dimensionValues[0].value,
        region: row.dimensionValues[1].value || "N/A",
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get device breakdown
    const deviceResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "activeUsers",
            },
            desc: true,
          },
        ],
      },
    });

    const deviceData =
      deviceResponse.data.rows?.map((row) => ({
        device: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get new vs returning visitors
    const visitorResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      },
    });

    const visitorData =
      visitorResponse.data.rows?.map((row) => ({
        type: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get age and gender demographics (if available)
    let demographics = null;
    try {
      const demoResponse = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "userAgeBracket" },
            { name: "userGender" },
          ],
          metrics: [{ name: "activeUsers" }],
          limit: 50,
        },
      });

      demographics = {
        age: {},
        gender: {},
      };

      demoResponse.data.rows?.forEach((row) => {
        const age = row.dimensionValues[0].value;
        const gender = row.dimensionValues[1].value;
        const users = parseInt(row.metricValues[0].value);

        if (age && age !== "(not set)") {
          demographics.age[age] = (demographics.age[age] || 0) + users;
        }
        if (gender && gender !== "(not set)") {
          demographics.gender[gender] = (demographics.gender[gender] || 0) + users;
        }
      });
    } catch (error) {
      console.warn("Demographics data not available:", error.message);
    }

    // Calculate totals for percentages
    const totalUsers = deviceData.reduce((sum, d) => sum + d.users, 0);
    const totalSessions = deviceData.reduce((sum, d) => sum + d.sessions, 0);

    return {
      geographic: geographicData,
      device: deviceData.map((d) => ({
        ...d,
        userPercentage: totalUsers > 0 ? ((d.users / totalUsers) * 100).toFixed(1) : "0.0",
        sessionPercentage: totalSessions > 0 ? ((d.sessions / totalSessions) * 100).toFixed(1) : "0.0",
      })),
      visitorType: visitorData,
      demographics,
      totals: {
        users: totalUsers,
        sessions: totalSessions,
      },
    };
  } catch (error) {
    console.error("Error fetching audience profile:", error);
    throw error;
  }
};

