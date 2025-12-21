"""Конфигурация ML-микросервиса. Читается из переменных окружения / .env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    ml_service_token: str = "dev-token"
    artifacts_dir: Path = Path(__file__).parent / "artifacts"
    synthetic_fallback: bool = True
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
