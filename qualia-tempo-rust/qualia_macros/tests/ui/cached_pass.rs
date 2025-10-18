use qualia_macros::cached;

#[cached(ttl = 60)]
async fn expensive_calculation(input: u32) -> anyhow::Result<u32> {
    Ok(input * 2)
}

fn main() {}
