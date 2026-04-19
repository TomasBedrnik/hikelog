from app.auth.session import create_admin_session_token, verify_admin_session_token


def test_admin_session_round_trip():
    token = create_admin_session_token(email="Admin@Example.com", sub="google-subject")

    claims = verify_admin_session_token(token)

    assert claims.email == "admin@example.com"
    assert claims.sub == "google-subject"
    assert claims.exp > 0
    assert claims.bootstrap_only is False


def test_admin_session_bootstrap_round_trip():
    token = create_admin_session_token(
        email="Admin@Example.com",
        sub="google-subject",
        bootstrap_only=True,
    )

    claims = verify_admin_session_token(token)

    assert claims.email == "admin@example.com"
    assert claims.sub == "google-subject"
    assert claims.exp > 0
    assert claims.bootstrap_only is True


def test_admin_session_rejects_tampering():
    token = create_admin_session_token(email="admin@example.com", sub="google-subject")
    payload, signature = token.split(".", 1)
    tampered = f"{payload}.invalid{signature}"

    try:
        verify_admin_session_token(tampered)
    except ValueError as exc:
        assert "signature" in str(exc)
    else:
        raise AssertionError("tampered token must be rejected")
