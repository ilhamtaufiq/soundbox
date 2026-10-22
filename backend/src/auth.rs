use axum::{
    Json,
    extract::{FromRequestParts, State},
    http::{header::AUTHORIZATION, request::Parts},
};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

use crate::{AppState, error::ApiError};

const TOKEN_TTL_HOURS: i64 = 12;

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

#[derive(Deserialize)]
pub struct LoginBody {
    username: String,
    password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    token: String,
    expires_at: DateTime<Utc>,
}

/// POST /api/admin/login
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<LoginResponse>, ApiError> {
    let user_ok = body.username.as_bytes().ct_eq(state.config.admin_username.as_bytes());
    let pass_ok = body.password.as_bytes().ct_eq(state.config.admin_password.as_bytes());
    if !bool::from(user_ok & pass_ok) {
        return Err(ApiError::Unauthorized);
    }

    let expires_at = Utc::now() + Duration::hours(TOKEN_TTL_HOURS);
    let claims = Claims {
        sub: body.username,
        exp: expires_at.timestamp() as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|err| ApiError::Internal(err.into()))?;

    Ok(Json(LoginResponse { token, expires_at }))
}

/// Extractor untuk route yang butuh login admin: wajib header `Authorization: Bearer <token>`.
/// Dipakai juga oleh halaman soundbox dan dashboard.
pub struct AdminAuth;

impl FromRequestParts<AppState> for AdminAuth {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or(ApiError::Unauthorized)?;

        decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| ApiError::Unauthorized)?;

        Ok(AdminAuth)
    }
}
