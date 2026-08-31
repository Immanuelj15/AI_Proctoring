from app.core.security import decode_access_token


def test_register_valid_user(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Test Student",
            "email": "student@test.com",
            "password": "Password123!",
            "role": "student"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student@test.com"
    assert data["name"] == "Test Student"
    assert data["role"] == "student"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client):
    user_payload = {
        "name": "User One",
        "email": "duplicate@test.com",
        "password": "Password123!",
        "role": "student"
    }
    res1 = client.post("/auth/register", json=user_payload)
    assert res1.status_code == 201

    res2 = client.post("/auth/register", json=user_payload)
    assert res2.status_code == 409
    assert res2.json()["detail"] == "User with this email already exists"


def test_register_invalid_email(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Invalid Email",
            "email": "not-an-email",
            "password": "Password123!",
            "role": "student"
        }
    )
    assert response.status_code == 422


def test_register_invalid_role(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Invalid Role User",
            "email": "role@test.com",
            "password": "Password123!",
            "role": "superman"
        }
    )
    assert response.status_code == 422


def test_login_valid_credentials_json(client):
    client.post(
        "/auth/register",
        json={
            "name": "Login User",
            "email": "login@test.com",
            "password": "SecretPassword123",
            "role": "examiner"
        }
    )

    login_res = client.post(
        "/auth/login",
        json={"email": "login@test.com", "password": "SecretPassword123"}
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    payload = decode_access_token(token_data["access_token"])
    assert payload is not None
    assert payload["role"] == "examiner"


def test_login_valid_credentials_form(client):
    client.post(
        "/auth/register",
        json={
            "name": "Form User",
            "email": "formuser@test.com",
            "password": "SecretPassword123",
            "role": "admin"
        }
    )

    login_res = client.post(
        "/auth/login",
        data={"username": "formuser@test.com", "password": "SecretPassword123"}
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={
            "name": "Wrong Pass User",
            "email": "wrongpass@test.com",
            "password": "CorrectPassword123",
            "role": "student"
        }
    )

    login_res = client.post(
        "/auth/login",
        json={"email": "wrongpass@test.com", "password": "WrongPassword123"}
    )
    assert login_res.status_code == 401
    assert login_res.json()["detail"] == "Invalid email or password"


def test_login_unknown_email(client):
    login_res = client.post(
        "/auth/login",
        json={"email": "nonexistent@test.com", "password": "Password123"}
    )
    assert login_res.status_code == 401
    assert login_res.json()["detail"] == "Invalid email or password"
