#![allow(incomplete_features)]
#![feature(generic_const_exprs)]

use kindle::prelude::*;

// The model itself is consistent — but the input tensor is
// Rank2<1, 512> while the first layer expects 784 features.
type Model = (Linear<784, 256>, Relu, Linear<256, 10>);

fn main() {
    let vm = VarMap::new();
    let vs: Vs = Vs::from_varmap(&vm);
    let model = Model::build(&vs, Default::default());

    let xs: Tensor<Rank2<1, 512>> = Tensor::ones();
    let out = model.forward(&xs); // compile error: 512 != 784
    println!("{:?}", out);
}
