// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar = app
                .shell()
                .sidecar("smart-etf-backend")
                .expect("failed to create sidecar command");

            let (mut rx, _child) = sidecar
                .spawn()
                .expect("failed to spawn smart-etf-backend sidecar");

            // Forward stdout/stderr from the Python backend to the parent stdout
            // so `cargo tauri dev` shows backend logs alongside Tauri logs.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            let line = String::from_utf8_lossy(&bytes);
                            print!("[backend] {}", line);
                        }
                        CommandEvent::Stderr(bytes) => {
                            let line = String::from_utf8_lossy(&bytes);
                            eprint!("[backend] {}", line);
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[backend] terminated: {:?}", payload);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
