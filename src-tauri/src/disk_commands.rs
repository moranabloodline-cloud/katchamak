use crate::project_store::{self, Loaded, Library};
use crate::storage_settings::{self, StorageSettings};
use serde_json::Value;
use std::{path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

static IO: Mutex<()> = Mutex::new(());
fn registry(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("recent-projects.json"))
}

#[tauri::command]
pub async fn load_disk_projects(app: AppHandle) -> Result<Library, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        project_store::library(&registry(&app)?)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_disk_recovery(app: AppHandle, documents: Vec<Value>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let folder = registry(&app)?.parent().ok_or("Invalid recovery path.")?.join("recovery");
        std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
        use sha2::{Digest, Sha256};
        let entries = project_store::entries(&registry(&app)?).unwrap_or_default();
        for document in documents {
            let id = project_store::validate(&document)?;
            if entries.iter().find(|entry| entry.id == id).and_then(|entry| project_store::read(&entry.path).ok()).is_some_and(|loaded| loaded.document["novel"] == document["novel"]) { continue; }
            let bytes = serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?;
            let name = format!("{:x}.json", Sha256::digest(&bytes));
            if !folder.join(&name).exists() { project_store::atomic_write(&folder.join(name), &bytes)?; }
        }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_disk_project(app: AppHandle, document: Value) -> Result<Option<Loaded>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        project_store::validate(&document)?;
        let mut picker = app.dialog().file().set_title("Choose where to create the project folder");
        let data = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        let settings = storage_settings::load(&data, &app.path().document_dir().map_err(|e| e.to_string())?)?;
        // Start in the saved default while preserving the per-project location chooser.
        if !settings.default_project_location.exists() { storage_settings::save(&data, &settings)?; }
        picker = picker.set_directory(&settings.default_project_location);
        let Some(parent) = picker.blocking_pick_folder() else { return Ok(None); };
        let parent = project_store::ensure_user_folder(&parent.into_path().map_err(|e| e.to_string())?)?;
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        backup_project(&app, &document)?;
        let loaded = project_store::create_at(&parent, &document)?;
        project_store::register(&registry(&app)?, &loaded)?;
        Ok(Some(loaded))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_disk_project(app: AppHandle) -> Result<Option<Loaded>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = app.dialog().file().set_title("Open project.json inside a .katchamak folder").add_filter("Katchamak project", &["json"]).blocking_pick_file() else { return Ok(None); };
        let path = path.into_path().map_err(|e| e.to_string())?;
        project_store::ensure_user_folder(path.parent().ok_or("Invalid project path.")?)?;
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let loaded = project_store::read(&path)?;
        project_store::register(&registry(&app)?, &loaded)?;
        Ok(Some(loaded))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn read_disk_project(app: AppHandle, id: String) -> Result<Loaded, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let entry = project_store::entries(&registry(&app)?)?.into_iter().find(|entry| entry.id == id).ok_or("Unknown project path.")?;
        project_store::read(&entry.path)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_disk_project(app: AppHandle, id: String, expected_revision: String, document: Value) -> Result<Loaded, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let current = project_store::entries(&registry(&app)?)?.into_iter().find(|entry| entry.id == id).ok_or("Unknown project path.")?;
        let loaded = project_store::read(&current.path)?;
        if loaded.revision != expected_revision { return Err("The project file changed outside Katchamak. Reopen or export before replacing the file.".into()); }
        if project_store::validate(&document)? != id { return Err("Project ID mismatch.".into()); }
        backup_project(&app, &loaded.document)?;
        backup_project(&app, &document)?;
        project_store::save(&registry(&app)?, &id, &expected_revision, &document)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn forget_disk_project(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        project_store::forget(&registry(&app)?, &id)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn migrate_disk_projects(app: AppHandle, documents: Vec<Value>) -> Result<Option<Vec<Loaded>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        for document in &documents { project_store::validate(document)?; }
        let Some(parent) = app.dialog().file().set_title("Choose a folder for your existing projects").blocking_pick_folder() else { return Ok(None); };
        let parent = project_store::ensure_user_folder(&parent.into_path().map_err(|e| e.to_string())?)?;
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let registry = registry(&app)?;
        let mut loaded = vec![];
        for document in documents {
            let existing = project_store::entries(&registry)?;
            if existing.iter().any(|entry| document["novel"]["id"] == entry.id) { continue; }
            let project = project_store::create_at(&parent, &document)?;
            project_store::register(&registry, &project)?;
            loaded.push(project);
        }
        Ok(Some(loaded))
    }).await.map_err(|e| e.to_string())?
}


fn settings(app: &AppHandle) -> Result<StorageSettings, String> {
    storage_settings::load(&app.path().app_local_data_dir().map_err(|e| e.to_string())?, &app.path().document_dir().map_err(|e| e.to_string())?)
}
fn backup_project(app: &AppHandle, document: &Value) -> Result<(), String> {
    storage_settings::backup(&app.path().app_local_data_dir().map_err(|e| e.to_string())?, document, settings(app)?.automatic_backups)
}

#[tauri::command]
pub async fn get_storage_settings(app: AppHandle) -> Result<StorageSettings, String> {
    tauri::async_runtime::spawn_blocking(move || { let _guard = IO.lock().map_err(|e| e.to_string())?; settings(&app) }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn set_storage_settings(app: AppHandle, settings: StorageSettings) -> Result<StorageSettings, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IO.lock().map_err(|e| e.to_string())?;
        let data = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        if settings.automatic_backups {
            for project in project_store::library(&registry(&app)?)?.projects { storage_settings::backup(&data, &project.document, true)?; }
        }
        storage_settings::save(&data, &settings)
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn browse_project_location(app: AppHandle) -> Result<Option<PathBuf>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let current = settings(&app)?;
        let mut picker = app.dialog().file().set_title("Default project location");
        if current.default_project_location.exists() { picker = picker.set_directory(&current.default_project_location); }
        let Some(path) = picker.blocking_pick_folder() else { return Ok(None); };
        Ok(Some(project_store::ensure_user_folder(&path.into_path().map_err(|e| e.to_string())?)?))
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn open_backups_folder(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let folder = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("backups");
        std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
        #[cfg(target_os = "windows")]
        { std::process::Command::new("explorer.exe").arg(&folder).spawn().map_err(|e| e.to_string())?; }
        #[cfg(not(target_os = "windows"))]
        { return Err("Opening the backups folder is supported in the Windows desktop app.".into()); }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}
