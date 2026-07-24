use incin::prelude::*;

// incin is backend-agnostic; here: the CPU backend.
type Backend = IncinBackend<f32, Cpu>;

fn main() -> Result<()> {
    // A layer expecting 784 input features…
    let layer = Linear::<s![784, 256], Backend>::build(())?;

    // …fed a batch of 512-feature rows. 512 != 784,
    // so this is a *type error*, not a runtime crash.
    let input = Tensor::<s![2, 512], Backend>::zeros(())?;
    let _out = layer.forward(input)?;
    Ok(())
}
