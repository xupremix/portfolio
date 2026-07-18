use kindle::prelude::*;

type Backend = kindle::candle::CandleBackend<f32, Cpu>;

// A model is a type: the layer chain 784 -> 256 -> 10 is
// spelled out in the signature and checked by rustc.
#[module]
pub struct Mlp {
    net: Sequential<Linear<s![784, 256], Backend>, Sequential<ReLU, Linear<s![256, 10], Backend>>>,
}

fn main() -> Result<()> {
    let model = Mlp {
        net: seq!(
            Linear::<s![784, 256], Backend>::new()?,
            ReLU,
            Linear::<s![256, 10], Backend>::new()?
        ),
    };

    // Shapes agree end to end: (2, 784) -> 256 -> 10.
    let x = Tensor::<s![2, 784], Backend>::ones(())?;
    let y: Tensor<s![2, 10], Backend> = model.net.forward(x)?;
    println!("{:?}", y);
    Ok(())
}
