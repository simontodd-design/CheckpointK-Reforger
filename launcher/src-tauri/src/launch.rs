//! Reforger launch — via Steam, not direct exe.
//!
//! Spawning ArmaReforgerSteam.exe directly causes:
//!     Steamworks: SteamAPI_Init failed. Is Steam running?
//!     Could not initialize platform services.
//!     Unable to initialize the game
//! because the game can't find a parent Steam process to back its API.
//!
//! Instead we spawn `<SteamPath>\Steam.exe -applaunch 1874880 <args>`.
//! Steam ensures it's running, signs the user in if needed, and starts
//! Reforger as if from the library UI — Steamworks initializes cleanly
//! and our `-connect IP:PORT` is forwarded through. This is the same
//! approach DZSA / battlemetrics use for DayZ joins.
//!
//! Steam's app ID for Arma Reforger client is 1874880.

use std::path::PathBuf;
use std::process::Command;

use serde::Serialize;

use crate::arma::find_steam_path;

const ARMA_APP_ID: &str = "1874880";

#[derive(Debug, Serialize, Clone)]
pub struct LaunchResult {
    pub ok: bool,
    pub pid: Option<u32>,
    pub error: Option<String>,
    /// The full command line we ran, useful for surfacing in dev.
    pub cmdline: Option<String>,
}

#[tauri::command]
pub fn launch_reforger(
    server: Option<String>,
    password: Option<String>,
) -> LaunchResult {
    let steam_dir = match find_steam_path() {
        Some(p) => p,
        None => {
            return err("Steam install not found — is Steam installed?");
        }
    };
    let steam_exe = steam_dir.join("Steam.exe");
    if !steam_exe.exists() {
        return err(format!(
            "Steam.exe not found at expected path: {}",
            steam_exe.display()
        ));
    }

    let mut cmd = Command::new(&steam_exe);
    cmd.arg("-applaunch").arg(ARMA_APP_ID);

    if let Some(server) = server.as_deref().filter(|s| !s.is_empty()) {
        cmd.arg("-connect").arg(server);
        if let Some(pw) = password.as_deref().filter(|s| !s.is_empty()) {
            cmd.arg("-password").arg(pw);
        }
    }

    // Build a human-readable cmdline for logs/error reports before spawn.
    let cmdline = format_cmdline(&steam_exe, &server, &password);

    match cmd.spawn() {
        Ok(child) => LaunchResult {
            ok: true,
            pid: Some(child.id()),
            error: None,
            cmdline: Some(cmdline),
        },
        Err(e) => LaunchResult {
            ok: false,
            pid: None,
            error: Some(format!("spawn failed: {e}")),
            cmdline: Some(cmdline),
        },
    }
}

fn err(msg: impl Into<String>) -> LaunchResult {
    LaunchResult {
        ok: false,
        pid: None,
        error: Some(msg.into()),
        cmdline: None,
    }
}

fn format_cmdline(
    steam_exe: &PathBuf,
    server: &Option<String>,
    password: &Option<String>,
) -> String {
    let mut parts: Vec<String> = vec![
        format!("\"{}\"", steam_exe.display()),
        "-applaunch".into(),
        ARMA_APP_ID.into(),
    ];
    if let Some(s) = server.as_deref().filter(|s| !s.is_empty()) {
        parts.push("-connect".into());
        parts.push(s.into());
        if password.as_deref().filter(|p| !p.is_empty()).is_some() {
            parts.push("-password".into());
            parts.push("***".into());
        }
    }
    parts.join(" ")
}
