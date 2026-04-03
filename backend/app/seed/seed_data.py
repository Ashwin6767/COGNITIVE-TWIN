"""
Seed data for the Cognitive Twin logistics platform.
Populates Neo4j with companies, users, ports, vessels, yards,
trucks, containers, routes, shipments, and all relationships.
"""

from datetime import datetime, timedelta, timezone

from app.auth.password import hash_password
from app.services.graph_service import graph_service

# ---------------------------------------------------------------------------
# Static seed data
# ---------------------------------------------------------------------------

COMPANIES = [
    {"id": "COM-001", "name": "ToyWorld Manufacturing", "type": "SHIPPER", "country": "China"},
    {"id": "COM-002", "name": "Pacific Logistics Co.", "type": "LOGISTICS_PROVIDER", "country": "Singapore"},
    {"id": "COM-003", "name": "FastFreight America", "type": "CARRIER", "country": "United States"},
    {"id": "COM-004", "name": "ACME Corp", "type": "SHIPPER", "country": "United States"},
    # --- 4 additional companies ---
    {"id": "COM-005", "name": "GreenTech Electronics", "type": "SHIPPER", "country": "South Korea"},
    {"id": "COM-006", "name": "EuroMed Pharma", "type": "SHIPPER", "country": "Germany"},
    {"id": "COM-007", "name": "Global Freight Solutions", "type": "LOGISTICS_PROVIDER", "country": "Netherlands"},
    {"id": "COM-008", "name": "IndoPacific Shipping", "type": "CARRIER", "country": "India"},
]

USERS = [
    {
        "id": "USR-001", "email": "sarah@toyworld.cn", "name": "Sarah Chen",
        "role": "CUSTOMER", "company_id": "COM-001", "password": "demo123",
    },
    {
        "id": "USR-002", "email": "mike@acme.us", "name": "Mike Johnson",
        "role": "CUSTOMER", "company_id": "COM-004", "password": "demo123",
    },
    {
        "id": "USR-003", "email": "lisa@pacificlog.sg", "name": "Lisa Wong",
        "role": "LOGISTICS_MANAGER", "company_id": "COM-002", "password": "demo123",
    },
    {
        "id": "USR-004", "email": "wang@pacificlog.sg", "name": "Wang Wei",
        "role": "DRIVER", "company_id": "COM-002", "password": "demo123",
        "license_type": "CDL_A", "license_number": "DL-CN-001",
    },
    {
        "id": "USR-005", "email": "james@fastfreight.us", "name": "James Rodriguez",
        "role": "DRIVER", "company_id": "COM-003", "password": "demo123",
        "license_type": "CDL_A", "license_number": "DL-US-001",
    },
    {
        "id": "USR-006", "email": "zhang@shanghai-port.cn", "name": "Zhang Min",
        "role": "PORT_OFFICER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P001",
    },
    {
        "id": "USR-007", "email": "robert@la-port.us", "name": "Robert Smith",
        "role": "PORT_OFFICER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P003",
    },
    {
        "id": "USR-008", "email": "liu@customs.cn", "name": "Liu Yan",
        "role": "CUSTOMS_OFFICER", "company_id": None, "password": "demo123",
    },
    {
        "id": "USR-009", "email": "chen@shanghai-port.cn", "name": "Chen Bo",
        "role": "YARD_MANAGER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P001",
    },
    {
        "id": "USR-010", "email": "admin@cognitivetwin.io", "name": "System Admin",
        "role": "ADMIN", "company_id": None, "password": "admin123",
    },
    # --- 10 additional users (USR-011 through USR-020) ---
    {
        "id": "USR-011", "email": "park@greentech.kr", "name": "Park Jihyun",
        "role": "CUSTOMER", "company_id": "COM-005", "password": "demo123",
    },
    {
        "id": "USR-012", "email": "hans@euromed.de", "name": "Hans Mueller",
        "role": "CUSTOMER", "company_id": "COM-006", "password": "demo123",
    },
    {
        "id": "USR-013", "email": "david@globalfreight.nl", "name": "David Martinez",
        "role": "LOGISTICS_MANAGER", "company_id": "COM-007", "password": "demo123",
    },
    {
        "id": "USR-014", "email": "raj@indopacific.in", "name": "Raj Patel",
        "role": "DRIVER", "company_id": "COM-008", "password": "demo123",
        "license_type": "CDL_A", "license_number": "DL-IN-001",
    },
    {
        "id": "USR-015", "email": "tom@fastfreight.us", "name": "Tom Wilson",
        "role": "DRIVER", "company_id": "COM-003", "password": "demo123",
        "license_type": "CDL_A", "license_number": "DL-US-002",
    },
    {
        "id": "USR-016", "email": "kim@busan-port.kr", "name": "Kim Soo-jin",
        "role": "PORT_OFFICER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P007",
    },
    {
        "id": "USR-017", "email": "maria@santos-port.br", "name": "Maria Santos",
        "role": "PORT_OFFICER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P020",
    },
    {
        "id": "USR-018", "email": "ahmed@customs.ae", "name": "Ahmed Al-Rashid",
        "role": "CUSTOMS_OFFICER", "company_id": None, "password": "demo123",
    },
    {
        "id": "USR-019", "email": "pierre@rotterdam-yard.nl", "name": "Pierre Dubois",
        "role": "YARD_MANAGER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P004",
    },
    {
        "id": "USR-020", "email": "kenji@tokyo-yard.jp", "name": "Kenji Tanaka",
        "role": "YARD_MANAGER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P012",
    },
    {
        "id": "USR-021", "email": "priya@mumbai-port.in", "name": "Priya Sharma",
        "role": "PORT_OFFICER", "company_id": None, "password": "demo123",
        "assigned_port_id": "P006",
    },
]

PORTS = [
    {
        "id": "P001", "name": "Port of Shanghai", "country": "China",
        "lat": 31.23, "lon": 121.47, "congestion": "HIGH",
        "avg_delay_hours": 4.5, "capacity_teu": 40000, "utilization": 0.85,
    },
    {
        "id": "P002", "name": "Port of Singapore", "country": "Singapore",
        "lat": 1.26, "lon": 103.84, "congestion": "MEDIUM",
        "avg_delay_hours": 2.0, "capacity_teu": 35000, "utilization": 0.65,
    },
    {
        "id": "P003", "name": "Port of Los Angeles", "country": "United States",
        "lat": 33.74, "lon": -118.27, "congestion": "LOW",
        "avg_delay_hours": 1.0, "capacity_teu": 20000, "utilization": 0.45,
    },
    {
        "id": "P004", "name": "Port of Rotterdam", "country": "Netherlands",
        "lat": 51.95, "lon": 4.13, "congestion": "MEDIUM",
        "avg_delay_hours": 2.5, "capacity_teu": 30000, "utilization": 0.70,
    },
    {
        "id": "P005", "name": "Port of Dubai", "country": "UAE",
        "lat": 25.27, "lon": 55.29, "congestion": "LOW",
        "avg_delay_hours": 1.5, "capacity_teu": 22000, "utilization": 0.40,
    },
    {
        "id": "P006", "name": "Port of Mumbai", "country": "India",
        "lat": 19.00, "lon": 72.87, "congestion": "HIGH",
        "avg_delay_hours": 5.0, "capacity_teu": 18000, "utilization": 0.90,
    },
    # --- 20 additional real-world ports ---
    {
        "id": "P007", "name": "Port of Busan", "country": "South Korea",
        "lat": 35.1, "lon": 129.0, "congestion": "MEDIUM",
        "avg_delay_hours": 2.2, "capacity_teu": 22000, "utilization": 0.72,
    },
    {
        "id": "P008", "name": "Port of Hong Kong", "country": "China",
        "lat": 22.3, "lon": 114.2, "congestion": "HIGH",
        "avg_delay_hours": 3.8, "capacity_teu": 20000, "utilization": 0.80,
    },
    {
        "id": "P009", "name": "Port of Hamburg", "country": "Germany",
        "lat": 53.5, "lon": 10.0, "congestion": "LOW",
        "avg_delay_hours": 1.8, "capacity_teu": 14000, "utilization": 0.58,
    },
    {
        "id": "P010", "name": "Port of Antwerp", "country": "Belgium",
        "lat": 51.2, "lon": 4.4, "congestion": "MEDIUM",
        "avg_delay_hours": 2.4, "capacity_teu": 16000, "utilization": 0.68,
    },
    {
        "id": "P011", "name": "Port of Felixstowe", "country": "United Kingdom",
        "lat": 51.9, "lon": 1.3, "congestion": "LOW",
        "avg_delay_hours": 1.2, "capacity_teu": 10000, "utilization": 0.52,
    },
    {
        "id": "P012", "name": "Port of Tokyo", "country": "Japan",
        "lat": 35.6, "lon": 139.8, "congestion": "MEDIUM",
        "avg_delay_hours": 1.5, "capacity_teu": 15000, "utilization": 0.60,
    },
    {
        "id": "P013", "name": "Port of Colombo", "country": "Sri Lanka",
        "lat": 6.9, "lon": 79.8, "congestion": "MEDIUM",
        "avg_delay_hours": 3.0, "capacity_teu": 12000, "utilization": 0.74,
    },
    {
        "id": "P014", "name": "Port of Jeddah", "country": "Saudi Arabia",
        "lat": 21.5, "lon": 39.2, "congestion": "LOW",
        "avg_delay_hours": 1.6, "capacity_teu": 11000, "utilization": 0.45,
    },
    {
        "id": "P015", "name": "Port of Tanjung Pelepas", "country": "Malaysia",
        "lat": 1.4, "lon": 103.5, "congestion": "LOW",
        "avg_delay_hours": 1.3, "capacity_teu": 13000, "utilization": 0.50,
    },
    {
        "id": "P016", "name": "Port of Long Beach", "country": "United States",
        "lat": 33.8, "lon": -118.2, "congestion": "MEDIUM",
        "avg_delay_hours": 3.2, "capacity_teu": 18000, "utilization": 0.73,
    },
    {
        "id": "P017", "name": "Port of Savannah", "country": "United States",
        "lat": 32.1, "lon": -81.1, "congestion": "LOW",
        "avg_delay_hours": 1.0, "capacity_teu": 12000, "utilization": 0.55,
    },
    {
        "id": "P018", "name": "Port of Piraeus", "country": "Greece",
        "lat": 37.9, "lon": 23.6, "congestion": "MEDIUM",
        "avg_delay_hours": 2.8, "capacity_teu": 10000, "utilization": 0.66,
    },
    {
        "id": "P019", "name": "Port of Durban", "country": "South Africa",
        "lat": -29.9, "lon": 31.0, "congestion": "HIGH",
        "avg_delay_hours": 4.0, "capacity_teu": 9000, "utilization": 0.82,
    },
    {
        "id": "P020", "name": "Port of Santos", "country": "Brazil",
        "lat": -23.9, "lon": -46.3, "congestion": "HIGH",
        "avg_delay_hours": 4.2, "capacity_teu": 14000, "utilization": 0.88,
    },
    {
        "id": "P021", "name": "Port of Mundra", "country": "India",
        "lat": 22.7, "lon": 69.7, "congestion": "LOW",
        "avg_delay_hours": 1.4, "capacity_teu": 16000, "utilization": 0.48,
    },
    {
        "id": "P022", "name": "Port of Kaohsiung", "country": "Taiwan",
        "lat": 22.6, "lon": 120.3, "congestion": "MEDIUM",
        "avg_delay_hours": 2.0, "capacity_teu": 13000, "utilization": 0.62,
    },
    {
        "id": "P023", "name": "Port of Laem Chabang", "country": "Thailand",
        "lat": 13.1, "lon": 100.9, "congestion": "MEDIUM",
        "avg_delay_hours": 2.6, "capacity_teu": 11000, "utilization": 0.70,
    },
    {
        "id": "P024", "name": "Port of Jawaharlal Nehru", "country": "India",
        "lat": 18.9, "lon": 72.9, "congestion": "HIGH",
        "avg_delay_hours": 4.8, "capacity_teu": 15000, "utilization": 0.86,
    },
    {
        "id": "P025", "name": "Port of Valencia", "country": "Spain",
        "lat": 39.4, "lon": -0.3, "congestion": "LOW",
        "avg_delay_hours": 1.1, "capacity_teu": 9500, "utilization": 0.42,
    },
    {
        "id": "P026", "name": "Port of Algeciras", "country": "Spain",
        "lat": 36.1, "lon": -5.4, "congestion": "LOW",
        "avg_delay_hours": 1.0, "capacity_teu": 8500, "utilization": 0.38,
    },
]

