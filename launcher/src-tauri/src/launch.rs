//! Reforger launch — via the steam:// URL protocol.
//!
//! Two prior approaches failed:
//!   1. ArmaReforgerSteam.exe direct spawn → SteamAPI_Init failed
//!   2. Steam.exe -applaunch <id> <args> → spawns Steam.exe but the
//!      cold-start handoff to the running Steam process drops the
//!      -applaunch args (PID returns but game never launches).
//!
//! The robust approach is `steam://run/<appid>//<args>` opened via the
//! OS shell. Steam owns the URL protocol handler; whether Steam is
//! running or not, the shell routes the call and Steam processes it
//! the same way clicking "Play" in the library does.
//!
//! Args after `//` are URL-encoded; `+` decodes to a space. So
//! `steam://run/1874880//-connect+127.0.0.1:2001` lands as Reforger
//! command line `-connect 127.0.0.1:2001`.
//!
//! Steam's app ID for Arma Reforger client is 1874880.

use std::process::Command;

use serde::Serialize;

const ARMA_APP_ID: &str = "1874880";

#[derive(Debug, Serialize, Clone)]
pub struct LaunchResult {
    pub ok: bool,
    pub pid: Option<u32>,
    pub error: Option<String>,
    /// The URL or command line we opened, useful for surfacing in dev.
    pub cmdline: Option<String>,
}

#[tauri::command]
pub fn launch_reforger(
    server: Option<String>,
    password: Option<String>,
) -> LaunchResult {
    let mut url = format!("steam://run/{ARMA_APP_ID}");
    let mut args: Vec<String> = Vec::new();
    if let Some(s) = server.as_deref().filter(|s| !s.is_empty()) {
        args.push("-connect".into());
        args.push(s.to_string());
        if let Some(pw) = password.as_deref().filter(|s| !s.is_empty()) {
            args.push("-password".into());
            args.push(pw.to_string());
        }
    }
    if !args.is_empty() {
        url.push_str("//");
        // Steam URL protocol uses '+' to encode the spaces between args.
        url.push_str(&args.join("+"));
    }

    open_url(&url)
}

#[cfg(windows)]
fn open_url(url: &str) -> LaunchResult {
    // `cmd /C start "" <url>` — the empty "" is the title placeholder
    // start expects when its first arg is quoted.
    match Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
    {
        Ok(child) => LaunchResult {
            ok: true,
            pid: Some(child.id()),
            error: None,
            cmdline: Some(url.to_string()),
        },
        Err(e) => LaunchResult {
            ok: false,
            pid: None,
            error: Some(format!("cmd start failed: {e}")),
            cmdline: Some(url.to_string()),
        },
    }
}

#[cfg(not(windows))]
fn open_url(url: &str) -> LaunchResult {
    match Command::new("xdg-open").arg(url).spawn() {
        Ok(child) => LaunchResult {
            ok: true,
            pid: Some(child.id()),
            error: None,
            cmdline: Some(url.to_string()),
        },
        Err(e) => LaunchResult {
            ok: false,
            pid: None,
            error: Some(format!("xdg-open failed: {e}")),
            cmdline: Some(url.to_string()),
        },
    }
}
