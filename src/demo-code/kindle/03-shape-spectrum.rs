use kindle::prelude::*;

type Backend = kindle::candle::CandleBackend<f32, Cpu>;

fn main() -> Result<()> {
    // Fully static: every dim lives in the type,
    // so there is nothing to pass at runtime.
    let a = Tensor::<s![2, 784], Backend>::zeros(())?;

    // Partially static: the batch dim is `dyn` — you pass
    // it at runtime; the 784 features stay compiler-checked.
    let b = Tensor::<s![dyn, 784], Backend>::zeros((32, ()))?;

    // Fully dynamic: the whole shape is runtime,
    // like any other framework when you need it.
    let c = Tensor::<Dyn, Backend>::zeros(vec![8, 784])?;

    println!("static : {:?}", a);
    println!("partial: {:?}", b);
    println!("dynamic: {:?}", c);
    Ok(())
}
