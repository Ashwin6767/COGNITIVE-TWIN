# Module 04 — Forms & Documents

## Goal
Every step in the logistics workflow requires a form. When submitted, the form data creates a Document node in the graph linked to the shipment. Some documents generate PDFs.

---

## Form Definitions

Each form type has a schema defining its fields. This drives both the frontend form rendering and backend validation.

### File: `backend/app/forms/schemas.py`

```python
FORM_SCHEMAS = {
    "SHIPMENT_REQUEST": {
        "title": "Shipment Request",
        "sections": [
            {
                "title": "Origin",
                "fields": [
                    {"name": "origin_company", "type": "text", "label": "Company Name", "required": True},
                    {"name": "origin_address", "type": "text", "label": "Pickup Address", "required": True},
                    {"name": "origin_city", "type": "text", "label": "City", "required": True},
                    {"name": "origin_country", "type": "select", "label": "Country", "required": True,
                     "options": ["China", "India", "Vietnam", "Thailand", "Indonesia"]},
                    {"name": "origin_contact", "type": "text", "label": "Contact Person"},
                    {"name": "origin_phone", "type": "tel", "label": "Phone"},
                ]
            },
            {
                "title": "Destination",
                "fields": [
                    {"name": "dest_address", "type": "text", "label": "Delivery Address", "required": True},
                    {"name": "dest_city", "type": "text", "label": "City", "required": True},
                    {"name": "dest_country", "type": "select", "label": "Country", "required": True,
                     "options": ["United States", "Canada", "United Kingdom", "Germany", "Netherlands"]},
                    {"name": "dest_contact", "type": "text", "label": "Contact Person"},
                    {"name": "dest_phone", "type": "tel", "label": "Phone"},
                ]
            },
            {
                "title": "Cargo Details",
                "fields": [
                    {"name": "cargo_description", "type": "textarea", "label": "Description", "required": True},
                    {"name": "cargo_type", "type": "select", "label": "Type", "required": True,
                     "options": ["GENERAL", "HAZARDOUS", "PERISHABLE", "OVERSIZED"]},
                    {"name": "weight_kg", "type": "number", "label": "Weight (kg)", "required": True},
                    {"name": "volume_cbm", "type": "number", "label": "Volume (CBM)"},
                    {"name": "quantity", "type": "number", "label": "Number of Packages", "required": True},
                    {"name": "declared_value_usd", "type": "number", "label": "Declared Value (USD)", "required": True},
                    {"name": "preferred_pickup_date", "type": "date", "label": "Preferred Pickup Date", "required": True},
                    {"name": "container_type", "type": "select", "label": "Container Type",
                     "options": ["20FT", "40FT", "40FT_HC", "REEFER"]},
                    {"name": "priority", "type": "select", "label": "Priority",
                     "options": ["STANDARD", "EXPRESS", "CRITICAL"]},
                    {"name": "special_instructions", "type": "textarea", "label": "Special Instructions"},
                ]
            },
        ]
    },

    "APPROVAL_FORM": {
        "title": "Shipment Approval",
        "sections": [
            {
                "title": "Review Decision",
                "fields": [
                    {"name": "decision", "type": "select", "label": "Decision", "required": True,
                     "options": ["APPROVED", "REJECTED"]},
                    {"name": "assigned_port_origin", "type": "select", "label": "Origin Port", "required": True,
                     "source": "ports"},  # Dynamic: populated from graph
                    {"name": "assigned_port_dest", "type": "select", "label": "Destination Port", "required": True,
                     "source": "ports"},
                    {"name": "estimated_cost_usd", "type": "number", "label": "Estimated Cost (USD)"},
                    {"name": "notes", "type": "textarea", "label": "Notes"},
                ]
            }
        ]
    },

    "DRIVER_ASSIGNMENT": {
        "title": "Driver Assignment",
        "sections": [
            {
                "title": "Assignment",
                "fields": [
                    {"name": "driver_id", "type": "select", "label": "Driver", "required": True,
                     "source": "available_drivers"},
                    {"name": "truck_id", "type": "select", "label": "Truck", "required": True,
                     "source": "available_trucks"},
                    {"name": "pickup_time", "type": "datetime", "label": "Scheduled Pickup Time", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Instructions for Driver"},
                ]
            }
        ]
    },

    "RELEASE_FORM": {
        "title": "Goods Release Form",
        "sections": [
            {
                "title": "Release Confirmation",
                "fields": [
                    {"name": "packages_count", "type": "number", "label": "Packages Released", "required": True},
                    {"name": "condition", "type": "select", "label": "Goods Condition", "required": True,
                     "options": ["GOOD", "MINOR_DAMAGE", "DAMAGED"]},
                    {"name": "condition_notes", "type": "textarea", "label": "Condition Notes"},
                    {"name": "signature", "type": "signature", "label": "Customer Signature", "required": True},
                    {"name": "release_time", "type": "datetime", "label": "Release Time", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Photos of Goods", "accept": "image/*"},
                ]
            }
        ]
    },

    "PORT_ENTRY_DECLARATION": {
        "title": "Port Entry Declaration",
        "sections": [
            {
                "title": "Vehicle & Container",
                "fields": [
                    {"name": "truck_plate", "type": "text", "label": "Truck Plate Number", "required": True},
                    {"name": "driver_license", "type": "text", "label": "Driver License Number", "required": True},
                    {"name": "container_number", "type": "text", "label": "Container Number"},
                    {"name": "seal_number", "type": "text", "label": "Seal Number"},
                    {"name": "entry_gate", "type": "text", "label": "Entry Gate"},
                    {"name": "entry_time", "type": "datetime", "label": "Entry Time", "required": True},
                ]
            },
            {
                "title": "Cargo Declaration",
                "fields": [
                    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": True},
                    {"name": "hazardous", "type": "checkbox", "label": "Contains Hazardous Materials"},
                    {"name": "hazmat_class", "type": "text", "label": "Hazmat Class (if applicable)"},
                    {"name": "weight_kg", "type": "number", "label": "Total Weight (kg)", "required": True},
                ]
            }
        ]
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
                    {"name": "duty_rate_pct", "type": "number", "label": "Duty Rate (%)"},
                    {"name": "import_license", "type": "text", "label": "Import License Number"},
                    {"name": "supporting_docs", "type": "file_multiple", "label": "Supporting Documents"},
                ]
            },
        ]
    },

    "CUSTOMS_REVIEW": {
        "title": "Customs Review Decision",
        "sections": [
            {
                "title": "Review Decision",
                "fields": [
                    {"name": "decision", "type": "select", "label": "Decision", "required": True,
                     "options": ["CLEARED", "HELD_FOR_INSPECTION", "REJECTED"]},
                    {"name": "inspection_notes", "type": "textarea", "label": "Inspection Notes"},
                    {"name": "duty_amount_usd", "type": "number", "label": "Duty Amount (USD)"},
                    {"name": "clearance_date", "type": "date", "label": "Clearance Date", "required": True},
                ]
            }
        ]
    },

    "CONTAINER_INSPECTION": {
        "title": "Container Inspection Report",
        "sections": [
            {
                "title": "Inspection",
                "fields": [
                    {"name": "container_number", "type": "text", "label": "Container Number", "required": True},
                    {"name": "condition", "type": "select", "label": "Container Condition", "required": True,
                     "options": ["GOOD", "ACCEPTABLE", "DAMAGED", "REJECTED"]},
                    {"name": "seal_intact", "type": "checkbox", "label": "Seal Intact"},
                    {"name": "damage_description", "type": "textarea", "label": "Damage Description"},
                    {"name": "yard_position", "type": "text", "label": "Assigned Yard Position", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Inspection Photos"},
                ]
            }
        ]
    },

    "BILL_OF_LADING": {
        "title": "Bill of Lading",
        "sections": [
            {
                "title": "BOL Details",
                "fields": [
                    {"name": "bol_number", "type": "text", "label": "BOL Number", "required": True},
                    {"name": "shipper_name", "type": "text", "label": "Shipper", "required": True},
                    {"name": "consignee_name", "type": "text", "label": "Consignee", "required": True},
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "voyage_number", "type": "text", "label": "Voyage Number"},
                    {"name": "port_of_loading", "type": "text", "label": "Port of Loading", "required": True},
                    {"name": "port_of_discharge", "type": "text", "label": "Port of Discharge", "required": True},
                    {"name": "container_numbers", "type": "text", "label": "Container Numbers", "required": True},
                    {"name": "cargo_description", "type": "textarea", "label": "Cargo Description", "required": True},
                    {"name": "gross_weight_kg", "type": "number", "label": "Gross Weight (kg)", "required": True},
                    {"name": "freight_charges", "type": "number", "label": "Freight Charges (USD)"},
                    {"name": "date_of_issue", "type": "date", "label": "Date of Issue", "required": True},
                ]
            }
        ]
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
                    {"name": "condition", "type": "select", "label": "Condition on Arrival", "required": True,
                     "options": ["GOOD", "MINOR_DAMAGE", "DAMAGED"]},
                    {"name": "damage_notes", "type": "textarea", "label": "Damage Notes"},
                    {"name": "signature", "type": "signature", "label": "Recipient Signature", "required": True},
                    {"name": "photos", "type": "file_multiple", "label": "Delivery Photos"},
                ]
            }
        ]
    },

    "LOADING_MANIFEST": {
        "title": "Loading Manifest",
        "sections": [
            {
                "title": "Manifest Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "voyage_number", "type": "text", "label": "Voyage Number", "required": True},
                    {"name": "container_numbers", "type": "textarea", "label": "Container Numbers (one per line)", "required": True},
                    {"name": "total_containers", "type": "number", "label": "Total Containers", "required": True},
                    {"name": "total_weight_kg", "type": "number", "label": "Total Weight (kg)", "required": True},
                    {"name": "loading_bay", "type": "text", "label": "Loading Bay"},
                    {"name": "loading_date", "type": "date", "label": "Loading Date", "required": True},
                ]
            }
        ]
    },

    "DEPARTURE_CLEARANCE": {
        "title": "Departure Clearance",
        "sections": [
            {
                "title": "Clearance Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "destination_port", "type": "text", "label": "Destination Port", "required": True},
                    {"name": "departure_time", "type": "datetime", "label": "Scheduled Departure", "required": True},
                    {"name": "all_cargo_loaded", "type": "checkbox", "label": "All Cargo Loaded"},
                    {"name": "safety_check_passed", "type": "checkbox", "label": "Safety Check Passed"},
                    {"name": "clearance_number", "type": "text", "label": "Clearance Number", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Notes"},
                ]
            }
        ]
    },

    "ARRIVAL_CONFIRMATION": {
        "title": "Arrival Confirmation",
        "sections": [
            {
                "title": "Arrival Details",
                "fields": [
                    {"name": "vessel_name", "type": "text", "label": "Vessel Name", "required": True},
                    {"name": "arrival_time", "type": "datetime", "label": "Arrival Time", "required": True},
                    {"name": "berth_number", "type": "text", "label": "Berth Number"},
                    {"name": "containers_to_unload", "type": "number", "label": "Containers to Unload", "required": True},
                    {"name": "condition_on_arrival", "type": "select", "label": "Vessel Condition",
                     "options": ["GOOD", "MINOR_ISSUES", "DAMAGED"]},
                    {"name": "notes", "type": "textarea", "label": "Notes"},
                ]
            }
        ]
    },

    "LAST_MILE_ASSIGNMENT": {
        "title": "Last Mile Driver Assignment",
        "sections": [
            {
                "title": "Assignment",
                "fields": [
                    {"name": "driver_id", "type": "select", "label": "Driver", "required": True,
                     "source": "available_drivers"},
                    {"name": "truck_id", "type": "select", "label": "Truck", "required": True,
                     "source": "available_trucks"},
                    {"name": "delivery_address", "type": "text", "label": "Delivery Address", "required": True},
                    {"name": "scheduled_delivery_time", "type": "datetime", "label": "Scheduled Delivery Time", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Instructions for Driver"},
                ]
            }
        ]
    },
}
```

