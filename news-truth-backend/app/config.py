from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/newstruth"
    redis_url: str = "redis://localhost:6379/0"
    qwen_api_key: str = ""
    baidu_search_app_id: str = ""
    baidu_search_api_key: str = ""
    baidu_search_secret_key: str = ""
    baidu_appbuilder_api_key: str = ""
    tavily_api_key: str = ""
    app_env: str = "development"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
