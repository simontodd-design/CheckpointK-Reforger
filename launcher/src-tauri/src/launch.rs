//! Reforger launch — spawn ArmaReforgerSteam.exe with optional connect args.
//!
//! The exact CLI for joining a server in Reforger is `-connect IP:PORT`
//! (space separated, per Bohemia's documented client startup parameters).
//! When no server is provided we just launch the main menu so the user
//! can verify the spawn worked.
//!
//! We deliberately don't wait for the process — Reforger takes ages to
//! boot and the launcher returns to the foyer immediately. The actual
//! "minimize launcher to tray" UX lands in a follow-up.

use std::path::PathBuf;
use std::process::Command;

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct LaunchResult {
    pub ok: bool,
    pub pid: Option<u32>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn launch_reforger(
    exe_path: String,
    server: Option<String>,
    password: Option<String>,
) -> LaunchResult {
    let exe = PathBuf::from(&exe_path);
    if !exe.exists() {
        return LaunchResult {
            ok: false,
            pid: None,
            error: Some(format!("exe not found: {exe_path}")),
        };
    }

    let mut cmd = Command::new(&exe);
    // Run from the game's own dir so it finds its data files
    if let Some(parent) = exe.parent() {
        cmd.current_dir(parent);
    }

    if let Some(server) = server.as_deref().filter(|s| !s.is_empty()) {
        cmd.arg("-connect").arg(server);
        if let Some(pw) = password.as_deref().filter(|s| !s.is_empty()) {
            cmd.arg("-password").arg(pw);
        }
    }

    match cmd.spawn() {
        Ok(child) => LaunchResult {
            ok: true,
            pid: Some(child.id()),
            error: None,
        },
        Err(e) => LaunchResult {
            ok: false,
            pid: None,
            error: Some(format!("spawn failed: {e}")),
        },
    }
}
