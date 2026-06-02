//! Arma Reforger install detection.
//!
//! Two Tauri commands:
//!   detect_arma_install — auto-find Reforger via Steam registry + libraryfolders.vdf
//!   validate_arma_path  — verify a user-picked directory contains ArmaReforgerSteam.exe
//!
//! Steam stores its install path in HKCU\Software\Valve\Steam\SteamPath.
//! Inside that path, `steamapps/libraryfolders.vdf` lists every library
//! folder the user has across drives. For each library, we look for
//! `appmanifest_1874880.acf` (1874880 is Arma Reforger's Steam AppID).
//! The manifest's `installdir` value names the subfolder under
//! `steamapps/common/` where the game lives.

use std::fs;
use std::path::{Path, PathBuf};

use regex::Regex;
use serde::Serialize;

const ARMA_APP_ID: &str = "1874880";
const EXE_NAME: &str = "ArmaReforgerSteam.exe";

#[derive(Debug, Serialize, Clone)]
pub struct ArmaInstall {
    pub steam_path: Option<String>,
    pub install_dir: String,
    pub exe_path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum DetectionResult {
    Found { install: ArmaInstall },
    NotFound { reason: String },
    Error { error: String },
}

#[derive(Debug, Serialize, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub exe_path: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn detect_arma_install() -> DetectionResult {
    match try_detect_arma() {
        Ok(Some(install)) => DetectionResult::Found { install },
        Ok(None) => DetectionResult::NotFound {
            reason: "Arma Reforger not found in any Steam library".into(),
        },
        Err(e) => DetectionResult::Error { error: e },
    }
}

#[tauri::command]
pub fn validate_arma_path(path: String) -> ValidationResult {
    let p = PathBuf::from(&path);
    let exe = p.join(EXE_NAME);
    if exe.exists() && exe.is_file() {
        ValidationResult {
            valid: true,
            exe_path: Some(exe.to_string_lossy().into_owned()),
            error: None,
        }
    } else {
        // Maybe the user picked the parent of the game dir — try one level down.
        let nested = p.join("Arma Reforger").join(EXE_NAME);
        if nested.exists() && nested.is_file() {
            return ValidationResult {
                valid: true,
                exe_path: Some(nested.to_string_lossy().into_owned()),
                error: None,
            };
        }
        ValidationResult {
            valid: false,
            exe_path: None,
            error: Some(format!("{} not found in {}", EXE_NAME, path)),
        }
    }
}

fn try_detect_arma() -> Result<Option<ArmaInstall>, String> {
    let steam_path = find_steam_path()
        .ok_or_else(|| "Steam install location not found in registry".to_string())?;
    let libs = read_libraryfolders(&steam_path)?;
    for lib in libs {
        let manifest = lib
            .join("steamapps")
            .join(format!("appmanifest_{}.acf", ARMA_APP_ID));
        if !manifest.exists() {
            continue;
        }
        let body = fs::read_to_string(&manifest)
            .map_err(|e| format!("read manifest {}: {e}", manifest.display()))?;
        let installdir = extract_vdf_value(&body, "installdir")
            .ok_or_else(|| format!("manifest {} missing installdir", manifest.display()))?;
        let game_dir = lib.join("steamapps").join("common").join(&installdir);
        let exe = game_dir.join(EXE_NAME);
        if !exe.exists() {
            continue;
        }
        return Ok(Some(ArmaInstall {
            steam_path: Some(steam_path.to_string_lossy().into_owned()),
            install_dir: game_dir.to_string_lossy().into_owned(),
            exe_path: exe.to_string_lossy().into_owned(),
        }));
    }
    Ok(None)
}

#[cfg(windows)]
pub fn find_steam_path() -> Option<PathBuf> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu.open_subkey("Software\\Valve\\Steam").ok()?;
    let path: String = key.get_value("SteamPath").ok()?;
    Some(PathBuf::from(path.replace('/', "\\")))
}

#[cfg(not(windows))]
pub fn find_steam_path() -> Option<PathBuf> {
    // Non-Windows fallback — try the standard Linux/macOS Steam dirs.
    use std::env;
    let home = env::var("HOME").ok()?;
    for candidate in &[
        format!("{home}/.steam/steam"),
        format!("{home}/.local/share/Steam"),
        format!("{home}/Library/Application Support/Steam"),
    ] {
        let p = PathBuf::from(candidate);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

/// Parse libraryfolders.vdf for every library "path" entry.
/// Falls back to just the main Steam path if the file is missing.
fn read_libraryfolders(steam_path: &Path) -> Result<Vec<PathBuf>, String> {
    let vdf = steam_path.join("steamapps").join("libraryfolders.vdf");
    if !vdf.exists() {
        return Ok(vec![steam_path.to_path_buf()]);
    }
    let content = fs::read_to_string(&vdf)
        .map_err(|e| format!("read libraryfolders.vdf: {e}"))?;
    let re = Regex::new(r#""path"\s+"([^"]+)""#).expect("static regex compiles");
    let mut libs: Vec<PathBuf> = re
        .captures_iter(&content)
        .filter_map(|c| c.get(1))
        .map(|m| PathBuf::from(m.as_str().replace("\\\\", "\\")))
        .collect();
    if libs.is_empty() {
        libs.push(steam_path.to_path_buf());
    }
    Ok(libs)
}

fn extract_vdf_value(content: &str, key: &str) -> Option<String> {
    let pattern = format!(r#""{}"\s+"([^"]+)""#, regex::escape(key));
    let re = Regex::new(&pattern).ok()?;
    re.captures(content)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
}
