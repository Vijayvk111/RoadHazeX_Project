import * as turf from '@turf/turf';

// Store loaded GeoJSON data globally in memory
let wardData = null;
let shData = null;

/**
 * Lazily loads the GeoJSON datasets from the public folder.
 * Will be called once during the app lifecycle.
 */
export const initJurisdictionEngine = async () => {
    try {
        if (!wardData) {
            const wardRes = await fetch('/data/chennai_wards.geojson');
            if (wardRes.ok) {
                wardData = await wardRes.json();
            }
        }
        if (!shData) {
            const shRes = await fetch('/data/state_highways.geojson');
            if (shRes.ok) {
                shData = await shRes.json();
            }
        }
    } catch (err) {
        console.warn("Jurisdiction Engine: Could not load GeoJSON layers. Using fallback mode.", err);
    }
};

/**
 * Detects the jurisdiction based on coordinates.
 * Priority: State Highway > Urban Ward
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Object} Detected Jurisdiction metadata
 */
export const detectJurisdiction = async (lat, lng) => {
    // Ensure engine is initialized
    await initJurisdictionEngine();

    const pt = turf.point([lng, lat]);

    // 1. Check State Highways (Buffer: 50 meters)
    if (shData) {
        // Turf requires lines for distance calculation, so we can use a small buffer or point-to-line
        // For simplicity in a FeatureCollection of LineStrings, we iterate:
        for (const feature of shData.features) {
            if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                const distance = turf.pointToLineDistance(pt, feature, { units: 'kilometers' });
                // If within 50 meters (0.05 km)
                if (distance < 0.05) {
                    return {
                        authority: 'Tamil Nadu State Highways Department',
                        jurisdiction_type: 'State Highway',
                        road_identifier: feature.properties?.name || 'SH (Unknown)',
                        zone: 'N/A',
                        ward: 'N/A'
                    };
                }
            }
        }
    }

    // 2. Check Chennai Wards (Point in Polygon)
    if (wardData) {
        for (const feature of wardData.features) {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                if (turf.booleanPointInPolygon(pt, feature)) {
                    return {
                        authority: 'Greater Chennai Corporation',
                        jurisdiction_type: 'Urban',
                        zone: feature.properties?.Zone_No || feature.properties?.zone || 'Unknown',
                        ward: feature.properties?.Ward_No || feature.properties?.ward || 'Unknown',
                        road_identifier: 'N/A'
                    };
                }
            }
        }
    }

    // 3. Fallback / Mock Mode (If GeoJSONs are missing or location is out of bounds)
    // Simulate GCC Urban response for testing in Chennai
    console.log("Jurisdiction Engine: GeoJSON missed. Using simulated urban response.");
    return {
        authority: 'Greater Chennai Corporation',
        jurisdiction_type: 'Urban',
        zone: '11',
        ward: '143',
        road_identifier: 'N/A'
    };
};
