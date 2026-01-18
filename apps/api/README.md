# HikeLog Backend

## Lint, format
Linting is forced in GitHub.
To run the linter, use the following command:

```bash
ruff check .
ruff check . --fix

ruff format --check .
ruff format .
```

## Local Development
To start the development server, use the following command:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```