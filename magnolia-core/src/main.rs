// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let is_headless = args.iter().any(|arg| arg == "--headless");

    if is_headless {
        println!("[Magnolia] Initializing Headless Backend...");
        magnolia_lib::run_headless();
    } else {
        // The main entry point delegates to the Magnolia core-lib
        // which handles the distinction between PID 1 (Init) and App Mode.
        magnolia_lib::run();
    }
}
