"""Dispatches agent tool calls to the appropriate backend service."""
from app.services.graph_service import graph_service
from app.services.simulation_engine import simulation_engine
from app.services.risk_service import risk_service


async def execute_tool(function_name: str, args: dict) -> dict | list:
    """Route a tool call from the Gemini agent to the correct service."""

    if function_name == "get_shipments_by_port":
        return await graph_service.get_shipments_by_port(args["port_id"])

    if function_name == "simulate_delay":
        result = await simulation_engine.simulate_delay(
            args["port_id"], float(args["delay_hours"])
        )
        return result.model_dump()

    if function_name == "suggest_reroute":
        return await simulation_engine.suggest_reroute(args["shipment_id"])

    if function_name == "get_risk_score":
        return await risk_service.get_risk_score(
            args["entity_type"], args["entity_id"]
        )

    if function_name == "compare_scenarios":
        from app.models.simulation import DelaySimulationRequest

        return await simulation_engine.compare_scenarios(
            DelaySimulationRequest(
                port_id=args["scenario_a_port"],
                delay_hours=float(args["scenario_a_delay"]),
            ),
            DelaySimulationRequest(
                port_id=args["scenario_b_port"],
                delay_hours=float(args["scenario_b_delay"]),
            ),
        )

    if function_name == "get_graph_overview":
        return await graph_service.get_graph_overview()

    return {"error": f"Unknown tool: {function_name}"}