---

## Backend Implementation

### File: `backend/app/routers/documents.py`

```
GET  /api/documents/schema/{form_type}
    Returns: form schema JSON for rendering the form on frontend

POST /api/documents/submit
    Body: { "type": "RELEASE_FORM", "shipment_id": "SHP-001", "data": {...} }
    Auth: JWT required, role checked
    Action: Creates Document node, links to Shipment, triggers workflow transition

GET  /api/documents/shipment/{shipment_id}
    Returns: all documents for a shipment

GET  /api/documents/{document_id}
    Returns: single document with all data

PUT  /api/documents/{document_id}/review
    Body: { "status": "APPROVED", "notes": "..." }
    Auth: Reviewer role required
```

### File: `backend/app/services/document_service.py`

```python
class DocumentService:
    async def create_document(self, doc_type, shipment_id, data, user_id) -> dict:
        """Create Document node in graph, link to Shipment and User."""

    async def get_documents_for_shipment(self, shipment_id) -> list:
        """Get all documents linked to a shipment."""

    async def review_document(self, document_id, reviewer_id, status, notes) -> dict:
        """Update document status (approve/reject)."""

    async def get_form_schema(self, form_type) -> dict:
        """Return the form schema for frontend rendering."""

    async def validate_form_data(self, form_type, data) -> list[str]:
        """Validate form data against schema. Return list of errors."""
```

