import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Import leaflet.heat to extend L namespace
import "leaflet.heat";

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// US State name to abbreviation mapping
const stateNameToAbbr = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

// Convert state name to abbreviation code
const getStateCode = (stateName) => {
  if (!stateName || stateName === "N/A") return null;
  const normalized = stateName.trim();
  
  // If it's already a 2-letter code, return it
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized.toUpperCase())) {
    return normalized.toUpperCase();
  }
  
  // Try exact match first
  if (stateNameToAbbr[normalized]) return stateNameToAbbr[normalized];
  
  // Try case-insensitive match
  const lower = normalized.toLowerCase();
  for (const [key, abbr] of Object.entries(stateNameToAbbr)) {
    if (key.toLowerCase() === lower) return abbr;
  }
  
  // Try partial match (e.g., "California" might come as "California, US" or similar)
  for (const [key, abbr] of Object.entries(stateNameToAbbr)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return abbr;
    }
  }
  
  console.warn(`Could not find state code for: "${stateName}"`);
  return null;
};

// Country to approximate center coordinates mapping
const countryCoordinates = {
  "United States": [39.8283, -98.5795],
  "Canada": [56.1304, -106.3468],
  "United Kingdom": [55.3781, -3.4360],
  "Australia": [-25.2744, 133.7751],
  "Germany": [51.1657, 10.4515],
  "France": [46.2276, 2.2137],
  "Italy": [41.8719, 12.5674],
  "Spain": [40.4637, -3.7492],
  "Netherlands": [52.1326, 5.2913],
  "Belgium": [50.5039, 4.4699],
  "Switzerland": [46.8182, 8.2275],
  "Austria": [47.5162, 14.5501],
  "Sweden": [60.1282, 18.6435],
  "Norway": [60.4720, 8.4689],
  "Denmark": [56.2639, 9.5018],
  "Finland": [61.9241, 25.7482],
  "Poland": [51.9194, 19.1451],
  "Czech Republic": [49.8175, 15.4730],
  "Portugal": [39.3999, -8.2245],
  "Greece": [39.0742, 21.8243],
  "Ireland": [53.4129, -8.2439],
  "New Zealand": [-40.9006, 174.8860],
  "Japan": [36.2048, 138.2529],
  "South Korea": [35.9078, 127.7669],
  "China": [35.8617, 104.1954],
  "India": [20.5937, 78.9629],
  "Brazil": [-14.2350, -51.9253],
  "Mexico": [23.6345, -102.5528],
  "Argentina": [-38.4161, -63.6167],
  "Chile": [-35.6751, -71.5430],
  "South Africa": [-30.5595, 22.9375],
  "Egypt": [26.8206, 30.8025],
  "Israel": [31.0461, 34.8516],
  "United Arab Emirates": [23.4241, 53.8478],
  "Saudi Arabia": [23.8859, 45.0792],
  "Turkey": [38.9637, 35.2433],
  "Russia": [61.5240, 105.3188],
  "Singapore": [1.3521, 103.8198],
  "Malaysia": [4.2105, 101.9758],
  "Thailand": [15.8700, 100.9925],
  "Philippines": [12.8797, 121.7740],
  "Indonesia": [-0.7893, 113.9213],
  "Vietnam": [14.0583, 108.2772],
  "Taiwan": [23.6978, 120.9605],
  "Hong Kong": [22.3193, 114.1694],
};

// Get approximate coordinates for a country
const getCountryCoordinates = (countryName) => {
  // Try exact match first
  if (countryCoordinates[countryName]) {
    return countryCoordinates[countryName];
  }

  // Try case-insensitive match
  const lowerCountry = countryName.toLowerCase();
  for (const [key, coords] of Object.entries(countryCoordinates)) {
    if (key.toLowerCase() === lowerCountry) {
      return coords;
    }
  }

  // Try partial match (e.g., "United States" matches "United States of America")
  for (const [key, coords] of Object.entries(countryCoordinates)) {
    if (lowerCountry.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCountry)) {
      return coords;
    }
  }

  // Default to a central location if not found
  return null;
};

// Color function for state shading
const getStateColor = (users, maxUsers) => {
  if (!users || users === 0 || !maxUsers) {
    return "#f0f0f0"; // Light grey for no data
  }
  const intensity = users / maxUsers;
  if (intensity < 0.1) return "#e3f2fd"; // Very light blue
  if (intensity < 0.3) return "#90caf9"; // Light blue
  if (intensity < 0.5) return "#42a5f5"; // Medium blue
  if (intensity < 0.7) return "#1e88e5"; // Blue
  if (intensity < 0.9) return "#1565c0"; // Dark blue
  return "#0d47a1"; // Darkest blue
};

