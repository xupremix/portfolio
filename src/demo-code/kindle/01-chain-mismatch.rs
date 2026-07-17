#![allow(incomplete_features)]
#![feature(generic_const_exprs)]

use kindle::prelude::*;

// A model is just a type. kindle threads the tensor shape through
// every layer: Linear<784, 256> -> Relu -> Linear<128, 10>.
// The middle dimensions disagree (256 vs 128) — rustc rejects this
// program before anything runs.
type Model = (Linear<784, 256>, Relu, Linear<128, 10>);

fn main() {
    let vm = VarMap::new();
    let vs: Vs = Vs::from_varmap(&vm);
    let model = Model::build(&vs, Default::default());

    let xs: Tensor<Rank2<1, 784>> = Tensor::ones();
    let out = model.forward(&xs); // compile error: 256 != 128
    println!("{:?}", out);
}
