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
    // Get overview metrics (active users for different periods)
    const overviewResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "active1DayUsers" },
          { name: "active7DayUsers" },
          { name: "active28DayUsers" },
          { name: "activeUsers" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "sessions" },
        ],
      },
    });

    const overviewRow = overviewResponse.data.rows?.[0];
    const overview = overviewRow
      ? {
          active1DayUsers: parseInt(overviewRow.metricValues[0].value),
          active7DayUsers: parseInt(overviewRow.metricValues[1].value),
          active28DayUsers: parseInt(overviewRow.metricValues[2].value),
          activeUsers: parseInt(overviewRow.metricValues[3].value),
          engagedSessions: parseInt(overviewRow.metricValues[4].value),
          engagementRate: parseFloat(overviewRow.metricValues[5].value) * 100,
          sessions: parseInt(overviewRow.metricValues[6].value),
        }
      : null;

    // Get page-level data with total users
    const pagesResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [
          {
            metric: {
              metricName: "activeUsers",
            },
            desc: true,
          },
        ],
        limit: 100,
      },
    });

    // Get scroll events per page (users who scrolled)
    const scrollEventsResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: {
              matchType: "EXACT",
              value: "scroll",
            },
          },
        },
        limit: 500,
      },
    });

    // Try to get scroll depth 90%+ events (if tracked as custom event)
    let scrollDepth90Response = null;
    try {
      scrollDepth90Response = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "activeUsers" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: "eventName",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "scroll",
                    },
                  },
                },
                {
                  filter: {
                    fieldName: "eventParameter:percent_scrolled",
                    numericFilter: {
                      operation: "GREATER_THAN_OR_EQUAL",
                      value: {
                        doubleValue: 90,
                      },
                    },
                  },
                },
              ],
            },
          },
          limit: 500,
        },
      });
    } catch (error) {
      // If scroll depth parameter is not available, we'll use scroll events as proxy
      console.warn("Scroll depth parameter not available, using scroll events:", error.message);
    }

    // Process page scroll data
    const pageScrollMap = {};
    pagesResponse.data.rows?.forEach((row) => {
      const pagePath = row.dimensionValues[0].value;
      const pageTitle = row.dimensionValues[1].value;
      const totalUsers = parseInt(row.metricValues[0].value);
      pageScrollMap[pagePath] = {
        pagePath,
        pageTitle,
        totalUsers,
        scrolledUsers: 0,
        scrolled90Users: 0,
      };
    });

    // Add users who scrolled (any amount)
    scrollEventsResponse.data.rows?.forEach((row) => {
      const pagePath = row.dimensionValues[0].value;
      const scrolledUsers = parseInt(row.metricValues[0].value);
      if (pageScrollMap[pagePath]) {
        pageScrollMap[pagePath].scrolledUsers = scrolledUsers;
      }
    });

    // Add users who scrolled 90%+ (if available)
    if (scrollDepth90Response) {
      scrollDepth90Response.data.rows?.forEach((row) => {
        const pagePath = row.dimensionValues[0].value;
        const scrolled90Users = parseInt(row.metricValues[0].value);
        if (pageScrollMap[pagePath]) {
          pageScrollMap[pagePath].scrolled90Users = scrolled90Users;
        }
      });
    }

    // Use scrolled90Users if available, otherwise use scrolledUsers as fallback
    const pagesWithScroll = Object.values(pageScrollMap).map((page) => {
      const scrolledUsers = page.scrolled90Users > 0 ? page.scrolled90Users : page.scrolledUsers;
      return {
        pagePath: page.pagePath,
        pageTitle: page.pageTitle,
        totalUsers: page.totalUsers,
        scrolledUsers,
        percentScrolled:
          page.totalUsers > 0 ? ((scrolledUsers / page.totalUsers) * 100).toFixed(1) : "0.0",
      };
    });

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

    // Get device breakdown with mobile device details and screen resolution
    // Try to get mobile device model, marketing name, and screen resolution first
    let deviceData = [];
    try {
      const deviceResponse = await analyticsDataClient.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "deviceCategory" },
            { name: "mobileDeviceModel" },
            { name: "mobileDeviceMarketingName" },
            { name: "screenResolution" },
          ],
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
          limit: 100,
        },
      });

      deviceData =
        deviceResponse.data.rows?.map((row) => {
          const deviceCategory = row.dimensionValues[0].value;
          const mobileDeviceModel = row.dimensionValues[1].value || null;
          const mobileDeviceMarketingName = row.dimensionValues[2].value || null;
          const screenResolution = row.dimensionValues[3].value || null;

          let deviceName = deviceCategory;
          if (mobileDeviceMarketingName && mobileDeviceMarketingName !== "(not set)") {
            deviceName = mobileDeviceMarketingName;
          } else if (mobileDeviceModel && mobileDeviceModel !== "(not set)") {
            deviceName = `${deviceCategory} - ${mobileDeviceModel}`;
          }

          return {
            device: deviceName,
            deviceCategory,
            mobileDeviceModel: mobileDeviceModel !== "(not set)" ? mobileDeviceModel : null,
            mobileDeviceMarketingName:
              mobileDeviceMarketingName !== "(not set)" ? mobileDeviceMarketingName : null,
            screenResolution: screenResolution !== "(not set)" ? screenResolution : null,
            users: parseInt(row.metricValues[0].value),
            sessions: parseInt(row.metricValues[1].value),
            pageViews: parseInt(row.metricValues[2].value),
          };
        }) || [];
    } catch (error) {
      // Fallback to basic device category if mobile device dimensions fail
      console.warn("Could not fetch mobile device details, using basic device category:", error.message);
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

      deviceData =
        deviceResponse.data.rows?.map((row) => ({
          device: row.dimensionValues[0].value,
          deviceCategory: row.dimensionValues[0].value,
          mobileDeviceModel: null,
          mobileDeviceMarketingName: null,
          screenResolution: null,
          users: parseInt(row.metricValues[0].value),
          sessions: parseInt(row.metricValues[1].value),
          pageViews: parseInt(row.metricValues[2].value),
        })) || [];
    }

    // Get language breakdown
    const languageResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "language" }],
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

    const languageData =
      languageResponse.data.rows?.map((row) => ({
        language: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get time-based analysis (hour and day of week)
    const timeHourResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "hour" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: "hour",
            },
            desc: false,
          },
        ],
      },
    });

    const timeByHour =
      timeHourResponse.data.rows?.map((row) => ({
        hour: parseInt(row.dimensionValues[0].value),
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    const timeDayResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "dayOfWeek" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            dimension: {
              dimensionName: "dayOfWeek",
            },
            desc: false,
          },
        ],
      },
    });

    const timeByDay =
      timeDayResponse.data.rows?.map((row) => ({
        dayOfWeek: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
      })) || [];

    // Get new vs returning users (as metrics)
    // Note: GA4 doesn't have returningUsers metric, so we calculate it from activeUsers - newUsers
    const newReturningResponse = await analyticsDataClient.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "newUsers" },
          { name: "activeUsers" },
        ],
      },
    });

    const newReturningRow = newReturningResponse.data.rows?.[0];
    const newReturningMetrics = newReturningRow
      ? {
          newUsers: parseInt(newReturningRow.metricValues[0].value),
          activeUsers: parseInt(newReturningRow.metricValues[1].value),
          returningUsers: parseInt(newReturningRow.metricValues[1].value) - parseInt(newReturningRow.metricValues[0].value),
          totalUsers: parseInt(newReturningRow.metricValues[1].value),
        }
      : null;

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

    // Get demographics with userGender and userAgeBracket
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
          limit: 100,
        },
      });

      demographics = {
        age: {},
        gender: {},
        ageBrackets: [],
        genders: [],
      };

      demoResponse.data.rows?.forEach((row) => {
        const ageBracket = row.dimensionValues[0].value;
        const gender = row.dimensionValues[1].value;
        const users = parseInt(row.metricValues[0].value);

        if (ageBracket && ageBracket !== "(not set)") {
          demographics.age[ageBracket] = (demographics.age[ageBracket] || 0) + users;
          if (!demographics.ageBrackets.find((a) => a.bracket === ageBracket)) {
            demographics.ageBrackets.push({
              bracket: ageBracket,
              users: users,
            });
          } else {
            const existing = demographics.ageBrackets.find((a) => a.bracket === ageBracket);
            existing.users += users;
          }
        }
        if (gender && gender !== "(not set)") {
          demographics.gender[gender] = (demographics.gender[gender] || 0) + users;
          if (!demographics.genders.find((g) => g.gender === gender)) {
            demographics.genders.push({
              gender: gender,
              users: users,
            });
          } else {
            const existing = demographics.genders.find((g) => g.gender === gender);
            existing.users += users;
          }
        }
      });

      // Sort by users descending
      demographics.ageBrackets.sort((a, b) => b.users - a.users);
      demographics.genders.sort((a, b) => b.users - a.users);
    } catch (error) {
      console.warn("Demographics data not available:", error.message);
    }

    // Calculate totals for percentages
    const totalUsers = deviceData.reduce((sum, d) => sum + d.users, 0);
    const totalSessions = deviceData.reduce((sum, d) => sum + d.sessions, 0);

    return {
      overview,
      pagesWithScroll,
      geographic: geographicData,
      device: deviceData.map((d) => ({
        ...d,
        userPercentage: totalUsers > 0 ? ((d.users / totalUsers) * 100).toFixed(1) : "0.0",
        sessionPercentage: totalSessions > 0 ? ((d.sessions / totalSessions) * 100).toFixed(1) : "0.0",
      })),
      visitorType: visitorData,
      demographics,
      language: languageData,
      timeAnalysis: {
        byHour: timeByHour,
        byDayOfWeek: timeByDay,
      },
      newReturningMetrics,
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

