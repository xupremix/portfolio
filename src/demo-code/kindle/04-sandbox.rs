// kindle itself can't build on play.rust-lang.org (it links libtorch),
// so this sandbox distills the mechanism it is built on: tensor shapes
// as const generics. Edit freely and hit Compile — this is real rustc,
// running remotely on the official Rust playground.

use std::marker::PhantomData;

struct Tensor<const N: usize>(PhantomData<[(); N]>);
struct Linear<const IN: usize, const OUT: usize>(PhantomData<()>);

impl<const IN: usize, const OUT: usize> Linear<IN, OUT> {
    fn new() -> Self { Linear(PhantomData) }
    fn forward(&self, _: Tensor<IN>) -> Tensor<OUT> {
        Tensor(PhantomData)
    }
}

fn main() {
    let layer: Linear<128, 64> = Linear::new();

    // Wrong shape: 256 != 128  ->  compile error. Fix it, recompile.
    let bad_input = Tensor::<256>(PhantomData);
    let _out = layer.forward(bad_input);
}
