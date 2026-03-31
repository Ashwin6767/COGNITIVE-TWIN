import uuid
from datetime import datetime, timezone
from app.services.graph_service import graph_service
from app.auth.password import hash_password, verify_password
from app.models.enums import UserRole


class UserService:
    async def create_user(self, data: dict) -> dict:
        user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()
        pw_hash = hash_password(data["password"])

        result = await graph_service.run_single("""
            CREATE (u:User {
                id: $id, email: $email, password_hash: $pw_hash,
                name: $name, role: $role, company_id: $company_id,
                assigned_port_id: $assigned_port_id, phone: $phone,
                license_number: $license_number, license_type: $license_type,
                is_active: true, created_at: $now, last_login: null
            })
            RETURN u {.id, .email, .name, .role, .company_id, .assigned_port_id,
                       .phone, .license_number, .license_type, .is_active, .created_at} AS user
        """, {
            "id": user_id, "email": data["email"], "pw_hash": pw_hash,
            "name": data["name"], "role": data.get("role", UserRole.CUSTOMER),
            "company_id": data.get("company_id"),
            "assigned_port_id": data.get("assigned_port_id"),
            "phone": data.get("phone"),
            "license_number": data.get("license_number"),
            "license_type": data.get("license_type"),
            "now": now,
        })

        if data.get("company_id"):
            await graph_service.run("""
                MATCH (u:User {id: $uid}), (c:Company {id: $cid})
                MERGE (u)-[:BELONGS_TO]->(c)
            """, {"uid": user_id, "cid": data["company_id"]})

        if data.get("assigned_port_id"):
            await graph_service.run("""
                MATCH (u:User {id: $uid}), (p:Port {id: $pid})
                MERGE (u)-[:WORKS_AT]->(p)
            """, {"uid": user_id, "pid": data["assigned_port_id"]})

        return result["user"] if result else None

    async def authenticate(self, email: str, password: str) -> dict | None:
        result = await graph_service.run_single("""
            MATCH (u:User {email: $email, is_active: true})
            RETURN u {.id, .email, .password_hash, .name, .role, .company_id,
                       .assigned_port_id, .phone, .license_number, .license_type,
                       .is_active, .created_at} AS user
        """, {"email": email})
        if not result:
            return None
        user = result["user"]
        if not verify_password(password, user["password_hash"]):
            return None
        # Update last login
        await graph_service.run(
            "MATCH (u:User {id: $id}) SET u.last_login = $now",
            {"id": user["id"], "now": datetime.now(timezone.utc).isoformat()},
        )
        return user

    async def get_by_id(self, user_id: str) -> dict | None:
        result = await graph_service.run_single("""
            MATCH (u:User {id: $id})
            RETURN u {.id, .email, .name, .role, .company_id, .assigned_port_id,
                       .phone, .license_number, .license_type, .is_active, .created_at,
                       .last_login} AS user
        """, {"id": user_id})
        return result["user"] if result else None

    async def get_by_email(self, email: str) -> dict | None:
        result = await graph_service.run_single("""
            MATCH (u:User {email: $email})
            RETURN u {.id, .email, .name, .role} AS user
        """, {"email": email})
        return result["user"] if result else None

    async def list_users(self, role: str | None = None, page: int = 1, limit: int = 20) -> dict:
        where = "WHERE u.is_active = true"
        params: dict = {"skip": (page - 1) * limit, "limit": limit}
        if role:
            where += " AND u.role = $role"
            params["role"] = role

        count_result = await graph_service.run_single(
            f"MATCH (u:User) {where} RETURN count(u) AS total", params
        )
        total = count_result["total"] if count_result else 0

        results = await graph_service.run(f"""
            MATCH (u:User) {where}
            RETURN u {{.id, .email, .name, .role, .company_id, .assigned_port_id,
                        .is_active, .created_at}} AS user
            ORDER BY u.created_at DESC SKIP $skip LIMIT $limit
        """, params)
        return {
            "items": [r["user"] for r in results],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": max(1, (total + limit - 1) // limit),
        }

    async def get_available_drivers(self) -> list[dict]:
        results = await graph_service.run("""
            MATCH (u:User {role: 'DRIVER', is_active: true})
            RETURN u {.id, .name, .license_number, .license_type, .phone} AS driver
        """)
        return [r["driver"] for r in results]


user_service = UserService()
