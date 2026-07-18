#![allow(incomplete_features)]
#![feature(generic_const_exprs)]

use kindle::prelude::*;

// Shapes agree end to end: Rank2<2, 784> -> 256 -> 10.
// The output type is inferred as Tensor<Rank2<2, 10>> — for free,
// and erased at compile time. Zero runtime overhead.
type Model = (Linear<784, 256>, Relu, Linear<256, 10>);

fn main() {
    let vm = VarMap::new();
    let vs: Vs = Vs::from_varmap(&vm);
    let model = Model::build(&vs, Default::default());

    let xs: Tensor<Rank2<2, 784>> = Tensor::ones();
    let out: Tensor<Rank2<2, 10>> = model.forward(&xs);
    println!("{:?}", out);
}