const GeographyHeatmap = ({ geographicData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const statesLayerRef = useRef(null);
  const [usStatesGeoJson, setUsStatesGeoJson] = useState(null);

  // Fetch US states GeoJSON (using a reliable source with state codes)
  useEffect(() => {
    // Try multiple sources for reliability
    const geoJsonSources = [
      "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
      "https://raw.githubusercontent.com/geojson/geojson-news/master/us-states.geojson",
    ];

    const fetchGeoJson = async () => {
      for (const source of geoJsonSources) {
        try {
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            setUsStatesGeoJson(data);
            return; // Success, stop trying other sources
          }
        } catch (error) {
          console.warn(`Failed to load GeoJSON from ${source}:`, error);
          continue; // Try next source
        }
      }
      console.error("Failed to load US states GeoJSON from all sources");
    };

    fetchGeoJson();
  }, []);

  useEffect(() => {
    if (!geographicData || geographicData.length === 0) {
      console.log("GeographyHeatmap: No geographic data provided");
      return;
    }

    // Don't proceed if GeoJSON isn't loaded yet
    if (!usStatesGeoJson) {
      console.log("GeographyHeatmap: Waiting for GeoJSON to load...");
      return;
    }

    console.log("GeographyHeatmap: Received data:", geographicData);

    // Initialize map if not already created
    if (!mapInstanceRef.current) {
      // Set initial view to US with appropriate zoom level
      mapInstanceRef.current = L.map(mapRef.current).setView([39.8283, -98.5795], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    // Separate US states from international data
    // Check for various country name formats
    const usStatesData = geographicData.filter((geo) => {
      const country = geo.country || "";
      const countryLower = country.toLowerCase();
      return (
        (country === "United States" ||
          countryLower.includes("united states") ||
          countryLower === "us" ||
          countryLower === "usa") &&
        geo.region &&
        geo.region !== "N/A" &&
        geo.region.trim() !== ""
      );
    });
    const internationalData = geographicData.filter((geo) => {
      const country = geo.country || "";
      const countryLower = country.toLowerCase();
      return (
        country !== "United States" &&
        !countryLower.includes("united states") &&
        countryLower !== "us" &&
        countryLower !== "usa"
      );
    });

    // Prepare state data map using state codes (e.g., { CA: 120, TX: 90 })
    const stateData = {};
    let maxStateUsers = 0;

    console.log("GeographyHeatmap: Filtered US states data:", usStatesData);

    usStatesData.forEach((geo) => {
      const stateCode = getStateCode(geo.region);
      if (stateCode) {
        const users = geo.users || 0;
        if (!stateData[stateCode]) {
          stateData[stateCode] = 0;
        }
        stateData[stateCode] += users;
        maxStateUsers = Math.max(maxStateUsers, stateData[stateCode]);
      } else {
        console.warn(`GeographyHeatmap: Could not convert region "${geo.region}" to state code for country "${geo.country}"`);
      }
    });

    console.log("GeographyHeatmap: State data map:", stateData);
    console.log("GeographyHeatmap: Max state users:", maxStateUsers);

    // Remove existing layers
    if (statesLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(statesLayerRef.current);
      statesLayerRef.current = null;
    }
    if (heatLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Add US states choropleth if GeoJSON is loaded
    if (usStatesGeoJson && Object.keys(stateData).length > 0) {
      console.log("GeographyHeatmap: Adding US states choropleth layer");
      // Log first feature properties to debug
      if (usStatesGeoJson.features && usStatesGeoJson.features.length > 0) {
        console.log("GeographyHeatmap: Sample GeoJSON feature properties:", usStatesGeoJson.features[0].properties);
      }
      
      // Helper function to extract state code from GeoJSON feature
      // First tries to find a state code property, then converts state name to code
      const getStateCodeFromFeature = (feature) => {
        const props = feature.properties || {};
        // Try common property names for state codes first
        const directCode =
          props.STUSPS ||
          props.abbrev ||
          props.code ||
          props.state_code ||
          props.state ||
          props.abbr ||
          props.usps ||
          null;
        
        if (directCode) return directCode;
        
        // If no direct code, try to convert state name to code
        const stateName =
          props.NAME ||
          props.name ||
          props.state_name ||
          props.state ||
          null;
        
        if (stateName) {
          const convertedCode = getStateCode(stateName);
          if (!convertedCode && usStatesGeoJson.features.indexOf(feature) < 3) {
            console.warn(`GeographyHeatmap: Could not convert state name "${stateName}" to code`);
          }
          return convertedCode;
        }
        
        return null;
      };

      // Helper function to extract state name from GeoJSON feature
      const getStateNameFromFeature = (feature) => {
        const props = feature.properties || {};
        return (
          props.NAME ||
          props.name ||
          props.state_name ||
          props.state ||
          "Unknown"
        );
      };

      const geoJsonLayer = L.geoJSON(usStatesGeoJson, {
        style: (feature) => {
          const stateCode = getStateCodeFromFeature(feature);
          const users = stateCode ? (stateData[stateCode] || 0) : 0;
          const color = getStateColor(users, maxStateUsers);
          
          // Debug log for first few features
          const featureIndex = usStatesGeoJson.features.indexOf(feature);
          if (featureIndex < 5) {
            console.log(`GeographyHeatmap: Feature #${featureIndex} "${getStateNameFromFeature(feature)}" -> Code: "${stateCode}", Users: ${users}, Color: ${color}, MaxUsers: ${maxStateUsers}`);
          }

          return {
            fillColor: color,
            weight: 2,
            opacity: 1,
            color: "#ffffff",
            dashArray: "3",
            fillOpacity: 0.7,
          };
        },
        onEachFeature: (feature, layer) => {
          const stateCode = getStateCodeFromFeature(feature);
          const stateName = getStateNameFromFeature(feature);
          const users = stateCode ? stateData[stateCode] || 0 : 0;

          layer.bindTooltip(
            `${stateName} (${stateCode || "N/A"}): ${users.toLocaleString()} ${users === 1 ? "user" : "users"}`,
            { permanent: false, direction: "center" }
          );

          layer.on({
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle({
                weight: 3,
                color: "#666",
                dashArray: "",
                fillOpacity: 0.9,
              });
            },
            mouseout: (e) => {
              const layer = e.target;
              const currentStateCode = getStateCodeFromFeature(feature);
              const currentUsers = currentStateCode ? stateData[currentStateCode] || 0 : 0;
              layer.setStyle({
                weight: 2,
                color: "#ffffff",
                dashArray: "3",
                fillOpacity: 0.7,
                fillColor: getStateColor(currentUsers, maxStateUsers),
              });
            },
          });
        },
      });

      statesLayerRef.current = geoJsonLayer;
      geoJsonLayer.addTo(mapInstanceRef.current);
      
      console.log("GeographyHeatmap: Added choropleth layer with", Object.keys(stateData).length, "states");

      // Always fit bounds to US (even if no state data, use GeoJSON bounds)
      if (usStatesGeoJson && usStatesGeoJson.features && usStatesGeoJson.features.length > 0) {
        const usBounds = geoJsonLayer.getBounds();
        mapInstanceRef.current.fitBounds(usBounds, { padding: [10, 10], maxZoom: 7 });
        console.log("GeographyHeatmap: Fitted map bounds to US states");
      }
    }

    // Prepare heatmap data for international countries
    const heatData = [];
    let maxUsers = 0;

    internationalData.forEach((geo) => {
      const coords = getCountryCoordinates(geo.country);
      if (coords) {
        const users = geo.users || 0;
        maxUsers = Math.max(maxUsers, users);
        heatData.push([coords[0], coords[1], users]);
      }
    });

    // Add heat layer for international countries
    if (heatData.length > 0) {
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: maxUsers,
        gradient: {
          0.0: "blue",
          0.5: "cyan",
          0.7: "lime",
          0.8: "yellow",
          1.0: "red",
        },
      }).addTo(mapInstanceRef.current);
    }

    // Cleanup function
    return () => {
      if (heatLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (statesLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(statesLayerRef.current);
        statesLayerRef.current = null;
      }
    };
  }, [geographicData, usStatesGeoJson]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Calculate max users for legend
  const usStatesDataForLegend = geographicData?.filter((geo) => {
    const country = geo.country || "";
    const countryLower = country.toLowerCase();
    return (
      (country === "United States" ||
        countryLower.includes("united states") ||
        countryLower === "us" ||
        countryLower === "usa") &&
      geo.region &&
      geo.region !== "N/A" &&
      geo.region.trim() !== ""
    );
  }) || [];
  const stateDataForLegend = {};
  let maxStateUsers = 0;
  usStatesDataForLegend.forEach((geo) => {
    const stateCode = getStateCode(geo.region);
    if (stateCode) {
      const users = geo.users || 0;
      if (!stateDataForLegend[stateCode]) {
        stateDataForLegend[stateCode] = 0;
      }
      stateDataForLegend[stateCode] += users;
      maxStateUsers = Math.max(maxStateUsers, stateDataForLegend[stateCode]);
    }
  });


  return (
    <div className="geography-heatmap-container">
      <div ref={mapRef} className="geography-heatmap" />
    </div>
  );
};

export default GeographyHeatmap;