---

## Frontend Implementation

### File: `frontend/components/forms/DynamicForm.jsx`

A reusable form component that renders any form from its schema:

```jsx
// Props: { schema, onSubmit, initialData, isLoading }
// Renders sections with fields based on type:
//   text     → <input type="text">
//   number   → <input type="number">
//   select   → <select> with options
//   textarea → <textarea>
//   date     → <input type="date">
//   datetime → <input type="datetime-local">
//   checkbox → <input type="checkbox">
//   tel      → <input type="tel">
//   signature → signature pad component
//   file_multiple → file upload dropzone
// All fields are styled with consistent white/light theme
// Required fields show asterisk and validate on submit
```

### File: `frontend/components/forms/SignaturePad.jsx`
```jsx
// Canvas-based signature capture
// Returns base64 PNG on save
```

### File: `frontend/components/forms/FileUpload.jsx`
```jsx
// Drag-and-drop file upload
// Shows preview for images
// Uploads to backend, returns file URL
```

### File Upload Strategy
> For hackathon: files are encoded as base64 within the Document.data JSON field (simple, no external storage).
> A `/api/files/upload` endpoint in `backend/app/routers/files.py` stores files to a local `uploads/` directory and returns a URL.
> In production: replace with S3-compatible storage.

---

## Files to Create

```
backend/app/forms/
├── __init__.py
├── schemas.py            # All form schemas
└── validator.py          # Schema-based validation

backend/app/services/document_service.py
backend/app/routers/documents.py
backend/app/models/document.py

frontend/components/forms/
├── DynamicForm.jsx       # Schema-driven form renderer
├── SignaturePad.jsx       # Signature capture
├── FileUpload.jsx         # File upload component
└── FormField.jsx          # Single field renderer
```

---

## Testing

```
test_get_form_schema           — Returns valid schema for each form type
test_submit_document           — Creates Document node in graph
test_submit_validates_required — Missing required field → 400 with error list
test_document_linked_to_shipment — Document has FOR_SHIPMENT relationship
test_document_linked_to_user   — Document has SUBMITTED relationship from user
test_review_document           — Update status to APPROVED/REJECTED
test_get_shipment_documents    — Returns all docs for a shipment in order
```
