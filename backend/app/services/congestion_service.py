"""
Congestion reporting, auto-detection, and AI-powered re-routing service.
Manages congestion reports, auto-calculates congestion levels, and triggers
real-time driver re-routing when ports become congested.
"""
import uuid
from datetime import datetime, timezone

from app.services.graph_service import graph_service
from app.services.notification_service import notification_service


class CongestionService:
    async def report_congestion(self, report_data: dict, user: dict) -> dict:
        """Staff-submitted congestion report."""
        report_id = f"CNG-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        port_id = report_data.get("port_id")

        await graph_service.run("""
            CREATE (cr:CongestionReport {
                id: $id,
                port_id: $port_id,
                congestion_type: $congestion_type,
                severity: $severity,
                description: $description,
                estimated_delay_hours: $delay,
                reported_by: $user_id,
                reporter_name: $user_name,
                created_at: $now,
                status: 'ACTIVE'
            })
            WITH cr
            MATCH (p:Port {id: $port_id})
            CREATE (cr)-[:AT_PORT]->(p)
        """, {
            "id": report_id,
            "port_id": port_id,
            "congestion_type": report_data.get("congestion_type", "OTHER"),
            "severity": report_data.get("severity", "MEDIUM"),
            "description": report_data.get("description", ""),
            "delay": float(report_data.get("estimated_delay_hours", 0)),
            "user_id": user["id"],
            "user_name": user.get("name", "Unknown"),
            "now": now,
        })

        # Notify relevant roles about the congestion report
        port_info = await graph_service.run_single(
            "MATCH (p:Port {id: $id}) RETURN p.name AS name", {"id": port_id}
        )
        port_name = port_info["name"] if port_info else port_id
        severity = report_data.get("severity", "MEDIUM")

        await self._dispatch_congestion_alerts(
            port_id=port_id,
            port_name=port_name,
            severity=severity,
            message=f"Congestion reported at {port_name}: {report_data.get('congestion_type', 'OTHER')} — {report_data.get('description', '')}",
            exclude_user_id=user["id"],
            report_id=report_id,
        )

        return {"id": report_id, "status": "ACTIVE", "port_id": port_id}

    async def get_congestion_status(self, port_id: str) -> dict:
        """Get current congestion status for a port."""
        port = await graph_service.run_single("""
            MATCH (p:Port {id: $id})
            RETURN p.name AS name, p.congestion AS congestion,
                   p.utilization AS utilization, p.avg_delay_hours AS avg_delay
        """, {"id": port_id})

        if not port:
            return {"error": "Port not found"}

        # Get active congestion reports
        reports = await graph_service.run("""
            MATCH (cr:CongestionReport)-[:AT_PORT]->(p:Port {id: $id})
            WHERE cr.status = 'ACTIVE'
            RETURN cr {.id, .congestion_type, .severity, .description,
                       .estimated_delay_hours, .reporter_name, .created_at}
            ORDER BY cr.created_at DESC
            LIMIT 10
        """, {"id": port_id})

        return {
            "port_id": port_id,
            "port_name": port.get("name"),
            "congestion_level": port.get("congestion", "LOW"),
            "utilization": port.get("utilization", 0),
            "avg_delay_hours": port.get("avg_delay", 0),
            "active_reports": [r["cr"] for r in reports],
        }

    async def auto_detect_congestion(self) -> list[dict]:
        """Auto-calculate congestion levels and trigger re-routing for affected shipments."""
        from app.services.gemini_routing_service import gemini_routing_service

        ports = await graph_service.run("""
            MATCH (p:Port)
            RETURN p.id AS id, p.name AS name, p.utilization AS utilization,
                   p.congestion AS current_congestion
        """)

        updates = []
        for p in ports:
            util = p.get("utilization") or 0
            if util > 0.85:
                new_level = "HIGH"
            elif util > 0.60:
                new_level = "MEDIUM"
            else:
                new_level = "LOW"

            old_level = p.get("current_congestion", "LOW")
            if new_level != old_level:
                await graph_service.run("""
                    MATCH (p:Port {id: $id})
                    SET p.congestion = $level
                """, {"id": p["id"], "level": new_level})

                updates.append({
                    "port_id": p["id"],
                    "port_name": p["name"],
                    "old_level": old_level,
                    "new_level": new_level,
                    "utilization": util,
                })

                # When congestion becomes HIGH, alert AND trigger re-routing
                if new_level == "HIGH" and old_level != "HIGH":
                    await self._dispatch_congestion_alerts(
                        port_id=p["id"],
                        port_name=p["name"],
                        severity="HIGH",
                        message=f"Auto-detected HIGH congestion at {p['name']} (utilization: {round(util * 100)}%)",
                        exclude_user_id=None,
                        report_id=None,
                    )

                    # Find in-transit shipments heading to this port and trigger re-routing
                    await self._trigger_reroute_for_port(
                        port_id=p["id"],
                        port_name=p["name"],
                        gemini_service=gemini_routing_service,
                    )

        return updates

    async def _trigger_reroute_for_port(
        self, port_id: str, port_name: str, gemini_service
    ):
        """Find active shipments heading to a congested port and suggest re-routes."""
        affected_shipments = await graph_service.run("""
            MATCH (s:Shipment)-[:DEST_PORT]->(p:Port {id: $port_id})
            WHERE s.status IN ['GOODS_COLLECTED', 'IN_TRANSIT_TO_PORT', 'PICKUP_EN_ROUTE']
            OPTIONAL MATCH (cust:User)-[:REQUESTED]->(s)
            OPTIONAL MATCH (drv:User)-[:ASSIGNED_PICKUP]->(s)
            RETURN s.id AS shipment_id, s.status AS status,
                   cust.id AS customer_id, cust.name AS customer_name,
                   drv.id AS driver_id, drv.name AS driver_name
        """, {"port_id": port_id})

        if not affected_shipments:
            return

        # Get re-route recommendations once for this port
        try:
            recommendations = await gemini_service.recommend_alternative_ports(port_id)
        except Exception:
            recommendations = {"alternatives": [], "ai_summary": "Unable to generate recommendations"}

        top_alt = (
            recommendations.get("alternatives", [{}])[0]
            if recommendations.get("alternatives")
            else None
        )
        alt_port_name = top_alt["name"] if top_alt else "N/A"

        for ship in affected_shipments:
            sid = ship["shipment_id"]

            # Create a RerouteEvent node in the graph
            reroute_id = f"RRT-{uuid.uuid4().hex[:8].upper()}"
            now = datetime.now(timezone.utc).isoformat()

            await graph_service.run("""
                CREATE (r:RerouteEvent {
                    id: $id,
                    shipment_id: $sid,
                    from_port_id: $from_port,
                    suggested_port_id: $to_port,
                    suggested_port_name: $to_name,
                    reason: 'AUTO_CONGESTION_DETECTION',
                    status: 'SUGGESTED',
                    created_at: $now,
                    ai_summary: $summary
                })
                WITH r
                MATCH (s:Shipment {id: $sid})
                CREATE (s)-[:HAS_REROUTE]->(r)
            """, {
                "id": reroute_id,
                "sid": sid,
                "from_port": port_id,
                "to_port": top_alt["id"] if top_alt else None,
                "to_name": alt_port_name,
                "now": now,
                "summary": recommendations.get("ai_summary", ""),
            })

            # Notify driver
            if ship.get("driver_id"):
                await notification_service.create(
                    ship["driver_id"],
                    f"🔄 Re-Route Alert — {port_name} Congested",
                    f"Port {port_name} is experiencing HIGH congestion. "
                    f"Suggested alternative: {alt_port_name}. "
                    f"Please check your dashboard for re-routing details. "
                    f"Shipment: {sid}",
                    "HIGH",
                    "ALERT",
                    sid,
                )

            # Notify customer
            if ship.get("customer_id"):
                await notification_service.create(
                    ship["customer_id"],
                    f"📦 Shipment Re-Routing — {sid}",
                    f"Your shipment {sid} is being re-routed due to HIGH congestion at {port_name}. "
                    f"Suggested new destination: {alt_port_name}. "
                    f"We will keep you updated on any changes.",
                    "HIGH",
                    "ALERT",
                    sid,
                )

            # Notify logistics managers
            await notification_service.notify_role_group(
                "LOGISTICS_MANAGER",
                f"🚨 Shipment Re-Route Required — {sid}",
                f"Shipment {sid} (driver: {ship.get('driver_name', 'N/A')}) needs re-routing. "
                f"Port {port_name} is congested. "
                f"Recommended alternative: {alt_port_name}. "
                f"AI analysis: {recommendations.get('ai_summary', 'N/A')}",
                "HIGH",
                "ALERT",
                sid,
            )

    async def reroute_shipment(
        self, shipment_id: str, new_port_id: str | None, triggered_by: dict
    ) -> dict:
        """Execute a re-route for a shipment: update destination port and notify stakeholders."""
        from app.services.gemini_routing_service import gemini_routing_service

        # Get shipment with its current destination port
        shipment = await graph_service.run_single("""
            MATCH (s:Shipment {id: $sid})
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            RETURN s.id AS id, s.status AS status,
                   dp.id AS dest_port_id, dp.name AS dest_port_name
        """, {"sid": shipment_id})

        if not shipment:
            return {"error": "Shipment not found"}

        old_port_id = shipment.get("dest_port_id")
        old_port_name = shipment.get("dest_port_name", "Unknown")

        # If no new_port_id provided, use Gemini to recommend the best alternative
        if not new_port_id:
            if not old_port_id:
                return {"error": "Shipment has no destination port to re-route from"}
            reroute_plan = await gemini_routing_service.generate_reroute_plan(
                shipment_id, old_port_id
            )
            if reroute_plan.get("recommended_port"):
                new_port_id = reroute_plan["recommended_port"]["id"]
            else:
                return {"error": "No alternative ports available for re-routing"}
        else:
            reroute_plan = None

        # Verify the new port exists
        new_port = await graph_service.run_single(
            "MATCH (p:Port {id: $id}) RETURN p.name AS name, p.id AS id",
            {"id": new_port_id},
        )
        if not new_port:
            return {"error": f"New port {new_port_id} not found"}

        now = datetime.now(timezone.utc).isoformat()

        # Update the shipment's destination port relationship
        await graph_service.run("""
            MATCH (s:Shipment {id: $sid})-[r:DEST_PORT]->(:Port)
            DELETE r
        """, {"sid": shipment_id})

        await graph_service.run("""
            MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
            CREATE (s)-[:DEST_PORT]->(p)
            SET s.updated_at = $now
        """, {"sid": shipment_id, "pid": new_port_id, "now": now})

        # Record the RerouteEvent
        reroute_id = f"RRT-{uuid.uuid4().hex[:8].upper()}"
        await graph_service.run("""
            CREATE (r:RerouteEvent {
                id: $id,
                shipment_id: $sid,
                from_port_id: $from_port,
                from_port_name: $from_name,
                to_port_id: $to_port,
                to_port_name: $to_name,
                reason: 'CONGESTION_REROUTE',
                status: 'EXECUTED',
                triggered_by: $user_id,
                created_at: $now,
                ai_summary: $summary
            })
            WITH r
            MATCH (s:Shipment {id: $sid})
            CREATE (s)-[:HAS_REROUTE]->(r)
        """, {
            "id": reroute_id,
            "sid": shipment_id,
            "from_port": old_port_id,
            "from_name": old_port_name,
            "to_port": new_port_id,
            "to_name": new_port["name"],
            "user_id": triggered_by["id"],
            "now": now,
            "summary": reroute_plan.get("reroute_plan", "") if reroute_plan else "",
        })

        # Create a timeline event
        evt_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        await graph_service.run("""
            CREATE (e:Event {
                id: $eid, type: 'REROUTE',
                from_status: $status, to_status: $status,
                triggered_by: $user_id, shipment_id: $sid,
                timestamp: $now,
                details: $details
            })
            WITH e
            MATCH (s:Shipment {id: $sid})
            CREATE (s)-[:HAS_EVENT]->(e)
        """, {
            "eid": evt_id,
            "sid": shipment_id,
            "status": shipment["status"],
            "user_id": triggered_by["id"],
            "now": now,
            "details": f"Re-routed from {old_port_name} to {new_port['name']} due to congestion",
        })

        # Notify all stakeholders
        await notification_service.notify_shipment_stakeholders(
            shipment_id,
            f"🔄 Shipment Re-Routed — {shipment_id}",
            f"Shipment {shipment_id} has been re-routed from {old_port_name} to {new_port['name']} due to port congestion.",
            "HIGH",
            "ALERT",
            exclude_user_id=triggered_by["id"],
        )

        return {
            "shipment_id": shipment_id,
            "reroute_id": reroute_id,
            "from_port": {"id": old_port_id, "name": old_port_name},
            "to_port": {"id": new_port_id, "name": new_port["name"]},
            "status": "EXECUTED",
            "reroute_plan": reroute_plan.get("reroute_plan") if reroute_plan else None,
            "event_id": evt_id,
        }

    async def _dispatch_congestion_alerts(
        self, port_id: str, port_name: str, severity: str,
        message: str, exclude_user_id: str | None, report_id: str | None,
    ):
        """Send congestion notifications to relevant roles."""
        title = f"⚠️ Congestion Alert — {port_name}"
        notif_severity = "HIGH" if severity == "HIGH" else "MEDIUM"
        notif_type = "ALERT" if severity == "HIGH" else "INFO"

        roles_to_notify = [
            ("DRIVER", None),
            ("LOGISTICS_MANAGER", None),
            ("YARD_MANAGER", port_id),
            ("PORT_OFFICER", port_id),
        ]

        notified: set[str] = set()
        for role, scoped_port in roles_to_notify:
            where = "WHERE u.role = $role AND u.is_active = true"
            params: dict = {"role": role}
            if scoped_port:
                where += " AND u.assigned_port_id = $port_id"
                params["port_id"] = scoped_port

            users = await graph_service.run(
                f"MATCH (u:User) {where} RETURN u.id AS uid", params
            )
            for u in users:
                uid = u["uid"]
                if uid and uid != exclude_user_id and uid not in notified:
                    notified.add(uid)
                    await notification_service.create(
                        uid, title, message, notif_severity, notif_type, None
                    )

        # Also notify customers who have shipments at this port
        customers = await graph_service.run("""
            MATCH (cust:User)-[:REQUESTED]->(s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $pid})
            WHERE s.status NOT IN ['DELIVERED', 'REJECTED', 'CANCELLED']
            RETURN DISTINCT cust.id AS uid
        """, {"pid": port_id})

        for c in customers:
            uid = c["uid"]
            if uid and uid != exclude_user_id and uid not in notified:
                notified.add(uid)
                await notification_service.create(
                    uid, title, message, notif_severity, notif_type, None
                )


congestion_service = CongestionService()
