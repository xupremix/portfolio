use kindle::prelude::*;

type Backend = kindle::candle::CandleBackend<f32, Cpu>;

fn main() -> Result<()> {
    // Same shape — but different element types: f32 vs f64.
    let a = Tensor::<s![2, 2], Backend, f32>::zeros(())?;
    let b = Tensor::<s![2, 2], Backend, f64>::zeros(())?;

    // Mixing dtypes is a compile error, not a runtime surprise.
    let _sum = a.add(&b)?;
    Ok(())
}
