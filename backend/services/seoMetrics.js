import { getAnalyticsClient } from "./googleAnalytics.js";
import axios from "axios";

/**
 * Get SEO-specific metrics
 * Note: Backlinks and Domain Authority require external APIs (Moz, Ahrefs, etc.)
 * This provides what we can get from Google Analytics and Search Console
 */
export const getSEOMetrics = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get organic search traffic
    const organicResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "sessionMedium",
            stringFilter: {
              matchType: "EXACT",
              value: "organic",
            },
          },
        },
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

    const organicSources =
      organicResponse.data.rows?.map((row) => ({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get keyword data (from search queries - limited in GA4)
    const keywordResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "searchTerm" }],
        metrics: [
          { name: "sessions" },
          { name: "screenPageViews" },
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

    const keywords =
      keywordResponse.data.rows?.map((row) => ({
        keyword: row.dimensionValues[0].value || "(not provided)",
        sessions: parseInt(row.metricValues[0].value),
        pageViews: parseInt(row.metricValues[1].value),
      })) || [];

    // Calculate organic search totals
    const totalOrganicSessions = organicSources.reduce(
      (sum, s) => sum + s.sessions,
      0
    );
    const totalOrganicUsers = organicSources.reduce(
      (sum, s) => sum + s.users,
      0
    );

    return {
      organicSearch: {
        totalSessions: totalOrganicSessions,
        totalUsers: totalOrganicUsers,
        sources: organicSources,
      },
      keywords: {
        total: keywords.length,
        topKeywords: keywords.slice(0, 20),
      },
      note: "Backlinks and Domain Authority require external SEO tools (Moz, Ahrefs, SEMrush). These can be integrated via their APIs.",
    };
  } catch (error) {
    console.error("Error fetching SEO metrics:", error);
    throw error;
  }
};

