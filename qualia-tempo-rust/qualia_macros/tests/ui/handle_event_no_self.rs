// This should fail - no &self parameter
use qualia_macros::handle_event;

#[handle_event(GameEvent::Test)]
fn no_self_handler() {}

fn main() {}
