use crate::project_store;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};

#[derive(Clone, Serialize, Deserialize)]
pub struct StorageSettings {
    pub default_project_location: PathBuf,
    pub automatic_backups: bool,
}

pub fn load(data: &Path, documents: &Path) -> Result<StorageSettings, String> {
    let path = data.join("storage-settings.json");
    if !path.exists() { return Ok(StorageSettings { default_project_location: documents.join("Katchamak"), automatic_backups: true }); }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

pub fn save(data: &Path, settings: &StorageSettings) -> Result<StorageSettings, String> {
    if !settings.default_project_location.is_absolute() { return Err("Choose an absolute project folder path.".into()); }
    // Validate an existing ancestor before creating any directory, including paths in Git worktrees.
    let ancestor = settings.default_project_location.ancestors().find(|p| p.exists()).ok_or("Project drive is not available.")?;
    project_store::ensure_user_folder(ancestor)?;
    fs::create_dir_all(&settings.default_project_location).map_err(|e| e.to_string())?;
    let folder = project_store::ensure_user_folder(&settings.default_project_location)?;
    let settings = StorageSettings { default_project_location: folder, automatic_backups: settings.automatic_backups };
    fs::create_dir_all(data).map_err(|e| e.to_string())?;
    project_store::atomic_write(&data.join("storage-settings.json"), &serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?)?;
    Ok(settings)
}

pub fn backup(data: &Path, document: &serde_json::Value, enabled: bool) -> Result<(), String> {
    if !enabled { return Ok(()); }
    let id = project_store::validate(document)?;
    let folder = data.join("backups").join(format!("{:x}", Sha256::digest(id.as_bytes())));
    fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(document).map_err(|e| e.to_string())?;
    let hash = format!("{:x}", Sha256::digest(&bytes));
    let existing = fs::read_dir(&folder).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    if existing.iter().any(|entry| entry.file_name().to_string_lossy().ends_with(&format!("-{hash}.json"))) { return Ok(()); }
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
    project_store::atomic_write(&folder.join(format!("{stamp:025}-{hash}.json")), &bytes)?;
    let mut copies = fs::read_dir(&folder).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    copies.retain(|e| e.path().extension().is_some_and(|s| s == "json"));
    copies.sort_by_key(|e| e.file_name());
    let remove = copies.len().saturating_sub(20);
    for entry in copies.into_iter().take(remove) { fs::remove_file(entry.path()).map_err(|e| e.to_string())?; }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn settings_and_backup_retention_are_separate_from_manuscripts() {
        let root = std::env::temp_dir().join(format!("katchamak-settings-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&root).unwrap();
        let data = root.join("appdata");
        let defaults = load(&data, &root).unwrap();
        assert!(defaults.automatic_backups);
        let settings = save(&data, &defaults).unwrap();
        assert_eq!(load(&data, &root).unwrap().default_project_location, settings.default_project_location);
        assert!(save(&data, &StorageSettings { default_project_location: PathBuf::from("relative"), automatic_backups: true }).is_err());
        let mut doc = json!({"format":"katchamak-project","version":1,"novel":{"id":"test","title":"Test","cover":{"bg":"#333","icon":""},"sections":{"binder":[]},"trash":[]}});
        backup(&data, &doc, false).unwrap();
        assert!(!data.join("backups").exists());
        for i in 0..25 { doc["novel"]["title"] = json!(format!("Test {i}")); backup(&data, &doc, true).unwrap(); }
        let folder = fs::read_dir(data.join("backups")).unwrap().next().unwrap().unwrap().path();
        assert_eq!(fs::read_dir(&folder).unwrap().count(), 20);
        backup(&data, &doc, true).unwrap();
        assert_eq!(fs::read_dir(&folder).unwrap().count(), 20);
        for entry in fs::read_dir(&folder).unwrap() { project_store::read(&entry.unwrap().path()).unwrap(); }
        let source = Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap();
        assert!(save(&data, &StorageSettings { default_project_location: source.join("private-projects-test"), automatic_backups: true }).is_err());
        assert!(root.starts_with(std::env::temp_dir()));
        fs::remove_dir_all(root).unwrap();
    }
}
