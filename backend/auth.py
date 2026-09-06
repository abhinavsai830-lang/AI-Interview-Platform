# backend/auth.py

import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from dotenv import load_dotenv

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    OAuth2PasswordBearer,
)

from jose import (
    JWTError,
    jwt,
)

from passlib.context import (
    CryptContext,
)

from sqlalchemy.orm import (
    Session,
)

from .database import get_db
from .models import User


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = (
    os.getenv("JWT_SECRET_KEY")
    or os.getenv("SECRET_KEY")
)

if not SECRET_KEY:

    raise RuntimeError(
        "JWT_SECRET_KEY must be set in .env"
    )


ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)


ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "1440"
    )
)


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# ============================================================
# OAUTH2
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# ============================================================
# HASH PASSWORD
# ============================================================

def hash_password(
    password: str
) -> str:

    return pwd_context.hash(
        password
    )


# ============================================================
# VERIFY PASSWORD
# ============================================================

def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ============================================================
# CREATE ACCESS TOKEN
# ============================================================

def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None
) -> str:

    expire = (
        datetime.now(timezone.utc)
        +
        (
            expires_delta
            or timedelta(
                minutes=
                    ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )
    )

    payload = {
        "sub": subject,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user(

    token: str = Depends(
        oauth2_scheme
    ),

    db: Session = Depends(
        get_db
    ),

) -> User:

    credentials_exception = HTTPException(

        status_code=
            status.HTTP_401_UNAUTHORIZED,

        detail=
            "Could not validate credentials",

        headers={
            "WWW-Authenticate":
                "Bearer"
        },
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[
                ALGORITHM
            ]
        )

        subject = payload.get(
            "sub"
        )

        if subject is None:

            raise credentials_exception

        user_id = int(
            subject
        )

    except (
        JWTError,
        ValueError
    ):

        raise credentials_exception

    user = db.get(
        User,
        user_id
    )

    if user is None:

        raise credentials_exception

    return user