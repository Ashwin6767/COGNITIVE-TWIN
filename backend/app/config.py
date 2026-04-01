import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    gemini_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    demo_mode: bool = False
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    model_config = {"env_file": ".env"}


settings = Settings()

# Accept common env var aliases (NEO4J_URL, DATABASE_URL, etc.)
for alias in ("NEO4J_URL", "DATABASE_URL", "NEO4J_CONNECTION_URI"):
    val = os.environ.get(alias)
    if val and settings.neo4j_uri == "bolt://localhost:7687":
        settings.neo4j_uri = val
        break
