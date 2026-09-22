from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/examination_db"
    JWT_SECRET_KEY: str = "super-secret-jwt-key-examination-platform-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # VAPID Web Push Credentials
    VAPID_PUBLIC_KEY: str = "BIohzaztSefqt-2j2dRioX1FUz9JxV8r-lRTE026iNGeooeAR_5I93Jexg9irrBArOyPxyV7I9smh1YonkIgKug"
    VAPID_PRIVATE_KEY: str = "RnPeaGBiB693csmLC1TvjZ3ACGXgVUfcYKTHp4vdIYQ"
    VAPID_CLAIMS_SUB: str = "mailto:admin@aiproctor.internal"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
