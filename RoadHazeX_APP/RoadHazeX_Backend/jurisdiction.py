import json
import os
from shapely.geometry import Point, shape
from shapely.geometry.polygon import Polygon
from shapely.geometry.multipolygon import MultiPolygon
from shapely.geometry.linestring import LineString
from shapely.geometry.multilinestring import MultiLineString
from shapely.strtree import STRtree

class JurisdictionEngine:
    def __init__(self, data_dir=None):
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        else:
            self.data_dir = data_dir
        self.chennai_wards = []
        self.national_highways = []
        self.state_highways = []
        self.rural_panchayats = []
        self.local_roads = []
        self.all_roads = []
        self.road_tree = None
        
        # Buffer for lines in degrees (~50 meters)
        self.highway_buffer = 0.00045 
        
        self.load_datasets()

    def _load_geojson(self, filename):
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            print(f"Warning: {filename} not found in {self.data_dir}")
            return []
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            features = []
            for feature in data.get('features', []):
                try:
                    geom = shape(feature['geometry'])
                    features.append({
                        'geometry': geom,
                        'properties': feature.get('properties', {})
                    })
                except Exception as e:
                    pass
            return features
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return []

    def load_datasets(self):
        print("Loading GIS datasets...")
        self.chennai_wards = self._load_geojson("chennai_wards.geojson")
        self.national_highways = self._load_geojson("national_highways.geojson")
        self.state_highways = self._load_geojson("state_highways.geojson")
        self.rural_panchayats = self._load_geojson("rural_panchayats.json")
        self.local_roads = self._load_geojson("local_roads_chennai1.json") + self._load_geojson("local_roads_chennai2.json")
        print(f"Loaded {len(self.chennai_wards)} Chennai wards.")
        print(f"Loaded {len(self.national_highways)} National Highways.")
        print(f"Loaded {len(self.state_highways)} State Highways.")
        print(f"Loaded {len(self.rural_panchayats)} Rural Panchayats.")
        print(f"Loaded {len(self.local_roads)} Local Roads.")
        
        # Build Spatial Index (STRtree) for instant road proximity lookups
        self.all_roads = self.national_highways + self.state_highways + self.local_roads
        if self.all_roads:
            geoms = [r['geometry'] for r in self.all_roads]
            self.road_tree = STRtree(geoms)
            print("Built STRtree Spatial Index for Roads.")

    def get_jurisdiction(self, lat, lng):
        debug_info = {
            "datasetsLoaded": bool(self.chennai_wards or self.national_highways or self.state_highways or self.rural_panchayats),
            "wardCount": len(self.chennai_wards),
            "shCount": len(self.state_highways),
            "nhCount": len(self.national_highways),
            "ruralCount": len(self.rural_panchayats),
            "matchedLayer": None,
            "roadDistance": None,
            "reason": None
        }

        try:
            point = Point(float(lng), float(lat))
        except (ValueError, TypeError):
            debug_info["reason"] = "Invalid coordinates"
            return {"Authority": "Unknown Jurisdiction", "Type": "Unknown"}, debug_info

        is_near_road = False
        min_road_distance = float('inf')
        nearest_road_name = "Unknown Road"

        # Calculate absolute nearest road using STRtree (O(log n) performance instead of O(n))
        if self.road_tree is not None:
            nearest_idx = self.road_tree.nearest(point)
            if nearest_idx is not None:
                nearest_road = self.all_roads[nearest_idx]
                min_road_distance = nearest_road['geometry'].distance(point)
                nearest_road_name = nearest_road['properties'].get('name', nearest_road['properties'].get('ref', 'Unknown Road'))

        debug_info["roadDistance"] = min_road_distance * 111000 if min_road_distance != float('inf') else None
        debug_info["nearestRoadName"] = nearest_road_name

        # 1. Check National Highways (Highest priority)
        for nh in self.national_highways:
            geom = nh['geometry']
            dist = geom.distance(point)
            if dist < min_road_distance:
                min_road_distance = dist
            if dist <= self.highway_buffer:
                name = nh['properties'].get('ref', nh['properties'].get('name', 'Unknown NH'))
                debug_info["matchedLayer"] = "National Highways"
                debug_info["roadDistance"] = dist * 111000 # Approx degrees to meters
                return {
                    "Authority": "NHAI",
                    "Type": "National Highway",
                    "RoadNumber": str(nh['properties'].get('ref', 'Unknown')),
                    "RoadName": str(nh['properties'].get('name', 'Unknown')),
                    "Details": str(name)
                }, debug_info

        # 2. Check State Highways
        for sh in self.state_highways:
            geom = sh['geometry']
            dist = geom.distance(point)
            if dist < min_road_distance:
                min_road_distance = dist
            if dist <= self.highway_buffer:
                name = sh['properties'].get('ref', sh['properties'].get('name', 'Unknown SH'))
                debug_info["matchedLayer"] = "State Highways"
                debug_info["roadDistance"] = dist * 111000
                return {
                    "Authority": "Tamil Nadu State Highways",
                    "Type": "State Highway",
                    "RoadNumber": str(sh['properties'].get('ref', 'Unknown')),
                    "RoadName": str(sh['properties'].get('name', 'Unknown')),
                    "Details": str(name)
                }, debug_info

        # 3. Check Chennai Wards
        for ward in self.chennai_wards:
            geom = ward['geometry']
            if geom.contains(point):
                props = ward['properties']
                ward_no = props.get('Ward_No', props.get('ward', props.get('WARD_NO', 'Unknown')))
                zone_no = props.get('Zone_No', props.get('zone', props.get('ZONE_NO', 'Unknown')))
                zone_name = props.get('Zone_Name', props.get('zone_name', props.get('ZONE_NAME', 'Unknown')))
                debug_info["matchedLayer"] = "Chennai Wards"
                return {
                    "Authority": "Greater Chennai Corporation (GCC)",
                    "Type": "Urban",
                    "ZoneNo": str(zone_no),
                    "ZoneName": str(zone_name),
                    "WardNo": str(ward_no),
                    "Details": f"Ward {ward_no}, Zone {zone_no}"
                }, debug_info

        # 4. Check Rural Panchayats
        for panchayat in self.rural_panchayats:
            geom = panchayat['geometry']
            if geom.contains(point):
                props = panchayat['properties']
                p_name = props.get('name', props.get('panchayat', 'Unknown Panchayat'))
                district = props.get('district', 'Unknown District')
                block = props.get('block', 'Unknown Block')
                village = props.get('village', '')
                debug_info["matchedLayer"] = "Rural Panchayats"
                return {
                    "Authority": "Rural Development and Panchayat Raj Department",
                    "Type": "Rural",
                    "District": str(district),
                    "Block": str(block),
                    "Panchayat": str(p_name),
                    "Village": str(village),
                    "Details": f"{p_name}, {district}"
                }, debug_info

        debug_info["reason"] = "Location falls outside known mapped zones"
        return {
            "Authority": "Unknown Jurisdiction",
            "Type": "Unknown",
            "Details": "Unmapped Area"
        }, debug_info

# Singleton instance
engine = JurisdictionEngine()
