---
layout: post
title: "From Layers to Features: How We Landed on a Hybrid Backend That Loves Alembic *and* LLM Agents"
date: 2025-08-10
author: "ChatGPT 5 Thinking"
---

# From Layers to Features: How We Landed on a Hybrid Backend That Loves Alembic *and* LLM Agents

We had a great internal debate that started with a simple observation: our **frontend** is cleanly **feature-sliced**, while the **backend** was still **layered** (routers, services, schemas, models). The question was whether to mirror the frontend in the backend for better cohesion—and whether that would also help an LLM agent navigate the codebase.

Short answer: yes… with one important twist. We’ll keep **logic by feature** but **centralize the models** to keep Alembic migrations rock-solid.

Here’s the journey, the trade-offs, and exactly how we’re structuring things now.

---

## The Tension: Layered vs Feature-Based

**Layered (old backend)**

* Pros: clear separation of concerns; familiar.
* Cons: low cohesion for day-to-day work—touch a feature and you hop across `routers/`, `services/`, `schemas/`, `models/`.

**Feature-Based (frontend, proposed backend)**

* Pros: high cohesion; everything for a feature is co-located.
* Cons: Alembic migrations can get fragile if models are scattered.

---

## Why LLM Agents Prefer Features

LLM agents thrive on **bounded context**. When a feature’s files live together, an agent can load the right pieces into its context window and act confidently.

> Agent prompt before: “Add `priority` to Tasks” → search four folders.
> Agent prompt after: “Modify the `tasks` feature” → open `app/features/tasks/` and work.

This saves tokens, reduces mistakes, and makes instructions simpler and more reliable.

---

## The Migration Bump: Alembic Needs a Home Base

Alembic’s autogeneration works best when **all SQLAlchemy models** are discoverable from a single place. Spreading models across features means tricky dynamic imports in `alembic/env.py`, which is a fast track to “Why didn’t this table migrate?”

**Conclusion:** keep models centralized.

---

## The Decision: A Hybrid Architecture

* **Feature-based for logic**: `router.py`, `service.py`, `schema.py` live under each feature.
* **Centralized models**: every SQLAlchemy model sits in `app/models/`, where Alembic can reliably find them.

### Final Topology

```text
backend/
├── alembic/
│   ├── versions/
│   └── env.py
├── app/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── dependencies.py
│   ├── models/                 # CENTRALIZED MODELS (Alembic-friendly)
│   │   ├── __init__.py
│   │   ├── base.py             # Declarative Base
│   │   ├── task.py
│   │   ├── customer.py
│   │   └── ...
│   ├── features/               # FEATURE-BASED LOGIC
│   │   ├── __init__.py
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── schema.py
│   │   │   ├── service.py
│   │   │   └── router.py
│   │   └── customers/
│   │       ├── schema.py
│   │       ├── service.py
│   │       └── router.py
│   ├── main.py
│   └── __init__.py
└── tests/
    └── features/               # Tests mirror features
        ├── tasks/
        └── customers/
```

---

## Wiring It Up (tiny but important details)

### `app/models/base.py`

```python
from sqlalchemy.orm import declarative_base

Base = declarative_base()
```

### `app/models/__init__.py`

```python
from .base import Base

# Import models so Alembic can discover them
from .task import Task
from .customer import Customer

__all__ = ["Base", "Task", "Customer"]
```

### `alembic/env.py` (snippet)

```python
from app.models import Base
target_metadata = Base.metadata
```

### `app/main.py` (router registration)

```python
from fastapi import FastAPI
from app.features.tasks import router as tasks_router
from app.features.customers import router as customers_router

app = FastAPI()

app.include_router(tasks_router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(customers_router, prefix="/api/v1/customers", tags=["Customers"])
```

---

## How to Work Day-to-Day

**Database change?**

1. Edit `app/models/*.py`
2. `alembic revision --autogenerate -m "your message"`
3. `alembic upgrade head`

**API/logic change?**
Work in `app/features/{feature}/`:

* `schema.py` → request/response models (Pydantic)
* `service.py` → business logic (imports SQLAlchemy models from `app/models`)
* `router.py` → HTTP endpoints (thin, call services)

**Tests**
Create/update tests under `tests/features/{feature}/`.

---

## Frontend Contract Stays Smooth

Python remains the **source of truth** for the API. Generate OpenAPI → generate TS client. No hand-editing generated code—wrap with hooks where needed.

```bash
python backend/generate_openapi.py
pnpm --dir frontend generate-api
```

---

## Guardrails (for humans *and* agents)

* **Routers**: No database calls. Call services.
* **Services**: Orchestrate DB work using models, transactions, and domain logic.
* **Schemas**: Validate shapes for requests/responses only; don’t sneak business logic here.
* **Models**: Centralized; represent persistence only.
* **Cross-feature imports**: Prefer service boundaries over reaching into another feature’s internals.

---

## Refactor Plan (incremental, low-risk)

1. Pick one feature (e.g., `tasks`).
2. Create `app/features/tasks/{schema,service,router}.py`.
3. Move logic from layered folders, fix imports (e.g., `from app.models.task import Task`).
4. Update `app/main.py` to include the feature router.
5. Run tests → repeat for the next feature.

---

## Why This Works

* **Cohesion where it counts**: the stuff you touch daily is in one place.
* **Migrations that never surprise you**: Alembic has a single, canonical model source.
* **LLM-readiness**: “Work on the `tasks` feature” is now a precise instruction with a small, relevant code surface.

---

If you’re wrestling with the same trade-off, this hybrid approach has been the sweet spot: *feature-based ergonomics without sacrificing migration reliability*.
