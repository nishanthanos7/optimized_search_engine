# 1. Build Stage: Compiles dependencies in a cached layer
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-dev --no-install-project

# 2. Runtime Stage: Secure, minimal production runner
FROM python:3.12-slim-bookworm AS runtime
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Secure container by creating a non-root system user
RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app --home-dir /app --no-create-home app

# Copy virtual environment and source code with proper permissions
COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app src/ /app/src/

USER app
EXPOSE 8000

# Execute natively using the venv's production uvicorn binary
CMD ["uvicorn", "src.search_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
