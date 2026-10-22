mod admin;
mod auth;
mod error;
mod transactions;

use std::{env, sync::Arc};

use axum::{
    Router,
    http::{HeaderValue, Method, header},
    routing::{get, post},
};
use sqlx::MySqlPool;
use tower_http::cors::CorsLayer;

/// Konfigurasi dari environment (lihat .env.example).
pub struct Config {
    pub admin_username: String,
    pub admin_password: String,
    pub jwt_secret: String,
    pub internal_secret: String,
}

#[derive(Clone)]
pub struct AppState {
    pub db: MySqlPool,
    pub config: Arc<Config>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")?;
    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let cors_origin = env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:4321".to_string());

    let config = Config {
        admin_username: env::var("ADMIN_USERNAME")?,
        admin_password: env::var("ADMIN_PASSWORD")?,
        jwt_secret: env::var("JWT_SECRET")?,
        internal_secret: env::var("INTERNAL_SECRET")?,
    };

    let db = MySqlPool::connect(&database_url).await?;
    sqlx::migrate!("./migrations").run(&db).await?;

    let cors = CorsLayer::new()
        .allow_origin(cors_origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app = Router::new()
        .route("/api/transactions", get(transactions::list))
        .route("/api/admin/login", post(auth::login))
        .route("/api/admin/summary", get(admin::summary))
        .route("/internal/transactions", post(transactions::ingest))
        .layer(cors)
        .with_state(AppState {
            db,
            config: Arc::new(config),
        });

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    println!("Backend berjalan di http://{bind_addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
