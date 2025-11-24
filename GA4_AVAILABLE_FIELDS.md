# GA4 Available Fields - Review & Recommendations

Based on the [GA4 Data API Schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), here are relevant fields we can pull that we're currently NOT using:

## Currently Used Dimensions
- `date`, `deviceCategory`, `operatingSystem`, `browser`
- `country`, `region`, `city`
- `newVsReturning`, `sessionSource`, `sessionMedium`
- `pagePath`, `pageTitle`, `previousPagePath`
- `eventName`, `userAgeBracket`, `userGender`
- `mobileDeviceModel`, `mobileDeviceMarketingName`
- `searchTerm`

## Currently Used Metrics
- `activeUsers`, `active1DayUsers`, `active7DayUsers`, `active28DayUsers`
- `sessions`, `engagedSessions`, `engagementRate`
- `screenPageViews`, `eventCount`
- `averageSessionDuration`, `userEngagementDuration`
- `bounceRate`, `conversions`, `totalRevenue`
- `averagePageLoadTime`

## Recommended Additional Dimensions

### Time & Date
- `year`, `month`, `week`, `dayOfWeek`, `hour` - More granular time analysis
- `yearMonth`, `yearWeek` - For time-series grouping

### Traffic Sources
- `firstUserSource`, `firstUserMedium`, `firstUserCampaignName` - First touch attribution
- `sessionCampaignName`, `sessionCampaignId`, `sessionDefaultChannelGroup` - Campaign details
- `googleAdsAccountName`, `googleAdsAdGroupName`, `googleAdsKeyword` - Google Ads integration
- `unifiedPagePathScreen`, `unifiedPageScreen` - Unified page tracking

### Device & Technology
- `mobileDeviceInfo`, `mobileDeviceBranding` - More device details
- `screenResolution` - Screen size analysis
- `hostName` - Subdomain tracking
- `language` - User language preferences

### Content
- `landingPage`, `landingPagePlusQueryString` - Entry pages
- `pageReferrer`, `pageLocation` - Referrer tracking
- `contentGroup1`, `contentGroup2`, etc. - Content grouping

### User Behavior
- `sessionDefaultChannelGroup` - Channel grouping
- `cohortNthDay`, `cohortNthMonth`, `cohortNthWeek` - Cohort analysis
- `customUser:custom_dimension_name` - Custom user dimensions

### E-commerce
- `itemName`, `itemCategory`, `itemBrand` - Product details
- `transactionId` - Transaction tracking

## Recommended Additional Metrics

### Engagement
- `pagesPerSession` - Already calculated, but available as metric
- `averageTimeOnPage` - Time spent per page
- `eventValue` - Event value tracking
- `conversionsPerSession` - Conversion frequency

### Revenue & E-commerce
- `purchaseRevenue`, `adRevenue`, `subscriptionRevenue` - Revenue breakdown
- `itemRevenue`, `itemQuantity` - Product-level revenue
- `totalPurchasers`, `purchasers` - Purchaser counts
- `revenuePerUser`, `revenuePerPurchaser` - Revenue efficiency

### User Activity
- `newUsers`, `returningUsers` - User type breakdown
- `totalUsers` - Distinct users (vs activeUsers)
- `wauPerMau` - Weekly active users / Monthly active users ratio

### Performance
- `crashAffectedUsers` - App crashes (if applicable)
- `dauPerMau` - Daily active users / Monthly active users

### Key Events
- `sessionKeyEventRate:event_name` - Session-based key event rate
- `userKeyEventRate:event_name` - User-based key event rate
- Custom key event metrics for registered events

## High-Value Additions for Our Use Case

### 1. Enhanced Traffic Source Analysis
```javascript
dimensions: [
  { name: "firstUserSource" },
  { name: "firstUserMedium" },
  { name: "sessionDefaultChannelGroup" }
]
```
**Use Case**: Better attribution analysis, first-touch vs last-touch

### 2. Landing Page Analysis
```javascript
dimensions: [
  { name: "landingPage" },
  { name: "landingPagePlusQueryString" }
]
metrics: [
  { name: "sessions" },
  { name: "newUsers" }
]
```
**Use Case**: Identify best entry points, optimize landing pages

### 3. Time-Based Analysis
```javascript
dimensions: [
  { name: "hour" },
  { name: "dayOfWeek" }
]
```
**Use Case**: Peak traffic times, scheduling optimization

### 4. Revenue Metrics (if e-commerce)
```javascript
metrics: [
  { name: "purchaseRevenue" },
  { name: "totalPurchasers" },
  { name: "revenuePerUser" }
]
```
**Use Case**: Revenue tracking, conversion value

### 5. Content Grouping
```javascript
dimensions: [
  { name: "contentGroup1" }, // e.g., "Reviews", "Rankings", "Tools"
  { name: "contentGroup2" }  // e.g., "Category"
]
```
**Use Case**: Group pages by content type (already doing manually, could use this)

### 6. Screen Resolution
```javascript
dimensions: [
  { name: "screenResolution" }
]
```
**Use Case**: Device detection, responsive design optimization

### 7. Language & Locale
```javascript
dimensions: [
  { name: "language" }
]
```
**Use Case**: International audience analysis

### 8. Hostname
```javascript
dimensions: [
  { name: "hostName" }
]
```
**Use Case**: Subdomain tracking, staging vs production

## Implementation Priority

### High Priority
1. **Landing Page Analysis** - Critical for conversion optimization
2. **First User Source/Medium** - Better attribution
3. **Hour/Day of Week** - Traffic pattern analysis
4. **Content Grouping** - If configured in GA4, would replace manual categorization

### Medium Priority
5. **Screen Resolution** - Device detection enhancement
6. **Language** - International audience insights
7. **Pages Per Session** (as metric) - Validation of calculations

### Low Priority
8. **Revenue metrics** - Only if e-commerce is active
9. **Cohort dimensions** - Advanced analysis
10. **Custom dimensions** - If configured in GA4 property

## Notes

- **9 Dimension Limit**: GA4 has a maximum of 9 dimensions per request (including filters)
- **Custom Dimensions**: Must be registered in GA4 property first
- **Key Events**: Must be registered as key events in GA4
- **Event Parameters**: Can be accessed via `eventParameter:parameter_name`
- **Custom Metrics**: Can be accessed via `customEvent:parameter_name`

## Missing from GA4 (vs Universal Analytics)
- ❌ `exits` metric (we're using sessions as proxy)
- ❌ `entrances` metric
- ❌ `timeOnPage` (can calculate from engagement duration)
- ❌ `pageDepth` (can calculate from page views per session)

