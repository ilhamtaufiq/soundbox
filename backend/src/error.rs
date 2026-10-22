use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

/// Error yang dikembalikan handler. Bentuk body selalu `{ "message": "..." }`
/// karena frontend membaca field `message`.
pub enum ApiError {
    BadRequest(&'static str),
    Unauthorized,
    Internal(anyhow::Error),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.to_string()),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Tidak terautentikasi".to_string()),
            ApiError::Internal(err) => {
                eprintln!("internal error: {err:?}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Terjadi kesalahan di server".to_string())
            }
        };
        (status, Json(json!({ "message": message }))).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError::Internal(err.into())
    }
}
