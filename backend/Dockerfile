FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && apt-get clean
COPY --from=build /app/target/release/backend /usr/local/bin/backend
ENV BIND_ADDR=0.0.0.0:8080
EXPOSE 8080
CMD ["backend"]
