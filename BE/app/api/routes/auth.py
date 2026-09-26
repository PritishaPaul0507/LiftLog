import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from BE.app.api.deps import (
    decode_token,
    get_current_user,
    hash_password,
    issue_tokens_for_user,
    verify_password,
)
from BE.app.db import get_db
from BE.app.models import User
from BE.app.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    SignupRequest,
    SignupResponse,
    UserPublic,
)

logger = logging.getLogger("liftlog")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=SignupResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email:
        logger.info("Signup rejected: email missing")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email is required")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        logger.info("Signup rejected: account already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="the user already exist please log in",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        auth_provider="email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token, refresh_token = issue_tokens_for_user(db, user.id)

    response = SignupResponse(
        message="User created successfully",
        user={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "email": user.email,
            "full_name": user.full_name,
        },
    )
    logger.info("User account created user_id=%s", user.id)
    return response


@router.post("/login", response_model=SignupResponse)
def demo_login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning("Login rejected: credentials invalid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_valid = verify_password(payload.password, user.password_hash)
    if not password_valid:
        logger.warning("Login rejected: credentials invalid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token, refresh_token = issue_tokens_for_user(db, user.id)

    response = SignupResponse(
        message="Loged in successfully",
        user={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "email": user.email,
            "full_name": user.full_name,
        },
    )
    logger.info("Login succeeded user_id=%s", user.id)
    return response


@router.post("/refresh", response_model=SignupResponse)
def refresh_access_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    token = payload.refresh_token.strip()
    if not token:
        logger.info("Token refresh rejected: token missing")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Refresh token is required",
        )

    user_id_int = decode_token(token, expected_type="refresh")
    user = db.query(User).filter(User.id == user_id_int).first()
    if user is None:
        logger.warning("Token refresh rejected: account not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    if user.refresh_token != token:
        logger.warning("Token refresh rejected: token no longer valid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is no longer valid",
        )

    access_token, refresh_token = issue_tokens_for_user(db, user.id)

    response = SignupResponse(
        message="Token refreshed successfully",
        user={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "email": user.email,
            "full_name": user.full_name,
        },
    )
    logger.info("Token refresh succeeded user_id=%s", user.id)
    return response

