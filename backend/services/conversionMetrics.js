import { getAnalyticsClient } from "./googleAnalytics.js";

/**
 * Get conversion metrics (conversion rate, form submissions, cart abandonment, lead quality)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getConversionMetrics = async (
  startDate = "30daysAgo",
  endDate = "today"
) => {
  const analyticsDataClient = getAnalyticsClient();
  if (!analyticsDataClient) {
    throw new Error("Analytics client not initialized");
  }

  const propertyId = process.env.GA_PROPERTY_ID;

  try {
    // Get overall conversion metrics
    const overallResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "conversions" },
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "eventCount" },
        ],
      },
    });

    const overallRow = overallResponse.data.rows?.[0];
    if (!overallRow) {
      return null;
    }

    const conversions = parseInt(overallRow.metricValues[0].value);
    const sessions = parseInt(overallRow.metricValues[1].value);
    const users = parseInt(overallRow.metricValues[2].value);
    const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0;

    // Get form submission events
    const formResponse = await analyticsDataClient.properties.runReport({
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
                    value: "form",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "submit",
                  },
                },
              },
            ],
          },
        },
      },
    });

    let formSubmissions = 0;
    formResponse.data.rows?.forEach((row) => {
      formSubmissions += parseInt(row.metricValues[0].value);
    });

    // Get email opt-in events
    const emailResponse = await analyticsDataClient.properties.runReport({
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
                    value: "email",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "newsletter",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "signup",
                  },
                },
              },
            ],
          },
        },
      },
    });

    let emailOptIns = 0;
    emailResponse.data.rows?.forEach((row) => {
      emailOptIns += parseInt(row.metricValues[0].value);
    });

    // Get purchase/transaction events
    const purchaseResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalRevenue" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "EXACT",
                    value: "purchase",
                  },
                },
              },
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "CONTAINS",
                    value: "transaction",
                  },
                },
              },
            ],
          },
        },
      },
    });

    let purchases = 0;
    let revenue = 0;
    purchaseResponse.data.rows?.forEach((row) => {
      purchases += parseInt(row.metricValues[0].value);
      revenue += parseFloat(row.metricValues[1].value || 0);
    });

    // Get cart abandonment (add_to_cart events without purchase)
    const cartResponse = await analyticsDataClient.properties.runReport({
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
              value: "add_to_cart",
            },
          },
        },
      },
    });

    let addToCart = 0;
    cartResponse.data.rows?.forEach((row) => {
      addToCart += parseInt(row.metricValues[0].value);
    });

    const cartAbandonmentRate =
      addToCart > 0 ? ((addToCart - purchases) / addToCart) * 100 : 0;

    return {
      conversionRate: conversionRate.toFixed(2),
      totalConversions: conversions,
      totalSessions: sessions,
      totalUsers: users,
      formSubmissions,
      emailOptIns,
      purchases,
      revenue: revenue.toFixed(2),
      addToCart,
      cartAbandonmentRate: cartAbandonmentRate.toFixed(2),
    };
  } catch (error) {
    console.error("Error fetching conversion metrics:", error);
    throw error;
  }
};

/**
 * Get conversion metrics by source
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getConversionBySource = async (
  startDate = "30daysAgo",
  endDate = "today"
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
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [
          { name: "conversions" },
          { name: "sessions" },
          { name: "totalUsers" },
        ],
        orderBys: [
          {
            metric: {
              metricName: "conversions",
            },
            desc: true,
          },
        ],
        limit: 20,
      },
    });

    return (
      response.data.rows?.map((row) => {
        const conversions = parseInt(row.metricValues[0].value);
        const sessions = parseInt(row.metricValues[1].value);
        const users = parseInt(row.metricValues[2].value);
        return {
          source: row.dimensionValues[0].value,
          medium: row.dimensionValues[1].value,
          conversions,
          sessions,
          users,
          conversionRate: sessions > 0 ? ((conversions / sessions) * 100).toFixed(2) : "0.00",
        };
      }) || []
    );
  } catch (error) {
    console.error("Error fetching conversion by source:", error);
    throw error;
  }
};

