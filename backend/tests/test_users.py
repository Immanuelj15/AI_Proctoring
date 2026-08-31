from datetime import timedelta
from app.core.security import create_access_token


def register_and_get_token(client, email: str, role: str) -> str:
    client.post(
        "/auth/register",
        json={
            "name": f"Test {role.capitalize()}",
            "email": email,
            "password": "Password123!",
            "role": role
        }
    )
    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    return login_res.json()["access_token"]


def test_users_me_success(client):
    token = register_and_get_token(client, "me@test.com", "student")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@test.com"
    assert data["role"] == "student"


def test_users_me_missing_token(client):
    response = client.get("/users/me")
    assert response.status_code == 401


def test_users_me_invalid_token(client):
    headers = {"Authorization": "Bearer invalid.jwt.token"}
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 401


def test_users_me_expired_token(client):
    expired_token = create_access_token(
        data={"sub": "1", "role": "student"},
        expires_delta=timedelta(seconds=-10)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 401


def test_role_authorization_student(client):
    token = register_and_get_token(client, "student_role@test.com", "student")
    headers = {"Authorization": f"Bearer {token}"}

    # Student allowed on student-test
    res_student = client.get("/users/student-test", headers=headers)
    assert res_student.status_code == 200
    assert res_student.json()["role"] == "student"

    # Student denied on examiner-test
    res_examiner = client.get("/users/examiner-test", headers=headers)
    assert res_examiner.status_code == 403

    # Student denied on admin-test
    res_admin = client.get("/users/admin-test", headers=headers)
    assert res_admin.status_code == 403


def test_role_authorization_examiner(client):
    token = register_and_get_token(client, "examiner_role@test.com", "examiner")
    headers = {"Authorization": f"Bearer {token}"}

    # Examiner allowed on examiner-test
    res_examiner = client.get("/users/examiner-test", headers=headers)
    assert res_examiner.status_code == 200

    # Examiner denied on admin-test
    res_admin = client.get("/users/admin-test", headers=headers)
    assert res_admin.status_code == 403


def test_role_authorization_admin(client):
    token = register_and_get_token(client, "admin_role@test.com", "admin")
    headers = {"Authorization": f"Bearer {token}"}

    # Admin allowed on admin-test
    res_admin = client.get("/users/admin-test", headers=headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "admin"
