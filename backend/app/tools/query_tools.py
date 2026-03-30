"""Gemini function-calling tool definitions (Issue #10: uses google.genai.types format)."""
from google.genai import types


def get_agent_tools():
    """Return the list of tools the agent can call."""
    return [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_shipments_by_port",
                    description=(
                        "Get all shipments arriving at or departing from a specific port. "
                        "Returns shipment details including priority, cargo type, and assigned vessel."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "port_id": types.Schema(
                                type=types.Type.STRING,
                                description=(
                                    "Port ID — P001 (Shanghai), P002 (Singapore), "
                                    "P003 (Los Angeles), P004 (Rotterdam), "
                                    "P005 (Dubai), P006 (Mumbai)"
                                ),
                            )
                        },
                        required=["port_id"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="simulate_delay",
                    description=(
                        "Simulate a delay at a specific port and calculate the impact "
                        "on all linked shipments. Returns affected shipments, cascade "
                        "effects, and recommendations."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "port_id": types.Schema(
                                type=types.Type.STRING,
                                description="Port ID to apply delay to",
                            ),
                            "delay_hours": types.Schema(
                                type=types.Type.NUMBER,
                                description="Number of hours to simulate as delay",
                            ),
                        },
                        required=["port_id", "delay_hours"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="suggest_reroute",
                    description=(
                        "Get rerouting suggestions for a delayed shipment. "
                        "Finds alternative ports with lower congestion."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "shipment_id": types.Schema(
                                type=types.Type.STRING,
                                description="Shipment ID to reroute (e.g., S001)",
                            )
                        },
                        required=["shipment_id"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="get_risk_score",
                    description=(
                        "Get the current risk score (0-100) for a port, vessel, or shipment."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "entity_type": types.Schema(
                                type=types.Type.STRING,
                                enum=["port", "vessel", "shipment"],
                                description="Type of entity to assess",
                            ),
                            "entity_id": types.Schema(
                                type=types.Type.STRING,
                                description="Entity ID (e.g., P001, V001, S001)",
                            ),
                        },
                        required=["entity_type", "entity_id"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="compare_scenarios",
                    description=(
                        "Compare two delay scenarios side by side to determine "
                        "which disruption has greater impact."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "scenario_a_port": types.Schema(
                                type=types.Type.STRING,
                                description="Port ID for scenario A",
                            ),
                            "scenario_a_delay": types.Schema(
                                type=types.Type.NUMBER,
                                description="Delay hours for scenario A",
                            ),
                            "scenario_b_port": types.Schema(
                                type=types.Type.STRING,
                                description="Port ID for scenario B",
                            ),
                            "scenario_b_delay": types.Schema(
                                type=types.Type.NUMBER,
                                description="Delay hours for scenario B",
                            ),
                        },
                        required=[
                            "scenario_a_port",
                            "scenario_a_delay",
                            "scenario_b_port",
                            "scenario_b_delay",
                        ],
                    ),
                ),
                types.FunctionDeclaration(
                    name="get_graph_overview",
                    description=(
                        "Get a high-level summary of the entire supply chain: "
                        "number of ports, vessels, shipments, and overall status."
                    ),
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={},
                    ),
                ),
            ]
        )
    ]