VESSELS = [
    {
        "id": "V001", "name": "Pacific Star", "imo": "IMO 9876543",
        "flag": "Panama", "capacity_teu": 12000, "current_load_teu": 8500,
        "status": "AT_SEA", "lat": 15.2, "lon": 135.5, "speed_knots": 18,
    },
    {
        "id": "V002", "name": "Atlantic Runner", "imo": "IMO 9876544",
        "flag": "Liberia", "capacity_teu": 8000, "current_load_teu": 5200,
        "status": "IN_PORT", "lat": 31.23, "lon": 121.47, "speed_knots": 0,
    },
    {
        "id": "V003", "name": "Indian Ocean", "imo": "IMO 9876545",
        "flag": "Singapore", "capacity_teu": 10000, "current_load_teu": 7800,
        "status": "AT_SEA", "lat": 12.5, "lon": 75.3, "speed_knots": 16,
    },
    {
        "id": "V004", "name": "Mediterranean Express", "imo": "IMO 9876546",
        "flag": "Greece", "capacity_teu": 6000, "current_load_teu": 2100,
        "status": "APPROACHING", "lat": 35.8, "lon": -5.2, "speed_knots": 14,
    },
    # --- 6 additional vessels ---
    {
        "id": "V005", "name": "Pacific Harmony", "imo": "IMO 9345678",
        "flag": "Panama", "capacity_teu": 8500, "current_load_teu": 6100,
        "status": "IN_PORT", "lat": 31.23, "lon": 121.47, "speed_knots": 0,
    },
    {
        "id": "V006", "name": "Atlantic Pioneer", "imo": "IMO 9456789",
        "flag": "Liberia", "capacity_teu": 12000, "current_load_teu": 9400,
        "status": "AT_SEA", "lat": 28.5, "lon": -45.3, "speed_knots": 19,
    },
    {
        "id": "V007", "name": "Nordic Star", "imo": "IMO 9567890",
        "flag": "Marshall Islands", "capacity_teu": 6200, "current_load_teu": 3800,
        "status": "IN_PORT", "lat": 33.74, "lon": -118.27, "speed_knots": 0,
    },
    {
        "id": "V008", "name": "Maersk Aurora", "imo": "IMO 9678901",
        "flag": "Denmark", "capacity_teu": 18000, "current_load_teu": 15200,
        "status": "AT_SEA", "lat": 5.0, "lon": 80.5, "speed_knots": 21,
    },
    {
        "id": "V009", "name": "MSC Fortuna", "imo": "IMO 9789012",
        "flag": "Panama", "capacity_teu": 15000, "current_load_teu": 11300,
        "status": "ANCHORED", "lat": 1.20, "lon": 103.80, "speed_knots": 0,
    },
    {
        "id": "V010", "name": "COSCO Galaxy", "imo": "IMO 9890123",
        "flag": "China", "capacity_teu": 14000, "current_load_teu": 10500,
        "status": "IN_PORT", "lat": 22.3, "lon": 114.2, "speed_knots": 0,
    },
]

YARDS = [
    {
        "id": "YRD-001", "name": "Shanghai East Yard", "port_id": "P001",
        "total_slots": 200, "occupied_slots": 156,
    },
    {
        "id": "YRD-002", "name": "LA Terminal Yard", "port_id": "P003",
        "total_slots": 150, "occupied_slots": 67,
    },
    # --- 5 additional yards ---
    {
        "id": "YRD-003", "name": "Singapore Pasir Panjang Yard", "port_id": "P002",
        "total_slots": 250, "occupied_slots": 162,
    },
    {
        "id": "YRD-004", "name": "Rotterdam Europoort Yard", "port_id": "P004",
        "total_slots": 220, "occupied_slots": 154,
    },
    {
        "id": "YRD-005", "name": "Dubai Jebel Ali Yard", "port_id": "P005",
        "total_slots": 180, "occupied_slots": 72,
    },
    {
        "id": "YRD-006", "name": "Mumbai Nhava Sheva Yard", "port_id": "P006",
        "total_slots": 160, "occupied_slots": 144,
    },
    {
        "id": "YRD-007", "name": "Hong Kong Kwai Tsing Yard", "port_id": "P008",
        "total_slots": 190, "occupied_slots": 152,
    },
]

TRUCKS = [
    {
        "id": "TRK-001", "plate": "沪A-88888", "type": "CONTAINER_CHASSIS",
        "max_weight_kg": 30000, "status": "IN_USE",
    },
    {
        "id": "TRK-002", "plate": "CA-7X9K2M1", "type": "CONTAINER_CHASSIS",
        "max_weight_kg": 28000, "status": "AVAILABLE",
    },
    {
        "id": "TRK-003", "plate": "沪B-66666", "type": "FLATBED",
        "max_weight_kg": 25000, "status": "AVAILABLE",
    },
    # --- 3 additional trucks ---
    {
        "id": "TRK-004", "plate": "GA-3M8J7P2", "type": "CONTAINER_CHASSIS",
        "max_weight_kg": 32000, "status": "AVAILABLE",
    },
    {
        "id": "TRK-005", "plate": "NL-BX-94-TK", "type": "FLATBED",
        "max_weight_kg": 26000, "status": "IN_USE",
    },
    {
        "id": "TRK-006", "plate": "SG-XD5678A", "type": "CONTAINER_CHASSIS",
        "max_weight_kg": 30000, "status": "MAINTENANCE",
    },
]

CONTAINERS = [
    {
        "id": "CSLU1234567", "type": "40FT", "status": "ON_VESSEL",
        "seal_number": "SL-001-2026", "weight_kg": 22000, "max_weight_kg": 30000,
    },
    {
        "id": "MSKU7654321", "type": "40FT_HC", "status": "IN_YARD",
        "seal_number": "SL-002-2026", "weight_kg": 18000, "max_weight_kg": 32000,
        "yard_position": "A-05-2",
    },
    {
        "id": "TCNU3456789", "type": "20FT", "status": "IN_YARD",
        "seal_number": "SL-003-2026", "weight_kg": 12000, "max_weight_kg": 22000,
        "yard_position": "B-12-1",
    },
    {
        "id": "HLXU9876543", "type": "REEFER", "status": "LOADED",
        "seal_number": "SL-004-2026", "weight_kg": 20000, "max_weight_kg": 28000,
        "temperature_celsius": -18.0,
    },
    {
        "id": "OOLU5432109", "type": "40FT", "status": "EMPTY",
        "seal_number": None, "weight_kg": 3800, "max_weight_kg": 30000,
    },
    # --- 12 additional containers ---
    {
        "id": "TRHU2345678", "type": "40FT", "status": "IN_TRANSIT",
        "seal_number": "SL-005-2026", "weight_kg": 24500, "max_weight_kg": 30000,
    },
    {
        "id": "CMAU3456780", "type": "20FT", "status": "IN_YARD",
        "seal_number": "SL-006-2026", "weight_kg": 10800, "max_weight_kg": 22000,
        "yard_position": "C-03-1",
    },
    {
        "id": "EISU4567891", "type": "40FT_HC", "status": "LOADED",
        "seal_number": "SL-007-2026", "weight_kg": 26200, "max_weight_kg": 32000,
    },
    {
        "id": "MSCU5678902", "type": "40FT", "status": "EMPTY",
        "seal_number": None, "weight_kg": 3800, "max_weight_kg": 30000,
    },
    {
        "id": "KKFU6789013", "type": "REEFER", "status": "ON_VESSEL",
        "seal_number": "SL-008-2026", "weight_kg": 19500, "max_weight_kg": 28000,
        "temperature_celsius": -22.0,
    },
    {
        "id": "APLU7890124", "type": "20FT", "status": "DAMAGED",
        "seal_number": "SL-009-2026", "weight_kg": 8400, "max_weight_kg": 22000,
    },
    {
        "id": "OOLU8901235", "type": "40FT", "status": "IN_YARD",
        "seal_number": "SL-010-2026", "weight_kg": 21300, "max_weight_kg": 30000,
        "yard_position": "D-08-3",
    },
    {
        "id": "YMLU9012346", "type": "40FT_HC", "status": "IN_TRANSIT",
        "seal_number": "SL-011-2026", "weight_kg": 27800, "max_weight_kg": 32000,
    },
    {
        "id": "HPLU0123457", "type": "20FT", "status": "IN_YARD",
        "seal_number": "SL-012-2026", "weight_kg": 14200, "max_weight_kg": 22000,
        "yard_position": "A-11-2",
    },
    {
        "id": "SEGU1234568", "type": "40FT", "status": "LOADED",
        "seal_number": "SL-013-2026", "weight_kg": 23100, "max_weight_kg": 30000,
    },
    {
        "id": "ZIMU2345679", "type": "REEFER", "status": "EMPTY",
        "seal_number": None, "weight_kg": 4200, "max_weight_kg": 28000,
        "temperature_celsius": -20.0,
    },
    {
        "id": "HDMU3456780", "type": "40FT", "status": "ON_VESSEL",
        "seal_number": "SL-014-2026", "weight_kg": 25600, "max_weight_kg": 30000,
    },
]

