from jurisdiction import engine

# Test NH coordinates (example: somewhere on an NH in TN)
# I will use a known coordinate or just see what it returns for a random one in Chennai
test_points = [
    (13.0827, 80.2707), # Chennai Central (Expected: GCC)
    (11.9400, 79.8000), # Puducherry/Villupuram border area
]

for lat, lng in test_points:
    print(f"Testing {lat}, {lng}:")
    res = engine.get_jurisdiction(lat, lng)
    print(res)
    print("-" * 40)
