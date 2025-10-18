use qualia_macros::timeout;

#[timeout(5000)]
async fn long_operation() -> anyhow::Result<()> {
    Ok(())
}

fn main() {}