ROUTES = [
    {"from_port": "P001", "to_port": "P003", "distance_nm": 5800, "avg_days": 14},
    {"from_port": "P001", "to_port": "P004", "distance_nm": 10500, "avg_days": 28},
    {"from_port": "P001", "to_port": "P005", "distance_nm": 5400, "avg_days": 13},
    {"from_port": "P002", "to_port": "P003", "distance_nm": 7800, "avg_days": 20},
    {"from_port": "P002", "to_port": "P004", "distance_nm": 8400, "avg_days": 22},
    {"from_port": "P006", "to_port": "P004", "distance_nm": 6200, "avg_days": 16},
    {"from_port": "P006", "to_port": "P005", "distance_nm": 1200, "avg_days": 3},
    # --- additional routes for new ports ---
    {"from_port": "P007", "to_port": "P003", "distance_nm": 5100, "avg_days": 13},
    {"from_port": "P007", "to_port": "P016", "distance_nm": 5200, "avg_days": 13},
    {"from_port": "P008", "to_port": "P004", "distance_nm": 9800, "avg_days": 26},
    {"from_port": "P008", "to_port": "P003", "distance_nm": 6400, "avg_days": 16},
    {"from_port": "P009", "to_port": "P017", "distance_nm": 4500, "avg_days": 12},
    {"from_port": "P010", "to_port": "P011", "distance_nm": 220, "avg_days": 1},
    {"from_port": "P001", "to_port": "P012", "distance_nm": 1050, "avg_days": 3},
    {"from_port": "P013", "to_port": "P004", "distance_nm": 6400, "avg_days": 17},
    {"from_port": "P002", "to_port": "P014", "distance_nm": 3800, "avg_days": 10},
    {"from_port": "P015", "to_port": "P008", "distance_nm": 1600, "avg_days": 4},
    {"from_port": "P020", "to_port": "P004", "distance_nm": 5800, "avg_days": 15},
    {"from_port": "P019", "to_port": "P018", "distance_nm": 4200, "avg_days": 11},
    {"from_port": "P001", "to_port": "P007", "distance_nm": 520, "avg_days": 2},
    {"from_port": "P022", "to_port": "P003", "distance_nm": 6000, "avg_days": 15},
    {"from_port": "P023", "to_port": "P009", "distance_nm": 8500, "avg_days": 22},
    {"from_port": "P024", "to_port": "P025", "distance_nm": 5500, "avg_days": 14},
    {"from_port": "P021", "to_port": "P026", "distance_nm": 5200, "avg_days": 13},
]

_now = datetime.now(timezone.utc)

