// This should fail - only &self, no event parameter
use qualia_macros::handle_event;

struct TestService;

impl TestService {
    #[handle_event(GameEvent::Test)]
    fn only_self_handler(&self) {}
}

fn main() {}
