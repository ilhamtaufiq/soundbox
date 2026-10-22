use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

use crate::{AppState, auth::AdminAuth, error::ApiError};

#[derive(Deserialize)]
pub struct ListQuery {
    after_id: Option<u64>,
    limit: Option<u32>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct Transaction {
    pub id: u64,
    pub payment_id: Option<String>,
    pub amount: u64,
    pub tx_id: String,
    pub paid_at: DateTime<Utc>,
}

/// GET /api/transactions?after_id=&limit=
/// - tanpa after_id: `limit` transaksi terbaru, urut id naik
/// - dengan after_id: transaksi dengan id > after_id, urut id naik
pub async fn list(
    State(state): State<AppState>,
    _auth: AdminAuth,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Transaction>>, ApiError> {
    let limit = query.limit.unwrap_or(20).clamp(1, 100);

    let rows = match query.after_id {
        Some(after_id) => {
            sqlx::query_as::<_, Transaction>(
                "SELECT id, payment_id, amount, tx_id, paid_at FROM transactions \
                 WHERE id > ? ORDER BY id ASC LIMIT ?",
            )
            .bind(after_id)
            .bind(limit)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as::<_, Transaction>(
                "SELECT id, payment_id, amount, tx_id, paid_at FROM \
                 (SELECT id, payment_id, amount, tx_id, paid_at FROM transactions \
                  ORDER BY id DESC LIMIT ?) AS latest ORDER BY id ASC",
            )
            .bind(limit)
            .fetch_all(&state.db)
            .await?
        }
    };

    Ok(Json(rows))
}

#[derive(Deserialize)]
pub struct IngestBody {
    amount: u64,
    tx_id: String,
    paid_at: DateTime<Utc>,
}

/// POST /internal/transactions — dipanggil bridge.js saat watcher GoBiz mendeteksi pembayaran masuk.
/// - Header `X-Internal-Secret` harus sama dengan INTERNAL_SECRET.
/// - `tx_id` yang sudah ada diabaikan (balik 200), jadi aman dikirim ulang.
/// - Balik 201 jika transaksi baru tersimpan.
pub async fn ingest(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<IngestBody>,
) -> Result<StatusCode, ApiError> {
    let provided = headers
        .get("x-internal-secret")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    if !bool::from(provided.as_bytes().ct_eq(state.config.internal_secret.as_bytes())) {
        return Err(ApiError::Unauthorized);
    }

    if body.tx_id.trim().is_empty() || body.amount == 0 {
        return Err(ApiError::BadRequest("tx_id dan amount wajib diisi"));
    }

    let result = sqlx::query("INSERT IGNORE INTO transactions (amount, tx_id, paid_at) VALUES (?, ?, ?)")
        .bind(body.amount)
        .bind(&body.tx_id)
        .bind(body.paid_at)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Ok(StatusCode::OK);
    }
    Ok(StatusCode::CREATED)
}