SHIPMENTS = [
    {
        "id": "SHP-2026-001", "status": "IN_TRANSIT_SEA", "priority": "EXPRESS",
        "customer_id": "USR-001", "container_id": "CSLU1234567",
        "origin_port": "P001", "dest_port": "P003", "vessel_id": "V001",
        "driver_id": "USR-004",
        "pickup_address": "200 Yangshupu Rd, Hongkou, Shanghai",
        "pickup_lat": 31.2600, "pickup_lng": 121.5100,
        "trucks_required": 2, "cargo_weight_kg": 24000,
        "current_location": "Pacific Ocean", "eta": (_now + timedelta(days=7)).isoformat(),
        "created_at": (_now - timedelta(days=10)).isoformat(),
        "updated_at": (_now - timedelta(hours=6)).isoformat(),
    },
    {
        "id": "SHP-2026-002", "status": "IN_YARD", "priority": "STANDARD",
        "customer_id": "USR-001", "container_id": "MSKU7654321",
        "origin_port": "P001", "dest_port": "P004", "vessel_id": None,
        "current_location": "Shanghai East Yard", "eta": (_now + timedelta(days=30)).isoformat(),
        "created_at": (_now - timedelta(days=5)).isoformat(),
        "updated_at": (_now - timedelta(hours=12)).isoformat(),
    },
    {
        "id": "SHP-2026-003", "status": "CUSTOMS_CLEARANCE", "priority": "STANDARD",
        "customer_id": "USR-002", "container_id": "TCNU3456789",
        "origin_port": "P001", "dest_port": "P003", "vessel_id": None,
        "current_location": "Port of Shanghai - Customs", "eta": (_now + timedelta(days=16)).isoformat(),
        "created_at": (_now - timedelta(days=4)).isoformat(),
        "updated_at": (_now - timedelta(hours=3)).isoformat(),
    },
    {
        "id": "SHP-2026-004", "status": "GOODS_RELEASED", "priority": "CRITICAL",
        "customer_id": "USR-002", "container_id": None,
        "origin_port": "P006", "dest_port": "P004", "vessel_id": None,
        "current_location": "Port of Mumbai", "eta": (_now + timedelta(days=18)).isoformat(),
        "created_at": (_now - timedelta(days=3)).isoformat(),
        "updated_at": (_now - timedelta(hours=1)).isoformat(),
    },
    {
        "id": "SHP-2026-005", "status": "DRIVER_ASSIGNED", "priority": "STANDARD",
        "customer_id": "USR-001", "container_id": None,
        "origin_port": "P001", "dest_port": "P005", "vessel_id": None,
        "driver_id": "USR-004",
        "pickup_address": "88 Waigaoqiao Free Trade Zone, Pudong, Shanghai",
        "pickup_lat": 31.3500, "pickup_lng": 121.5880,
        "trucks_required": 1, "cargo_weight_kg": 12000,
        "current_location": "Port of Shanghai", "eta": (_now + timedelta(days=15)).isoformat(),
        "created_at": (_now - timedelta(days=2)).isoformat(),
        "updated_at": (_now - timedelta(minutes=30)).isoformat(),
    },
    {
        "id": "SHP-2026-006", "status": "UNDER_REVIEW", "priority": "STANDARD",
        "customer_id": "USR-002", "container_id": None,
        "origin_port": "P002", "dest_port": "P003", "vessel_id": None,
        "current_location": "Pending", "eta": None,
        "created_at": (_now - timedelta(days=1)).isoformat(),
        "updated_at": (_now - timedelta(hours=2)).isoformat(),
    },
    {
        "id": "SHP-2026-007", "status": "LAST_MILE_ASSIGNED", "priority": "EXPRESS",
        "customer_id": "USR-001", "container_id": None,
        "origin_port": "P001", "dest_port": "P003", "vessel_id": None,
        "driver_id": "USR-005",
        "current_location": "Los Angeles", "eta": (_now + timedelta(days=1)).isoformat(),
        "created_at": (_now - timedelta(days=15)).isoformat(),
        "updated_at": (_now - timedelta(minutes=45)).isoformat(),
    },
    {
        "id": "SHP-2026-008", "status": "DELIVERED", "priority": "STANDARD",
        "customer_id": "USR-002", "container_id": None,
        "origin_port": "P006", "dest_port": "P005", "vessel_id": None,
        "current_location": "Dubai", "eta": None,
        "created_at": (_now - timedelta(days=20)).isoformat(),
        "updated_at": (_now - timedelta(days=1)).isoformat(),
    },
    # --- 8 additional shipments ---
    {
        "id": "SHP-2026-009", "status": "REQUEST_SUBMITTED", "priority": "NORMAL",
        "customer_id": "USR-001", "container_id": None,
        "origin_port": "P007", "dest_port": "P016", "vessel_id": None,
        "current_location": "Pending", "eta": None,
        "created_at": (_now - timedelta(hours=6)).isoformat(),
        "updated_at": (_now - timedelta(hours=6)).isoformat(),
    },
    {
        "id": "SHP-2026-010", "status": "APPROVED", "priority": "HIGH",
        "customer_id": "USR-002", "container_id": None,
        "origin_port": "P008", "dest_port": "P004", "vessel_id": None,
        "current_location": "Port of Hong Kong", "eta": (_now + timedelta(days=28)).isoformat(),
        "created_at": (_now - timedelta(days=2)).isoformat(),
        "updated_at": (_now - timedelta(hours=4)).isoformat(),
    },
    {
        "id": "SHP-2026-011", "status": "PICKUP_EN_ROUTE", "priority": "NORMAL",
        "customer_id": "USR-001", "container_id": "EISU4567891",
        "origin_port": "P002", "dest_port": "P009", "vessel_id": None,
        "driver_id": "USR-004",
        "current_location": "En route to shipper", "eta": (_now + timedelta(days=24)).isoformat(),
        "created_at": (_now - timedelta(days=3)).isoformat(),
        "updated_at": (_now - timedelta(hours=2)).isoformat(),
    },
    {
        "id": "SHP-2026-012", "status": "AT_ORIGIN_PORT", "priority": "CRITICAL",
        "customer_id": "USR-002", "container_id": "SEGU1234568",
        "origin_port": "P001", "dest_port": "P017", "vessel_id": None,
        "current_location": "Port of Shanghai", "eta": (_now + timedelta(days=18)).isoformat(),
        "created_at": (_now - timedelta(days=5)).isoformat(),
        "updated_at": (_now - timedelta(hours=1)).isoformat(),
    },
    {
        "id": "SHP-2026-013", "status": "CUSTOMS_CLEARANCE", "priority": "HIGH",
        "customer_id": "USR-001", "container_id": "CMAU3456780",
        "origin_port": "P006", "dest_port": "P010", "vessel_id": None,
        "current_location": "Port of Mumbai - Customs", "eta": (_now + timedelta(days=20)).isoformat(),
        "created_at": (_now - timedelta(days=6)).isoformat(),
        "updated_at": (_now - timedelta(hours=5)).isoformat(),
    },
    {
        "id": "SHP-2026-014", "status": "IN_YARD", "priority": "NORMAL",
        "customer_id": "USR-002", "container_id": "OOLU8901235",
        "origin_port": "P004", "dest_port": "P019", "vessel_id": None,
        "current_location": "Rotterdam Europoort Yard", "eta": (_now + timedelta(days=14)).isoformat(),
        "created_at": (_now - timedelta(days=7)).isoformat(),
        "updated_at": (_now - timedelta(hours=8)).isoformat(),
    },
    {
        "id": "SHP-2026-015", "status": "LOADED_ON_VESSEL", "priority": "HIGH",
        "customer_id": "USR-001", "container_id": "HDMU3456780",
        "origin_port": "P002", "dest_port": "P020", "vessel_id": "V009",
        "current_location": "Port of Singapore", "eta": (_now + timedelta(days=16)).isoformat(),
        "created_at": (_now - timedelta(days=8)).isoformat(),
        "updated_at": (_now - timedelta(hours=3)).isoformat(),
    },
    {
        "id": "SHP-2026-016", "status": "IN_TRANSIT_SEA", "priority": "CRITICAL",
        "customer_id": "USR-002", "container_id": "KKFU6789013",
        "origin_port": "P008", "dest_port": "P003", "vessel_id": "V008",
        "current_location": "Indian Ocean", "eta": (_now + timedelta(days=10)).isoformat(),
        "created_at": (_now - timedelta(days=12)).isoformat(),
        "updated_at": (_now - timedelta(hours=2)).isoformat(),
    },
    # --- 14 additional shipments (SHP-2026-017 through SHP-2026-030) ---
    {
        "id": "SHP-2026-017", "status": "AWAITING_CUSTOMER_DETAILS", "priority": "EXPRESS",
        "customer_id": "USR-011", "container_id": None,
        "origin_port": "P007", "dest_port": "P003", "vessel_id": None,
        "current_location": "Pending details", "eta": None,
        "created_at": (_now - timedelta(hours=12)).isoformat(),
        "updated_at": (_now - timedelta(hours=10)).isoformat(),
    },
    {
        "id": "SHP-2026-018", "status": "REJECTED", "priority": "STANDARD",
        "customer_id": "USR-012", "container_id": None,
        "origin_port": "P009", "dest_port": "P019", "vessel_id": None,
        "current_location": "Rejected", "eta": None,
        "created_at": (_now - timedelta(days=2)).isoformat(),
        "updated_at": (_now - timedelta(days=1)).isoformat(),
    },
    {
        "id": "SHP-2026-019", "status": "CANCELLED", "priority": "STANDARD",
        "customer_id": "USR-011", "container_id": None,
        "origin_port": "P001", "dest_port": "P004", "vessel_id": None,
        "current_location": "Cancelled", "eta": None,
        "created_at": (_now - timedelta(days=5)).isoformat(),
        "updated_at": (_now - timedelta(days=3)).isoformat(),
    },
    {
        "id": "SHP-2026-020", "status": "IN_TRANSIT_TO_PORT", "priority": "CRITICAL",
        "customer_id": "USR-012", "container_id": None,
        "origin_port": "P004", "dest_port": "P020", "vessel_id": None,
        "driver_id": "USR-014",
        "pickup_address": "Industriestrasse 42, Hamburg",
        "pickup_lat": 53.55, "pickup_lng": 10.00,
        "trucks_required": 3, "cargo_weight_kg": 45000,
        "current_location": "En route to Port of Rotterdam",
        "eta": (_now + timedelta(days=18)).isoformat(),
        "created_at": (_now - timedelta(days=4)).isoformat(),
        "updated_at": (_now - timedelta(hours=3)).isoformat(),
    },
    {
        "id": "SHP-2026-021", "status": "PORT_ENTRY", "priority": "EXPRESS",
        "customer_id": "USR-011", "container_id": "TRHU2345678",
        "origin_port": "P002", "dest_port": "P012", "vessel_id": None,
        "current_location": "Port of Singapore - Gate",
        "eta": (_now + timedelta(days=5)).isoformat(),
        "created_at": (_now - timedelta(days=6)).isoformat(),
        "updated_at": (_now - timedelta(hours=1)).isoformat(),
    },
    {
        "id": "SHP-2026-022", "status": "ARRIVED_DEST_PORT", "priority": "STANDARD",
        "customer_id": "USR-012", "container_id": "YMLU9012346",
        "origin_port": "P001", "dest_port": "P003", "vessel_id": "V007",
        "current_location": "Port of Los Angeles",
        "eta": (_now + timedelta(days=1)).isoformat(),
        "created_at": (_now - timedelta(days=16)).isoformat(),
        "updated_at": (_now - timedelta(hours=4)).isoformat(),
    },
    {
        "id": "SHP-2026-023", "status": "DRIVER_ASSIGNED", "priority": "CRITICAL",
        "customer_id": "USR-002", "container_id": None,
        "origin_port": "P006", "dest_port": "P014", "vessel_id": None,
        "driver_id": "USR-014",
        "pickup_address": "Nhava Sheva Industrial Zone, Navi Mumbai",
        "pickup_lat": 18.95, "pickup_lng": 72.95,
        "trucks_required": 2, "cargo_weight_kg": 32000,
        "current_location": "Awaiting pickup",
        "eta": (_now + timedelta(days=6)).isoformat(),
        "created_at": (_now - timedelta(days=1)).isoformat(),
        "updated_at": (_now - timedelta(minutes=45)).isoformat(),
    },
    {
        "id": "SHP-2026-024", "status": "PICKUP_EN_ROUTE", "priority": "EXPRESS",
        "customer_id": "USR-011", "container_id": None,
        "origin_port": "P007", "dest_port": "P017", "vessel_id": None,
        "driver_id": "USR-015",
        "pickup_address": "Gamcheon Port District, Busan",
        "pickup_lat": 35.08, "pickup_lng": 129.02,
        "trucks_required": 1, "cargo_weight_kg": 15000,
        "current_location": "Driver en route",
        "eta": (_now + timedelta(days=15)).isoformat(),
        "created_at": (_now - timedelta(days=2)).isoformat(),
        "updated_at": (_now - timedelta(hours=1)).isoformat(),
    },
    {
        "id": "SHP-2026-025", "status": "IN_TRANSIT_SEA", "priority": "STANDARD",
        "customer_id": "USR-012", "container_id": "EISU4567891",
        "origin_port": "P004", "dest_port": "P024", "vessel_id": "V006",
        "current_location": "Atlantic Ocean",
        "eta": (_now + timedelta(days=12)).isoformat(),
        "created_at": (_now - timedelta(days=10)).isoformat(),
        "updated_at": (_now - timedelta(hours=5)).isoformat(),
    },
    {
        "id": "SHP-2026-026", "status": "UNDER_REVIEW", "priority": "HIGH",
        "customer_id": "USR-011", "container_id": None,
        "origin_port": "P022", "dest_port": "P003", "vessel_id": None,
        "current_location": "Pending review", "eta": None,
        "created_at": (_now - timedelta(hours=8)).isoformat(),
        "updated_at": (_now - timedelta(hours=6)).isoformat(),
    },
    {
        "id": "SHP-2026-027", "status": "GOODS_RELEASED", "priority": "STANDARD",
        "customer_id": "USR-012", "container_id": None,
        "origin_port": "P009", "dest_port": "P017", "vessel_id": None,
        "driver_id": "USR-015",
        "current_location": "Hamburg warehouse",
        "eta": (_now + timedelta(days=14)).isoformat(),
        "created_at": (_now - timedelta(days=3)).isoformat(),
        "updated_at": (_now - timedelta(hours=2)).isoformat(),
    },
    {
        "id": "SHP-2026-028", "status": "LOADED_ON_VESSEL", "priority": "EXPRESS",
        "customer_id": "USR-002", "container_id": "SEGU1234568",
        "origin_port": "P001", "dest_port": "P011", "vessel_id": "V005",
        "current_location": "Port of Shanghai",
        "eta": (_now + timedelta(days=4)).isoformat(),
        "created_at": (_now - timedelta(days=9)).isoformat(),
        "updated_at": (_now - timedelta(hours=6)).isoformat(),
    },
    {
        "id": "SHP-2026-029", "status": "DELIVERED", "priority": "CRITICAL",
        "customer_id": "USR-011", "container_id": None,
        "origin_port": "P008", "dest_port": "P016", "vessel_id": None,
        "current_location": "Long Beach, CA", "eta": None,
        "created_at": (_now - timedelta(days=22)).isoformat(),
        "updated_at": (_now - timedelta(days=1)).isoformat(),
    },
    {
        "id": "SHP-2026-030", "status": "REQUEST_SUBMITTED", "priority": "STANDARD",
        "customer_id": "USR-012", "container_id": None,
        "origin_port": "P013", "dest_port": "P004", "vessel_id": None,
        "current_location": "Pending", "eta": None,
        "created_at": (_now - timedelta(hours=4)).isoformat(),
        "updated_at": (_now - timedelta(hours=4)).isoformat(),
    },
]

