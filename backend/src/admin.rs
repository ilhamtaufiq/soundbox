use axum::{Json, extract::State};
use chrono::{DateTime, FixedOffset, Utc};
use serde::Serialize;

use crate::{AppState, auth::AdminAuth, error::ApiError};

/// Awal hari ini menurut WIB (UTC+7), bukan UTC.
fn start_of_today() -> DateTime<Utc> {
    let wib = FixedOffset::east_opt(7 * 3600).expect("offset WIB valid");
    let today = Utc::now().with_timezone(&wib).date_naive();
    today
        .and_hms_opt(0, 0, 0)
        .expect("tengah malam valid")
        .and_local_timezone(wib)
        .single()
        .expect("offset tetap, selalu tunggal")
        .with_timezone(&Utc)
}

#[derive(Serialize)]
pub struct Summary {
    today_amount: u64,
    today_count: i64,
    total_amount: u64,
}

#[derive(sqlx::FromRow)]
struct TransactionTotals {
    today_amount: u64,
    today_count: i64,
    total_amount: u64,
}

/// GET /api/admin/summary
pub async fn summary(_auth: AdminAuth, State(state): State<AppState>) -> Result<Json<Summary>, ApiError> {
    let since = start_of_today();

    let totals = sqlx::query_as::<_, TransactionTotals>(
        "SELECT \
            CAST(COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount END), 0) AS UNSIGNED) AS today_amount, \
            CAST(COUNT(CASE WHEN paid_at >= ? THEN 1 END) AS SIGNED) AS today_count, \
            CAST(COALESCE(SUM(amount), 0) AS UNSIGNED) AS total_amount \
         FROM transactions",
    )
    .bind(since)
    .bind(since)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(Summary {
        today_amount: totals.today_amount,
        today_count: totals.today_count,
        total_amount: totals.total_amount,
    }))
}
