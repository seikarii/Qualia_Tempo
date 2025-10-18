use qualia_macros::retry;

#[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = false)]
async fn network_call() -> anyhow::Result<String> {
    Ok("success".to_string())
}

fn main() {}