NOTIFICATIONS = [
    {
        "id": "NTF-001", "message": "Your shipment SHP-2026-001 is now in transit across the Pacific.",
        "type": "INFO", "shipment_id": "SHP-2026-001", "user_id": "USR-001", "read": False,
    },
    {
        "id": "NTF-002", "message": "Customs clearance delay for SHP-2026-003. Estimated 2 hour hold.",
        "type": "WARNING", "shipment_id": "SHP-2026-003", "user_id": "USR-002", "read": False,
    },
    {
        "id": "NTF-003", "message": "Shipment SHP-2026-008 has been delivered successfully.",
        "type": "SUCCESS", "shipment_id": "SHP-2026-008", "user_id": "USR-002", "read": True,
    },
    {
        "id": "NTF-004", "message": "Driver assigned for pickup of SHP-2026-005. ETA 45 minutes.",
        "type": "INFO", "shipment_id": "SHP-2026-005", "user_id": "USR-001", "read": False,
    },
    {
        "id": "NTF-005", "message": "Port congestion alert: Shanghai port experiencing HIGH congestion.",
        "type": "WARNING", "shipment_id": "SHP-2026-002", "user_id": "USR-001", "read": False,
    },
    {
        "id": "NTF-006", "message": "Shipment SHP-2026-004 cleared customs at Port of Mumbai.",
        "type": "SUCCESS", "shipment_id": "SHP-2026-004", "user_id": "USR-002", "read": True,
    },
    {
        "id": "NTF-007", "message": "Your shipment SHP-2026-012 has arrived at the origin port.",
        "type": "INFO", "shipment_id": "SHP-2026-012", "user_id": "USR-002", "read": False,
    },
    {
        "id": "NTF-008", "message": "Vessel delay: Maersk Aurora experiencing weather delays. SHP-2026-016 ETA updated.",
        "type": "WARNING", "shipment_id": "SHP-2026-016", "user_id": "USR-002", "read": False,
    },
    {
        "id": "NTF-009", "message": "Shipment SHP-2026-015 loaded onto MSC Fortuna at Singapore.",
        "type": "SUCCESS", "shipment_id": "SHP-2026-015", "user_id": "USR-001", "read": False,
    },
    {
        "id": "NTF-010", "message": "New shipment request SHP-2026-009 submitted for review.",
        "type": "INFO", "shipment_id": "SHP-2026-009", "user_id": "USR-001", "read": False,
    },
    {
        "id": "NTF-011", "message": "Shipment SHP-2026-010 approved. Awaiting driver assignment.",
        "type": "SUCCESS", "shipment_id": "SHP-2026-010", "user_id": "USR-002", "read": False,
    },
    {
        "id": "NTF-012", "message": "Container APLU7890124 flagged as DAMAGED during inspection.",
        "type": "WARNING", "shipment_id": None, "user_id": "USR-003", "read": False,
    },
    # --- 18 additional notifications (NTF-013 through NTF-030) ---
    # For new customers
    {
        "id": "NTF-013", "message": "Your shipment SHP-2026-017 has been approved. Please provide pickup details.",
        "type": "WARNING", "shipment_id": "SHP-2026-017", "user_id": "USR-011", "read": False,
    },
    {
        "id": "NTF-014", "message": "Your shipment SHP-2026-018 has been rejected. Reason: Insufficient documentation.",
        "type": "WARNING", "shipment_id": "SHP-2026-018", "user_id": "USR-012", "read": False,
    },
    {
        "id": "NTF-015", "message": "Shipment SHP-2026-029 delivered to Long Beach. Proof of delivery available.",
        "type": "SUCCESS", "shipment_id": "SHP-2026-029", "user_id": "USR-011", "read": False,
    },
    # For logistics managers
    {
        "id": "NTF-016", "message": "3 shipment requests pending review. Oldest: SHP-2026-009 (6 hours).",
        "type": "WARNING", "shipment_id": "SHP-2026-009", "user_id": "USR-003", "read": False,
    },
    {
        "id": "NTF-017", "message": "CRITICAL: SHP-2026-020 cargo weight 45000kg requires special handling.",
        "type": "WARNING", "shipment_id": "SHP-2026-020", "user_id": "USR-003", "read": False,
    },
    {
        "id": "NTF-018", "message": "New shipment SHP-2026-030 submitted from Port of Colombo. Review needed.",
        "type": "INFO", "shipment_id": "SHP-2026-030", "user_id": "USR-013", "read": False,
    },
    # For drivers
    {
        "id": "NTF-019", "message": "New pickup assignment: SHP-2026-011 at Singapore. Navigate to shipper.",
        "type": "INFO", "shipment_id": "SHP-2026-011", "user_id": "USR-004", "read": False,
    },
    {
        "id": "NTF-020", "message": "Pickup assignment: SHP-2026-023 at Mumbai. Cargo: 32000kg.",
        "type": "INFO", "shipment_id": "SHP-2026-023", "user_id": "USR-014", "read": False,
    },
    {
        "id": "NTF-021", "message": "En route update: SHP-2026-024 expected arrival at Busan port in 2 hours.",
        "type": "INFO", "shipment_id": "SHP-2026-024", "user_id": "USR-015", "read": False,
    },
    # For port officers
    {
        "id": "NTF-022", "message": "Vessel Pacific Harmony (V005) requesting departure clearance from Shanghai.",
        "type": "WARNING", "shipment_id": None, "user_id": "USR-006", "read": False,
    },
    {
        "id": "NTF-023", "message": "Shipment SHP-2026-022 arrived at LA. Container YMLU9012346 ready for unloading.",
        "type": "INFO", "shipment_id": "SHP-2026-022", "user_id": "USR-007", "read": False,
    },
    {
        "id": "NTF-024", "message": "Port of Busan: 3 shipments pending port entry.",
        "type": "INFO", "shipment_id": None, "user_id": "USR-016", "read": False,
    },
    # For customs officers
    {
        "id": "NTF-025", "message": "Customs review needed: SHP-2026-003 (Electronics, HS 8471). Pending 3 hours.",
        "type": "WARNING", "shipment_id": "SHP-2026-003", "user_id": "USR-008", "read": False,
    },
    {
        "id": "NTF-026", "message": "HIGH priority customs declaration: SHP-2026-013 from Mumbai.",
        "type": "WARNING", "shipment_id": "SHP-2026-013", "user_id": "USR-008", "read": False,
    },
    {
        "id": "NTF-027", "message": "New customs declaration submitted for SHP-2026-021 at Singapore.",
        "type": "INFO", "shipment_id": "SHP-2026-021", "user_id": "USR-018", "read": False,
    },
    # For yard managers
    {
        "id": "NTF-028", "message": "Shanghai East Yard at 78% capacity (156/200 slots). Consider reallocation.",
        "type": "WARNING", "shipment_id": None, "user_id": "USR-009", "read": False,
    },
    {
        "id": "NTF-029", "message": "Container OOLU8901235 scheduled for loading onto vessel tomorrow.",
        "type": "INFO", "shipment_id": None, "user_id": "USR-019", "read": False,
    },
    {
        "id": "NTF-030", "message": "Container APLU7890124 flagged DAMAGED. Inspection required.",
        "type": "WARNING", "shipment_id": None, "user_id": "USR-009", "read": False,
    },
]


# ---------------------------------------------------------------------------
# Seed runner
# ---------------------------------------------------------------------------

