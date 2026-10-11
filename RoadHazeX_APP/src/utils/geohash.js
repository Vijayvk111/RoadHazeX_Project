const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encode coordinates to a geohash string.
 */
export function encodeGeohash(lat, lng, precision = 9) {
    let minLat = -90, maxLat = 90;
    let minLng = -180, maxLng = 180;
    let geohash = "";
    let isEven = true;
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
        let mid;
        if (isEven) {
            mid = (minLng + maxLng) / 2;
            if (lng > mid) {
                ch |= 1 << (4 - bit);
                minLng = mid;
            } else {
                maxLng = mid;
            }
        } else {
            mid = (minLat + maxLat) / 2;
            if (lat > mid) {
                ch |= 1 << (4 - bit);
                minLat = mid;
            } else {
                maxLat = mid;
            }
        }

        isEven = !isEven;
        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }
    return geohash;
}

/**
 * Decode a geohash to coordinates and error margins.
 */
export function decodeGeohash(geohash) {
    let isEven = true;
    let minLat = -90, maxLat = 90;
    let minLng = -180, maxLng = 180;

    for (let i = 0; i < geohash.length; i++) {
        const c = geohash[i];
        const cd = BASE32.indexOf(c);
        if (cd === -1) throw new Error("Invalid geohash");

        for (let j = 0; j < 5; j++) {
            const mask = 1 << (4 - j);
            if (isEven) {
                const mid = (minLng + maxLng) / 2;
                if ((cd & mask) !== 0) {
                    minLng = mid;
                } else {
                    maxLng = mid;
                }
            } else {
                const mid = (minLat + maxLat) / 2;
                if ((cd & mask) !== 0) {
                    minLat = mid;
                } else {
                    maxLat = mid;
                }
            }
            isEven = !isEven;
        }
    }

    return {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2,
        latErr: (maxLat - minLat) / 2,
        lngErr: (maxLng - minLng) / 2
    };
}

/**
 * Get center geohash and all 8 surrounding neighbor geohash cells at a given precision.
 */
export function getGeohashNeighbors(lat, lng, precision = 5) {
    const centerHash = encodeGeohash(lat, lng, precision);
    const decoded = decodeGeohash(centerHash);
    
    // Height & width of cell
    const latSpan = decoded.latErr * 2;
    const lngSpan = decoded.lngErr * 2;

    const neighbors = [
        centerHash, // Include center
        encodeGeohash(decoded.lat + latSpan, decoded.lng, precision),           // North
        encodeGeohash(decoded.lat - latSpan, decoded.lng, precision),           // South
        encodeGeohash(decoded.lat, decoded.lng + lngSpan, precision),           // East
        encodeGeohash(decoded.lat, decoded.lng - lngSpan, precision),           // West
        encodeGeohash(decoded.lat + latSpan, decoded.lng + lngSpan, precision), // North-East
        encodeGeohash(decoded.lat + latSpan, decoded.lng - lngSpan, precision), // North-West
        encodeGeohash(decoded.lat - latSpan, decoded.lng + lngSpan, precision), // South-East
        encodeGeohash(decoded.lat - latSpan, decoded.lng - lngSpan, precision)  // South-West
    ];

    // Return unique values (just in case)
    return [...new Set(neighbors)];
}
