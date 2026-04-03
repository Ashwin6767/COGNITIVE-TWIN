"""
Form schemas for all logistics platform document types.

Each schema defines title, sections, and fields with validation metadata.
"""

FORM_SCHEMAS: dict[str, dict] = {
    "SHIPMENT_REQUEST": {
        "title": "Shipment Request",
        "sections": [
            {
                "title": "Origin",
                "fields": [
                    {"name": "origin_company", "type": "text", "label": "Company Name", "required": True},
                    {"name": "origin_address", "type": "text", "label": "Address", "required": True},
                    {"name": "origin_city", "type": "text", "label": "City", "required": True},
                    {"name": "origin_country", "type": "text", "label": "Country", "required": True},
                    {"name": "origin_contact", "type": "text", "label": "Contact Person", "required": True},
                    {"name": "origin_phone", "type": "tel", "label": "Phone", "required": True},
                ],
            },
            {
                "title": "Destination",
                "fields": [
                    {"name": "destination_address", "type": "text", "label": "Address", "required": True},
                    {"name": "destination_city", "type": "text", "label": "City", "required": True},
                    {"name": "destination_country", "type": "text", "label": "Country", "required": True},
                    {"name": "destination_contact", "type": "text", "label": "Contact Person", "required": True},
                    {"name": "destination_phone", "type": "tel", "label": "Phone", "required": True},
                ],
            },
            {
                "title": "Cargo Details",
                "fields": [
                    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": True},
                    {
                        "name": "cargo_type",
                        "type": "select",
                        "label": "Cargo Type",
                        "required": True,
                        "options": ["GENERAL", "HAZARDOUS", "PERISHABLE", "OVERSIZED"],
                    },
                    {"name": "weight_kg", "type": "number", "label": "Weight (kg)", "required": True},
                    {"name": "volume_cbm", "type": "number", "label": "Volume (CBM)", "required": False},
                    {"name": "quantity", "type": "number", "label": "Quantity", "required": True},
                    {"name": "declared_value_usd", "type": "number", "label": "Declared Value (USD)", "required": True},
                    {"name": "preferred_pickup_date", "type": "date", "label": "Preferred Pickup Date", "required": True},
                    {
                        "name": "container_type",
                        "type": "select",
                        "label": "Container Type",
                        "required": False,
                        "options": ["20FT", "40FT", "40FT_HC", "REEFER"],
                    },
                    {
                        "name": "priority",
                        "type": "select",
                        "label": "Priority",
                        "required": True,
                        "options": ["STANDARD", "EXPRESS", "CRITICAL"],
                    },
                    {"name": "special_instructions", "type": "textarea", "label": "Special Instructions", "required": False},
                ],
            },
        ],
    },
    "APPROVAL_FORM": {
        "title": "Shipment Approval",
        "sections": [
            {
                "title": "Decision",
                "fields": [
                    {
                        "name": "decision",
                        "type": "select",
                        "label": "Decision",
                        "required": True,
                        "options": ["APPROVED", "REJECTED"],
                    },
                    {
                        "name": "assigned_port_origin",
                        "type": "select",
                        "label": "Assigned Port of Origin",
                        "required": True,
                        "source": "ports",
                    },
                    {
                        "name": "assigned_port_destination",
                        "type": "select",
                        "label": "Assigned Port of Destination",
                        "required": True,
                        "source": "ports",
                    },
                    {"name": "estimated_cost_usd", "type": "number", "label": "Estimated Cost (USD)", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Notes", "required": False},
                ],
            },
        ],
    },
    "CUSTOMER_DETAILS": {
        "title": "Pickup & Cargo Details",
        "sections": [
            {
                "title": "Pickup Location",
                "fields": [
                    {"name": "pickup_address", "type": "location_search", "label": "Search Pickup Location", "required": True},
                    {"name": "pickup_lat", "type": "hidden", "label": "Latitude", "required": True},
                    {"name": "pickup_lng", "type": "hidden", "label": "Longitude", "required": True},
                ],
            },
            {
                "title": "Cargo & Transport",
                "fields": [
                    {"name": "cargo_weight_kg", "type": "number", "label": "Cargo Weight (kg)", "required": True},
                    {"name": "trucks_required", "type": "number", "label": "Trucks Required", "required": True},
                    {"name": "special_instructions", "type": "textarea", "label": "Special Instructions", "required": False},
                ],
            },
        ],
    },
    "DRIVER_ASSIGNMENT": {
        "title": "Driver Assignment",
        "sections": [
            {
                "title": "Assignment Details",
                "fields": [
                    {
                        "name": "driver_id",
                        "type": "select",
                        "label": "Driver",
                        "required": True,
                        "source": "available_drivers",
                    },
                    {
                        "name": "truck_id",
                        "type": "select",
                        "label": "Truck",
                        "required": True,
                        "source": "available_trucks",
                    },
                    {"name": "pickup_time", "type": "datetime", "label": "Pickup Time", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Notes", "required": False},
                ],
            },
        ],
    },
    "RELEASE_FORM": {
        "title": "Cargo Release",
        "sections": [
            {
                "title": "Release Details",
                "fields": [
                    {"name": "packages_count", "type": "number", "label": "Number of Packages", "required": True},
                    {
                        "name": "condition",
                        "type": "select",
                        "label": "Condition",
                        "required": True,
                        "options": ["GOOD", "MINOR_DAMAGE", "DAMAGED"],
                    },
                    {"name": "condition_notes", "type": "textarea", "label": "Condition Notes", "required": False},
                    {"name": "signature", "type": "signature", "label": "Signature", "required": True},
                    {"name": "release_time", "type": "datetime", "label": "Release Time", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Photos", "required": False},
                ],
            },
        ],
    },
    "PORT_ENTRY_DECLARATION": {
        "title": "Port Entry Declaration",
        "sections": [
            {
                "title": "Vehicle & Driver",
                "fields": [
                    {"name": "truck_plate", "type": "text", "label": "Truck Plate Number", "required": True},
                    {"name": "driver_license", "type": "text", "label": "Driver License Number", "required": True},
                ],
            },
            {
                "title": "Container & Cargo",
                "fields": [
                    {"name": "container_number", "type": "text", "label": "Container Number", "required": True},
                    {"name": "seal_number", "type": "text", "label": "Seal Number", "required": True},
                    {"name": "entry_gate", "type": "text", "label": "Entry Gate", "required": True},
                    {"name": "entry_time", "type": "datetime", "label": "Entry Time", "required": True},
                    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": True},
                    {"name": "hazardous", "type": "checkbox", "label": "Hazardous Material", "required": False},
                    {"name": "hazmat_class", "type": "text", "label": "Hazmat Class", "required": False},
                    {"name": "weight_kg", "type": "number", "label": "Weight (kg)", "required": True},
                ],
            },
        ],
    },
    "CUSTOMS_DECLARATION": {
        "title": "Customs Declaration",
        "sections": [
            {
                "title": "Declaration Details",
                "fields": [
                    {"name": "hs_code", "type": "text", "label": "HS Code", "required": True},
                    {"name": "goods_description", "type": "textarea", "label": "Goods Description", "required": True},
                    {"name": "country_of_origin", "type": "text", "label": "Country of Origin", "required": True},
                    {"name": "declared_value_usd", "type": "number", "label": "Declared Value (USD)", "required": True},
                    {"name": "duty_rate_pct", "type": "number", "label": "Duty Rate (%)", "required": True},
                    {"name": "import_license", "type": "text", "label": "Import License Number", "required": False},
                    {"name": "supporting_docs", "type": "file_multiple", "label": "Supporting Documents", "required": False},
                ],
            },
        ],
    },
    "CUSTOMS_REVIEW": {
        "title": "Customs Review",
        "sections": [
            {
                "title": "Review Decision",
                "fields": [
                    {
                        "name": "decision",
                        "type": "select",
                        "label": "Decision",
                        "required": True,
                        "options": ["CLEARED", "HELD_FOR_INSPECTION", "REJECTED"],
                    },
                    {"name": "inspection_notes", "type": "textarea", "label": "Inspection Notes", "required": False},
                    {"name": "duty_amount_usd", "type": "number", "label": "Duty Amount (USD)", "required": True},
                    {"name": "clearance_date", "type": "date", "label": "Clearance Date", "required": True},
                ],
            },
        ],
    },
    "CONTAINER_INSPECTION": {
        "title": "Container Inspection",
        "sections": [
            {
                "title": "Inspection Details",
                "fields": [
                    {"name": "container_number", "type": "text", "label": "Container Number", "required": True},
                    {
                        "name": "condition",
                        "type": "select",
                        "label": "Condition",
                        "required": True,
                        "options": ["GOOD", "ACCEPTABLE", "DAMAGED", "REJECTED"],
                    },
                    {"name": "seal_intact", "type": "checkbox", "label": "Seal Intact", "required": False},
                    {"name": "damage_description", "type": "textarea", "label": "Damage Description", "required": False},
                    {"name": "yard_position", "type": "text", "label": "Yard Position", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Photos", "required": False},
                ],
            },
        ],
    },
    "BILL_OF_LADING": {
        "title": "Bill of Lading",
        "sections": [
            {
                "title": "Shipment Information",
                "fields": [
                    {"name": "bol_number", "type": "text", "label": "B/L Number", "required": True},
                    {"name": "shipper_name", "type": "text", "label": "Shipper Name", "required": True},
                    {"name": "consignee_name", "type": "text", "label": "Consignee Name", "required": True},
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "voyage_number", "type": "text", "label": "Voyage Number", "required": True},
                    {"name": "port_of_loading", "type": "text", "label": "Port of Loading", "required": True},
                    {"name": "port_of_discharge", "type": "text", "label": "Port of Discharge", "required": True},
                ],
            },
            {
                "title": "Cargo Details",
                "fields": [
                    {"name": "container_numbers", "type": "textarea", "label": "Container Numbers", "required": True},
                    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": True},
                    {"name": "gross_weight_kg", "type": "number", "label": "Gross Weight (kg)", "required": True},
                    {"name": "freight_charges", "type": "number", "label": "Freight Charges", "required": True},
                    {"name": "date_of_issue", "type": "date", "label": "Date of Issue", "required": True},
                ],
            },
        ],
    },
    "LOADING_MANIFEST": {
        "title": "Loading Manifest",
        "sections": [
            {
                "title": "Manifest Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "voyage_number", "type": "text", "label": "Voyage Number", "required": True},
                    {"name": "container_numbers", "type": "textarea", "label": "Container Numbers", "required": True},
                    {"name": "total_containers", "type": "number", "label": "Total Containers", "required": True},
                    {"name": "total_weight_kg", "type": "number", "label": "Total Weight (kg)", "required": True},
                    {"name": "loading_bay", "type": "text", "label": "Loading Bay", "required": True},
                    {"name": "loading_date", "type": "date", "label": "Loading Date", "required": True},
                ],
            },
        ],
    },
    "DEPARTURE_CLEARANCE": {
        "title": "Departure Clearance",
        "sections": [
            {
                "title": "Clearance Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "destination_port", "type": "text", "label": "Destination Port", "required": True},
                    {"name": "departure_time", "type": "datetime", "label": "Departure Time", "required": True},
                    {"name": "all_cargo_loaded", "type": "checkbox", "label": "All Cargo Loaded", "required": False},
                    {"name": "safety_check_passed", "type": "checkbox", "label": "Safety Check Passed", "required": False},
                    {"name": "clearance_number", "type": "text", "label": "Clearance Number", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Notes", "required": False},
                ],
            },
        ],
    },
    "ARRIVAL_CONFIRMATION": {
        "title": "Arrival Confirmation",
        "sections": [
            {
                "title": "Arrival Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "arrival_time", "type": "datetime", "label": "Arrival Time", "required": True},
                    {"name": "berth_number", "type": "text", "label": "Berth Number", "required": True},
                    {"name": "containers_to_unload", "type": "number", "label": "Containers to Unload", "required": True},
                    {
                        "name": "condition_on_arrival",
                        "type": "select",
                        "label": "Condition on Arrival",
                        "required": True,
                        "options": ["GOOD", "MINOR_ISSUES", "DAMAGED"],
                    },
                    {"name": "notes", "type": "textarea", "label": "Notes", "required": False},
                ],
            },
        ],
    },
    "LAST_MILE_ASSIGNMENT": {
        "title": "Last-Mile Delivery Assignment",
        "sections": [
            {
                "title": "Assignment Details",
                "fields": [
                    {
                        "name": "driver_id",
                        "type": "select",
                        "label": "Driver",
                        "required": True,
                        "source": "available_drivers",
                    },
                    {
                        "name": "truck_id",
                        "type": "select",
                        "label": "Truck",
                        "required": True,
                        "source": "available_trucks",
                    },
                    {"name": "delivery_address", "type": "text", "label": "Delivery Address", "required": True},
                    {
                        "name": "scheduled_delivery_time",
                        "type": "datetime",
                        "label": "Scheduled Delivery Time",
                        "required": True,
                    },
                    {"name": "notes", "type": "textarea", "label": "Notes", "required": False},
                ],
            },
        ],
    },
    "PROOF_OF_DELIVERY": {
        "title": "Proof of Delivery",
        "sections": [
            {
                "title": "Delivery Confirmation",
                "fields": [
                    {"name": "received_by", "type": "text", "label": "Received By", "required": True},
                    {"name": "delivery_time", "type": "datetime", "label": "Delivery Time", "required": True},
                    {"name": "packages_received", "type": "number", "label": "Packages Received", "required": True},
                    {
                        "name": "condition",
                        "type": "select",
                        "label": "Condition",
                        "required": True,
                        "options": ["GOOD", "MINOR_DAMAGE", "DAMAGED"],
                    },
                    {"name": "damage_notes", "type": "textarea", "label": "Damage Notes", "required": False},
                    {"name": "signature", "type": "signature", "label": "Signature", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Photos", "required": False},
                ],
            },
        ],
    },
    "HANDOVER_CONFIRMATION": {
        "title": "Goods Handover Confirmation",
        "sections": [
            {
                "title": "Handover Details",
                "fields": [
                    {"name": "packages_verified", "type": "number", "label": "Packages Verified", "required": True},
                    {
                        "name": "condition_on_receipt",
                        "type": "select",
                        "label": "Condition on Receipt",
                        "required": True,
                        "options": ["GOOD", "MINOR_DAMAGE", "DAMAGED"],
                    },
                    {"name": "driver_notes", "type": "textarea", "label": "Driver Notes", "required": False},
                    {"name": "confirmation_time", "type": "datetime", "label": "Confirmation Time", "required": True},
                ],
            },
        ],
    },
    "CONGESTION_REPORT": {
        "title": "Congestion Report",
        "sections": [
            {
                "title": "Congestion Details",
                "fields": [
                    {
                        "name": "port_id",
                        "type": "select",
                        "label": "Port",
                        "required": True,
                        "source": "ports",
                    },
                    {
                        "name": "congestion_type",
                        "type": "select",
                        "label": "Congestion Type",
                        "required": True,
                        "options": ["TRAFFIC", "WEATHER", "EQUIPMENT_FAILURE", "LABOR_SHORTAGE", "OTHER"],
                    },
                    {
                        "name": "severity",
                        "type": "select",
                        "label": "Severity",
                        "required": True,
                        "options": ["LOW", "MEDIUM", "HIGH"],
                    },
                    {"name": "description", "type": "textarea", "label": "Description", "required": True},
                    {"name": "estimated_delay_hours", "type": "number", "label": "Estimated Delay (hours)", "required": False},
                ],
            },
        ],
    },
}


def get_form_schema(form_type: str) -> dict | None:
    """Return the schema for the given form type, or None if not found."""
    return FORM_SCHEMAS.get(form_type)


def validate_form_data(form_type: str, data: dict) -> list[str]:
    """Validate submitted data against the schema and return a list of error messages.

    Returns an empty list when all required fields are present and non-empty.
    """
    schema = get_form_schema(form_type)
    if schema is None:
        return [f"Unknown form type: {form_type}"]

    errors: list[str] = []
    for section in schema["sections"]:
        for field in section["fields"]:
            if not field.get("required"):
                continue

            name = field["name"]
            value = data.get(name)

            if value is None or (isinstance(value, str) and not value.strip()):
                errors.append(f"Missing required field: {field['label']} ({name})")
                continue

            # Validate select fields against allowed options
            if field["type"] == "select" and "options" in field:
                if value not in field["options"]:
                    errors.append(
                        f"Invalid value '{value}' for {field['label']} ({name}). "
                        f"Must be one of: {', '.join(field['options'])}"
                    )

    return errors