async def run_seed() -> None:
    """Clear all data and populate the graph with seed data."""

    # ------------------------------------------------------------------
    # 1. Wipe the database
    # ------------------------------------------------------------------
    print("🗑️  Clearing all existing data …")
    await graph_service.run("MATCH (n) DETACH DELETE n")
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 2. Companies
    # ------------------------------------------------------------------
    print("🏢 Creating companies …")
    for c in COMPANIES:
        await graph_service.run(
            """
            CREATE (c:Company {
                id: $id, name: $name, type: $type, country: $country
            })
            """,
            c,
        )
    print(f"   Created {len(COMPANIES)} companies.\n")

    # ------------------------------------------------------------------
    # 3. Users (passwords hashed before insertion)
    # ------------------------------------------------------------------
    print("👤 Creating users …")
    for u in USERS:
        hashed = hash_password(u["password"])
        params = {
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "password_hash": hashed,
            "is_active": True,
            "created_at": _now.isoformat(),
            "updated_at": _now.isoformat(),
        }
        # Optional driver-specific fields
        if u.get("license_type"):
            params["license_type"] = u["license_type"]
        if u.get("license_number"):
            params["license_number"] = u["license_number"]
        if u.get("assigned_port_id"):
            params["assigned_port_id"] = u["assigned_port_id"]

        props = ", ".join(f"{k}: ${k}" for k in params)
        await graph_service.run(f"CREATE (u:User {{{props}}})", params)
    print(f"   Created {len(USERS)} users.\n")

    # ------------------------------------------------------------------
    # 4. Ports
    # ------------------------------------------------------------------
    print("⚓ Creating ports …")
    for p in PORTS:
        await graph_service.run(
            """
            CREATE (p:Port {
                id: $id, name: $name, country: $country,
                lat: $lat, lon: $lon, congestion: $congestion,
                avg_delay_hours: $avg_delay_hours,
                capacity_teu: $capacity_teu, utilization: $utilization
            })
            """,
            p,
        )
    print(f"   Created {len(PORTS)} ports.\n")

    # ------------------------------------------------------------------
    # 5. Vessels
    # ------------------------------------------------------------------
    print("🚢 Creating vessels …")
    for v in VESSELS:
        await graph_service.run(
            """
            CREATE (v:Vessel {
                id: $id, name: $name, imo: $imo, flag: $flag,
                capacity_teu: $capacity_teu, current_load_teu: $current_load_teu,
                status: $status, lat: $lat, lon: $lon, speed_knots: $speed_knots
            })
            """,
            v,
        )
    print(f"   Created {len(VESSELS)} vessels.\n")

    # ------------------------------------------------------------------
    # 6. Yards
    # ------------------------------------------------------------------
    print("📦 Creating yards …")
    for y in YARDS:
        await graph_service.run(
            """
            CREATE (y:Yard {
                id: $id, name: $name, port_id: $port_id,
                total_slots: $total_slots, occupied_slots: $occupied_slots
            })
            """,
            y,
        )
    print(f"   Created {len(YARDS)} yards.\n")

    # ------------------------------------------------------------------
    # 7. Trucks
    # ------------------------------------------------------------------
    print("🚛 Creating trucks …")
    for t in TRUCKS:
        await graph_service.run(
            """
            CREATE (t:Truck {
                id: $id, plate: $plate, type: $type,
                max_weight_kg: $max_weight_kg, status: $status
            })
            """,
            t,
        )
    print(f"   Created {len(TRUCKS)} trucks.\n")

    # ------------------------------------------------------------------
    # 8. Containers
    # ------------------------------------------------------------------
    print("📦 Creating containers …")
    for ct in CONTAINERS:
        params = {
            "id": ct["id"],
            "type": ct["type"],
            "status": ct["status"],
            "weight_kg": ct["weight_kg"],
            "max_weight_kg": ct["max_weight_kg"],
        }
        if ct.get("seal_number"):
            params["seal_number"] = ct["seal_number"]
        if ct.get("yard_position"):
            params["yard_position"] = ct["yard_position"]
        if ct.get("temperature_celsius") is not None and "temperature_celsius" in ct:
            params["temperature_celsius"] = ct["temperature_celsius"]

        props = ", ".join(f"{k}: ${k}" for k in params)
        await graph_service.run(f"CREATE (c:Container {{{props}}})", params)
    print(f"   Created {len(CONTAINERS)} containers.\n")

    # ------------------------------------------------------------------
    # 9. Routes between ports
    # ------------------------------------------------------------------
    print("🗺️  Creating routes …")
    for r in ROUTES:
        await graph_service.run(
            """
            MATCH (a:Port {id: $from_port}), (b:Port {id: $to_port})
            CREATE (a)-[:ROUTE_TO {distance_nm: $distance_nm, avg_days: $avg_days}]->(b)
            """,
            r,
        )
    print(f"   Created {len(ROUTES)} routes.\n")

    # ------------------------------------------------------------------
    # 10. Shipments + ShipmentRequest nodes
    # ------------------------------------------------------------------
    print("📋 Creating shipments and shipment requests …")
    for s in SHIPMENTS:
        # -- Shipment node --
        shp_params: dict = {
            "id": s["id"],
            "status": s["status"],
            "priority": s["priority"],
            "current_location": s["current_location"],
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
        }
        if s["eta"]:
            shp_params["eta"] = s["eta"]
        # Include pickup location fields if present
        for field in ("pickup_address", "pickup_lat", "pickup_lng", "trucks_required", "cargo_weight_kg"):
            if s.get(field) is not None:
                shp_params[field] = s[field]

        shp_props = ", ".join(f"{k}: ${k}" for k in shp_params)
        await graph_service.run(f"CREATE (s:Shipment {{{shp_props}}})", shp_params)

        # -- ShipmentRequest node --
        req_id = s["id"].replace("SHP-", "REQ-")
        req_status = "UNDER_REVIEW" if s["status"] == "UNDER_REVIEW" else "APPROVED"
        req_params = {
            "id": req_id,
            "status": req_status,
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
            "shipment_id": s["id"],
            "customer_id": s["customer_id"],
            "origin_port": s["origin_port"],
            "dest_port": s["dest_port"],
            "priority": s["priority"],
        }
        await graph_service.run(
            """
            CREATE (r:ShipmentRequest {
                id: $id, status: $status, created_at: $created_at,
                updated_at: $updated_at, shipment_id: $shipment_id,
                customer_id: $customer_id, origin_port: $origin_port,
                dest_port: $dest_port, priority: $priority
            })
            """,
            req_params,
        )

        # Link request → shipment (APPROVED_AS) for approved requests
        if req_status == "APPROVED":
            await graph_service.run(
                """
                MATCH (r:ShipmentRequest {id: $req_id}), (s:Shipment {id: $shp_id})
                CREATE (r)-[:APPROVED_AS]->(s)
                """,
                {"req_id": req_id, "shp_id": s["id"]},
            )

        # -- ORIGIN_PORT / DEST_PORT relationships --
        await graph_service.run(
            """
            MATCH (s:Shipment {id: $shp_id}), (p:Port {id: $port_id})
            CREATE (s)-[:ORIGIN_PORT]->(p)
            """,
            {"shp_id": s["id"], "port_id": s["origin_port"]},
        )
        await graph_service.run(
            """
            MATCH (s:Shipment {id: $shp_id}), (p:Port {id: $port_id})
            CREATE (s)-[:DEST_PORT]->(p)
            """,
            {"shp_id": s["id"], "port_id": s["dest_port"]},
        )

        # -- REQUESTED_BY relationship --
        await graph_service.run(
            """
            MATCH (s:Shipment {id: $shp_id}), (u:User {id: $user_id})
            CREATE (s)-[:REQUESTED_BY]->(u)
            """,
            {"shp_id": s["id"], "user_id": s["customer_id"]},
        )

        # -- CONTAINS (shipment → container) --
        if s.get("container_id"):
            await graph_service.run(
                """
                MATCH (s:Shipment {id: $shp_id}), (c:Container {id: $ctr_id})
                CREATE (s)-[:CONTAINS]->(c)
                """,
                {"shp_id": s["id"], "ctr_id": s["container_id"]},
            )

        # -- CURRENT_VESSEL --
        if s.get("vessel_id"):
            await graph_service.run(
                """
                MATCH (s:Shipment {id: $shp_id}), (v:Vessel {id: $vessel_id})
                CREATE (s)-[:CURRENT_VESSEL]->(v)
                """,
                {"shp_id": s["id"], "vessel_id": s["vessel_id"]},
            )

        # -- DRIVER assignments --
        # Link driver for any shipment that has passed through DRIVER_ASSIGNED
        post_driver_statuses = [
            "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE", "GOODS_RELEASED",
            "IN_TRANSIT_TO_PORT", "PORT_ENTRY", "CUSTOMS_CLEARANCE",
            "IN_YARD", "LOADED_ON_VESSEL", "IN_TRANSIT_SEA",
            "ARRIVED_DEST_PORT", "LAST_MILE_ASSIGNED", "DELIVERED",
        ]
        if s.get("driver_id") and s["status"] in post_driver_statuses:
            await graph_service.run(
                """
                MATCH (u:User {id: $driver_id}), (s:Shipment {id: $shp_id})
                MERGE (u)-[:ASSIGNED_PICKUP]->(s)
                """,
                {"driver_id": s["driver_id"], "shp_id": s["id"]},
            )
        if s.get("driver_id") and s["status"] == "LAST_MILE_ASSIGNED":
            await graph_service.run(
                """
                MATCH (u:User {id: $driver_id}), (s:Shipment {id: $shp_id})
                MERGE (u)-[:ASSIGNED_DELIVERY]->(s)
                """,
                {"driver_id": s["driver_id"], "shp_id": s["id"]},
            )

    print(f"   Created {len(SHIPMENTS)} shipments with requests.\n")

    # ------------------------------------------------------------------
    # 10a. Customer → Shipment REQUESTED relationships
    # ------------------------------------------------------------------
    print("🔗 Linking customers → shipments (REQUESTED) …")
    customer_shipments = {
        "USR-001": ["SHP-2026-001", "SHP-2026-002", "SHP-2026-005", "SHP-2026-007",
                     "SHP-2026-009", "SHP-2026-011", "SHP-2026-013", "SHP-2026-015"],
        "USR-002": ["SHP-2026-003", "SHP-2026-004", "SHP-2026-006", "SHP-2026-008",
                     "SHP-2026-010", "SHP-2026-012", "SHP-2026-014", "SHP-2026-016",
                     "SHP-2026-023", "SHP-2026-028"],
        "USR-011": ["SHP-2026-017", "SHP-2026-019", "SHP-2026-021", "SHP-2026-024",
                     "SHP-2026-026", "SHP-2026-029"],
        "USR-012": ["SHP-2026-018", "SHP-2026-020", "SHP-2026-022", "SHP-2026-025",
                     "SHP-2026-027", "SHP-2026-030"],
    }
    for uid, sids in customer_shipments.items():
        for sid in sids:
            await graph_service.run(
                "MATCH (u:User {id: $uid}), (s:Shipment {id: $sid}) CREATE (u)-[:REQUESTED]->(s)",
                {"uid": uid, "sid": sid},
            )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 10b. Driver → Shipment ASSIGNED_PICKUP relationships
    # ------------------------------------------------------------------
    print("🔗 Linking drivers → shipments (ASSIGNED_PICKUP) …")
    driver_shipments = {
        "USR-004": ["SHP-2026-001", "SHP-2026-002", "SHP-2026-003", "SHP-2026-006",
                     "SHP-2026-011", "SHP-2026-013"],
        "USR-005": ["SHP-2026-004", "SHP-2026-005", "SHP-2026-007", "SHP-2026-008",
                     "SHP-2026-012", "SHP-2026-015"],
        "USR-014": ["SHP-2026-020", "SHP-2026-023"],
        "USR-015": ["SHP-2026-024", "SHP-2026-027"],
    }
    for uid, sids in driver_shipments.items():
        for sid in sids:
            await graph_service.run(
                "MATCH (u:User {id: $uid}), (s:Shipment {id: $sid}) MERGE (u)-[:ASSIGNED_PICKUP]->(s)",
                {"uid": uid, "sid": sid},
            )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 10c. Timeline events for seeded shipments
    # ------------------------------------------------------------------
    print("📅 Creating timeline events for shipments …")
    import uuid as _uuid

    STATUS_ORDER = [
        "REQUEST_SUBMITTED", "UNDER_REVIEW", "APPROVED", "DRIVER_ASSIGNED",
        "PICKUP_EN_ROUTE", "GOODS_RELEASED", "IN_TRANSIT_TO_PORT",
        "AT_ORIGIN_PORT", "PORT_ENTRY", "CUSTOMS_CLEARANCE", "IN_YARD",
        "LOADED_ON_VESSEL", "IN_TRANSIT_SEA", "ARRIVED_DEST_PORT",
        "LAST_MILE_ASSIGNED", "DELIVERED",
    ]

    shipment_statuses = {
        "SHP-2026-001": "IN_TRANSIT_SEA",
        "SHP-2026-002": "IN_YARD",
        "SHP-2026-003": "CUSTOMS_CLEARANCE",
        "SHP-2026-004": "GOODS_RELEASED",
        "SHP-2026-005": "DRIVER_ASSIGNED",
        "SHP-2026-006": "UNDER_REVIEW",
        "SHP-2026-007": "LAST_MILE_ASSIGNED",
        "SHP-2026-008": "DELIVERED",
        "SHP-2026-009": "REQUEST_SUBMITTED",
        "SHP-2026-010": "APPROVED",
        "SHP-2026-011": "PICKUP_EN_ROUTE",
        "SHP-2026-012": "AT_ORIGIN_PORT",
        "SHP-2026-013": "CUSTOMS_CLEARANCE",
        "SHP-2026-014": "IN_YARD",
        "SHP-2026-015": "LOADED_ON_VESSEL",
        "SHP-2026-016": "IN_TRANSIT_SEA",
        # --- new shipments ---
        "SHP-2026-017": "AWAITING_CUSTOMER_DETAILS",
        "SHP-2026-018": "REJECTED",
        "SHP-2026-019": "CANCELLED",
        "SHP-2026-020": "IN_TRANSIT_TO_PORT",
        "SHP-2026-021": "PORT_ENTRY",
        "SHP-2026-022": "ARRIVED_DEST_PORT",
        "SHP-2026-023": "DRIVER_ASSIGNED",
        "SHP-2026-024": "PICKUP_EN_ROUTE",
        "SHP-2026-025": "IN_TRANSIT_SEA",
        "SHP-2026-026": "UNDER_REVIEW",
        "SHP-2026-027": "GOODS_RELEASED",
        "SHP-2026-028": "LOADED_ON_VESSEL",
        "SHP-2026-029": "DELIVERED",
        "SHP-2026-030": "REQUEST_SUBMITTED",
    }

    for ship_id, current_status in shipment_statuses.items():
        if current_status not in STATUS_ORDER:
            continue
        target_idx = STATUS_ORDER.index(current_status)
        for i in range(target_idx):
            from_s = STATUS_ORDER[i]
            to_s = STATUS_ORDER[i + 1]
            evt_id = f"EVT-{_uuid.uuid4().hex[:8].upper()}"
            ts = (_now - timedelta(days=target_idx - i)).isoformat()
            await graph_service.run("""
                MATCH (s:Shipment {id: $sid})
                CREATE (e:Event {
                    id: $eid, type: 'STATUS_CHANGE',
                    from_status: $from_status, to_status: $to_status,
                    triggered_by: 'System', shipment_id: $sid,
                    timestamp: $ts, details: 'Seed data'
                })
                CREATE (s)-[:HAS_EVENT]->(e)
            """, {
                "sid": ship_id, "eid": evt_id,
                "from_status": from_s, "to_status": to_s, "ts": ts,
            })
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 11. Relationships: User BELONGS_TO Company
    # ------------------------------------------------------------------
    print("🔗 Linking users → companies …")
    for u in USERS:
        if u.get("company_id"):
            await graph_service.run(
                """
                MATCH (u:User {id: $user_id}), (c:Company {id: $company_id})
                CREATE (u)-[:BELONGS_TO]->(c)
                """,
                {"user_id": u["id"], "company_id": u["company_id"]},
            )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 12. Relationships: User WORKS_AT Port (PORT_OFFICER, YARD_MANAGER)
    # ------------------------------------------------------------------
    print("🔗 Linking port staff → ports …")
    for u in USERS:
        if u.get("assigned_port_id"):
            await graph_service.run(
                """
                MATCH (u:User {id: $user_id}), (p:Port {id: $port_id})
                CREATE (u)-[:WORKS_AT]->(p)
                """,
                {"user_id": u["id"], "port_id": u["assigned_port_id"]},
            )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 13. Relationships: Driver DRIVES Truck
    # ------------------------------------------------------------------
    print("🔗 Linking drivers → trucks …")
    driver_truck_map = [
        ("USR-004", "TRK-001"),
        ("USR-005", "TRK-002"),
        ("USR-014", "TRK-004"),
        ("USR-015", "TRK-005"),
    ]
    for driver_id, truck_id in driver_truck_map:
        await graph_service.run(
            """
            MATCH (u:User {id: $driver_id}), (t:Truck {id: $truck_id})
            CREATE (u)-[:DRIVES]->(t)
            """,
            {"driver_id": driver_id, "truck_id": truck_id},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 14. Relationships: Container → Yard (IN_YARD)
    # ------------------------------------------------------------------
    print("🔗 Linking containers → yards …")
    container_yard_map = [
        ("MSKU7654321", "YRD-001"),  # Shanghai East Yard
        ("TCNU3456789", "YRD-001"),  # Shanghai East Yard
        ("CMAU3456780", "YRD-003"),  # Singapore Pasir Panjang Yard
        ("OOLU8901235", "YRD-004"),  # Rotterdam Europoort Yard
        ("HPLU0123457", "YRD-006"),  # Mumbai Nhava Sheva Yard
    ]
    for ctr_id, yard_id in container_yard_map:
        await graph_service.run(
            """
            MATCH (c:Container {id: $ctr_id}), (y:Yard {id: $yard_id})
            CREATE (c)-[:IN_YARD]->(y)
            """,
            {"ctr_id": ctr_id, "yard_id": yard_id},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 15. Relationships: Container AT_PORT
    # ------------------------------------------------------------------
    print("🔗 Linking containers → ports …")
    container_port_map = [
        ("MSKU7654321", "P001"),
        ("TCNU3456789", "P001"),
        ("CMAU3456780", "P002"),
        ("OOLU8901235", "P004"),
        ("HPLU0123457", "P006"),
        ("APLU7890124", "P003"),   # Damaged container at LA
        ("MSCU5678902", "P005"),   # Empty container at Dubai
        ("ZIMU2345679", "P008"),   # Empty reefer at Hong Kong
    ]
    for ctr_id, port_id in container_port_map:
        await graph_service.run(
            """
            MATCH (c:Container {id: $ctr_id}), (p:Port {id: $port_id})
            CREATE (c)-[:AT_PORT]->(p)
            """,
            {"ctr_id": ctr_id, "port_id": port_id},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 16. Relationships: Container LOADED_ON Vessel
    # ------------------------------------------------------------------
    print("🔗 Linking containers → vessels …")
    container_vessel_map = [
        ("CSLU1234567", "V001"),
        ("KKFU6789013", "V008"),   # Reefer on Maersk Aurora
        ("HDMU3456780", "V009"),   # On MSC Fortuna
        ("TRHU2345678", "V006"),   # In transit on Atlantic Pioneer
        ("YMLU9012346", "V008"),   # In transit on Maersk Aurora
    ]
    for ctr_id, vessel_id in container_vessel_map:
        await graph_service.run(
            """
            MATCH (c:Container {id: $ctr_id}), (v:Vessel {id: $vessel_id})
            CREATE (c)-[:LOADED_ON]->(v)
            """,
            {"ctr_id": ctr_id, "vessel_id": vessel_id},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 17. Relationships: Vessel DOCKED_AT Port (IN_PORT vessels)
    # ------------------------------------------------------------------
    print("🔗 Linking vessels → ports …")
    vessel_port_map = [
        ("V002", "P001"),   # Atlantic Runner docked at Shanghai
        ("V005", "P001"),   # Pacific Harmony docked at Shanghai
        ("V007", "P003"),   # Nordic Star docked at LA
        ("V009", "P002"),   # MSC Fortuna anchored at Singapore
        ("V010", "P008"),   # COSCO Galaxy docked at Hong Kong
    ]
    for vessel_id, port_id in vessel_port_map:
        await graph_service.run(
            """
            MATCH (v:Vessel {id: $vessel_id}), (p:Port {id: $port_id})
            CREATE (v)-[:DOCKED_AT]->(p)
            """,
            {"vessel_id": vessel_id, "port_id": port_id},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 18. Relationships: Yard LOCATED_AT Port
    # ------------------------------------------------------------------
    print("🔗 Linking yards → ports …")
    for y in YARDS:
        await graph_service.run(
            """
            MATCH (y:Yard {id: $yard_id}), (p:Port {id: $port_id})
            CREATE (y)-[:LOCATED_AT]->(p)
            """,
            {"yard_id": y["id"], "port_id": y["port_id"]},
        )
    print("   Done.\n")

    # ------------------------------------------------------------------
    # 19. Notifications
    # ------------------------------------------------------------------
    print("🔔 Creating notifications …")
    for ntf in NOTIFICATIONS:
        params = {
            "id": ntf["id"],
            "message": ntf["message"],
            "type": ntf["type"],
            "read": ntf["read"],
            "user_id": ntf["user_id"],
        }
        if ntf.get("shipment_id"):
            params["shipment_id"] = ntf["shipment_id"]
            await graph_service.run(
                """
                CREATE (n:Notification {
                    id: $id, message: $message, type: $type,
                    shipment_id: $shipment_id, created_at: datetime(), read: $read
                })
                WITH n
                MATCH (u:User {id: $user_id})
                CREATE (u)-[:HAS_NOTIFICATION]->(n)
                """,
                params,
            )
        else:
            await graph_service.run(
                """
                CREATE (n:Notification {
                    id: $id, message: $message, type: $type,
                    created_at: datetime(), read: $read
                })
                WITH n
                MATCH (u:User {id: $user_id})
                CREATE (u)-[:HAS_NOTIFICATION]->(n)
                """,
                params,
            )
    print(f"   Created {len(NOTIFICATIONS)} notifications.\n")

    # ------------------------------------------------------------------
    # 19a. Documents for advanced-stage shipments
    # ------------------------------------------------------------------
    print("📄 Creating documents …")
    DOCUMENTS = [
        # SHP-2026-001 (IN_TRANSIT_SEA) — has gone through all stages up to loading
        {"id": "DOC-001", "type": "SHIPMENT_REQUEST", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-001", "data": '{"cargo_type":"Electronics","description":"Consumer electronics - TVs and laptops","declared_value":125000,"hs_code":"8471"}'},
        {"id": "DOC-002", "type": "APPROVAL_FORM", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-003", "data": '{"approved":true,"notes":"Standard shipment, approved for processing","review_date":"2026-03-22"}'},
        {"id": "DOC-003", "type": "CUSTOMER_DETAILS", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-001", "data": '{"pickup_address":"200 Yangshupu Rd, Shanghai","cargo_weight_kg":24000,"trucks_required":2}'},
        {"id": "DOC-004", "type": "DRIVER_ASSIGNMENT", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-003", "data": '{"driver_id":"USR-004","truck_id":"TRK-001","notes":"Express handling required"}'},
        {"id": "DOC-005", "type": "RELEASE_FORM", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-001", "data": '{"released_to":"Wang Wei","release_date":"2026-03-23","signature":"Sarah Chen"}'},
        {"id": "DOC-006", "type": "PORT_ENTRY_DECLARATION", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-006", "data": '{"gate_number":"G-12","entry_time":"2026-03-24T08:30:00Z","vehicle_plate":"沪A-88888"}'},
        {"id": "DOC-007", "type": "CUSTOMS_DECLARATION", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-006", "data": '{"hs_code":"8471","declared_value_usd":125000,"country_of_origin":"China","description":"Consumer electronics"}'},
        {"id": "DOC-008", "type": "CUSTOMS_REVIEW", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-008", "data": '{"decision":"CLEARED","inspection_required":false,"notes":"All documentation in order","cleared_date":"2026-03-24"}'},
        {"id": "DOC-009", "type": "BILL_OF_LADING", "status": "APPROVED", "shipment_id": "SHP-2026-001",
         "submitted_by": "USR-006", "data": '{"bol_number":"BOL-2026-001","vessel":"Pacific Star","container":"CSLU1234567","port_of_loading":"Shanghai","port_of_discharge":"Los Angeles"}'},

        # SHP-2026-003 (CUSTOMS_CLEARANCE) — waiting for customs review
        {"id": "DOC-010", "type": "SHIPMENT_REQUEST", "status": "APPROVED", "shipment_id": "SHP-2026-003",
         "submitted_by": "USR-002", "data": '{"cargo_type":"Textiles","description":"Cotton fabric rolls","declared_value":45000,"hs_code":"5208"}'},
        {"id": "DOC-011", "type": "CUSTOMS_DECLARATION", "status": "SUBMITTED", "shipment_id": "SHP-2026-003",
         "submitted_by": "USR-006", "data": '{"hs_code":"5208","declared_value_usd":45000,"country_of_origin":"China","description":"Cotton fabric rolls - 500 rolls"}'},

        # SHP-2026-005 (DRIVER_ASSIGNED) — driver just assigned
        {"id": "DOC-012", "type": "SHIPMENT_REQUEST", "status": "APPROVED", "shipment_id": "SHP-2026-005",
         "submitted_by": "USR-001", "data": '{"cargo_type":"Toys","description":"Stuffed animals and board games","declared_value":32000,"hs_code":"9503"}'},
        {"id": "DOC-013", "type": "APPROVAL_FORM", "status": "APPROVED", "shipment_id": "SHP-2026-005",
         "submitted_by": "USR-003", "data": '{"approved":true,"notes":"Standard toy shipment, approved","review_date":"2026-03-29"}'},
        {"id": "DOC-014", "type": "CUSTOMER_DETAILS", "status": "APPROVED", "shipment_id": "SHP-2026-005",
         "submitted_by": "USR-001", "data": '{"pickup_address":"88 Waigaoqiao Free Trade Zone, Pudong, Shanghai","cargo_weight_kg":12000,"trucks_required":1}'},
        {"id": "DOC-015", "type": "DRIVER_ASSIGNMENT", "status": "APPROVED", "shipment_id": "SHP-2026-005",
         "submitted_by": "USR-003", "data": '{"driver_id":"USR-004","truck_id":"TRK-001","notes":"Standard pickup"}'},

        # SHP-2026-008 (DELIVERED) — full document trail
        {"id": "DOC-016", "type": "SHIPMENT_REQUEST", "status": "APPROVED", "shipment_id": "SHP-2026-008",
         "submitted_by": "USR-002", "data": '{"cargo_type":"Pharmaceuticals","description":"Temperature-sensitive medicines","declared_value":280000,"hs_code":"3004"}'},
        {"id": "DOC-017", "type": "PROOF_OF_DELIVERY", "status": "APPROVED", "shipment_id": "SHP-2026-008",
         "submitted_by": "USR-005", "data": '{"recipient_name":"Ahmed Warehouse Manager","signature":"Ahmed K.","delivery_date":"2026-03-30T14:20:00Z","condition":"Good - no damage","photo_count":3}'},

        # SHP-2026-013 (CUSTOMS_CLEARANCE at Mumbai) — pending customs review
        {"id": "DOC-018", "type": "CUSTOMS_DECLARATION", "status": "SUBMITTED", "shipment_id": "SHP-2026-013",
         "submitted_by": "USR-008", "data": '{"hs_code":"8517","declared_value_usd":95000,"country_of_origin":"India","description":"Telecom equipment - 5G antennas"}'},

        # SHP-2026-020 (IN_TRANSIT_TO_PORT) — has release form
        {"id": "DOC-019", "type": "RELEASE_FORM", "status": "APPROVED", "shipment_id": "SHP-2026-020",
         "submitted_by": "USR-012", "data": '{"released_to":"Raj Patel","release_date":"2026-03-31","signature":"Hans Mueller","notes":"Heavy cargo - use crane"}'},

        # SHP-2026-022 (ARRIVED_DEST_PORT) — has BOL
        {"id": "DOC-020", "type": "BILL_OF_LADING", "status": "APPROVED", "shipment_id": "SHP-2026-022",
         "submitted_by": "USR-007", "data": '{"bol_number":"BOL-2026-022","vessel":"Nordic Star","container":"YMLU9012346","port_of_loading":"Shanghai","port_of_discharge":"Los Angeles"}'},

        # SHP-2026-028 (LOADED_ON_VESSEL) — has BOL
        {"id": "DOC-021", "type": "BILL_OF_LADING", "status": "APPROVED", "shipment_id": "SHP-2026-028",
         "submitted_by": "USR-006", "data": '{"bol_number":"BOL-2026-028","vessel":"Pacific Harmony","container":"SEGU1234568","port_of_loading":"Shanghai","port_of_discharge":"Felixstowe"}'},
    ]

    for doc in DOCUMENTS:
        await graph_service.run(
            """
            CREATE (d:Document {
                id: $id, type: $type, status: $status,
                data: $data, created_at: datetime(), updated_at: datetime()
            })
            WITH d
            MATCH (s:Shipment {id: $shipment_id})
            CREATE (s)-[:HAS_DOCUMENT]->(d)
            WITH d
            MATCH (u:User {id: $submitted_by})
            CREATE (u)-[:SUBMITTED]->(d)
            """,
            doc,
        )
    print(f"   Created {len(DOCUMENTS)} documents.\n")

    # ------------------------------------------------------------------
    # 19b. Congestion Reports
    # ------------------------------------------------------------------
    print("🚧 Creating congestion reports …")
    CONGESTION_REPORTS = [
        {
            "id": "CNG-SEED-001", "port_id": "P001", "congestion_type": "TRAFFIC",
            "severity": "HIGH", "description": "Heavy truck traffic at gate entrance, long queues forming",
            "estimated_delay_hours": 3.0, "reported_by": "USR-001",
            "reporter_name": "Sarah Chen",
        },
        {
            "id": "CNG-SEED-002", "port_id": "P006", "congestion_type": "EQUIPMENT_FAILURE",
            "severity": "MEDIUM", "description": "Crane 3 is under maintenance, reducing loading capacity",
            "estimated_delay_hours": 2.0, "reported_by": "USR-002",
            "reporter_name": "Mike Johnson",
        },
        {
            "id": "CNG-SEED-003", "port_id": "P008", "congestion_type": "WEATHER",
            "severity": "HIGH", "description": "Typhoon warning issued, port operations partially suspended",
            "estimated_delay_hours": 8.0, "reported_by": "USR-011",
            "reporter_name": "Li Wei",
        },
        {
            "id": "CNG-SEED-004", "port_id": "P001", "congestion_type": "LABOR_SHORTAGE",
            "severity": "LOW", "description": "Reduced workforce during holiday period",
            "estimated_delay_hours": 1.0, "reported_by": "USR-012",
            "reporter_name": "Kim Min-jae",
        },
    ]
    for cr in CONGESTION_REPORTS:
        await graph_service.run("""
            CREATE (cr:CongestionReport {
                id: $id, port_id: $port_id, congestion_type: $congestion_type,
                severity: $severity, description: $description,
                estimated_delay_hours: $estimated_delay_hours,
                reported_by: $reported_by, reporter_name: $reporter_name,
                created_at: datetime(), status: 'ACTIVE'
            })
            WITH cr
            MATCH (p:Port {id: $port_id})
            CREATE (cr)-[:AT_PORT]->(p)
        """, cr)
    print(f"   Created {len(CONGESTION_REPORTS)} congestion reports.\n")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    result = await graph_service.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt ORDER BY label")
    print("✅ Seed complete! Node counts:")
    for row in result:
        print(f"   {row['label']}: {row['cnt']}")

    rel_result = await graph_service.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS cnt ORDER BY type")
    print("\n   Relationship counts:")
    for row in rel_result:
        print(f"   {row['type']}: {row['cnt']}")

    print("\n🎉 Database seeded successfully!")
