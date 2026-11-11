use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}};

static COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Serialize, Deserialize)]
pub struct Entry { pub id: String, pub path: PathBuf }

#[derive(Serialize)]
pub struct Loaded { pub path: PathBuf, pub revision: String, pub document: Value }

#[derive(Serialize)]
pub struct Library { pub projects: Vec<Loaded>, pub errors: Vec<String>, pub registered_ids: Vec<String> }

fn error(e: impl std::fmt::Display) -> String { e.to_string() }
fn revision(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }

pub fn validate(document: &Value) -> Result<&str, String> {
    if document["format"] != "katchamak-project" || document["version"] != 1 { return Err("Unsupported Katchamak project format.".into()); }
    let novel = &document["novel"];
    let id = novel["id"].as_str().filter(|id| !id.is_empty()).ok_or("Missing project ID.")?;
    fn tree(nodes: &Value) -> bool {
        nodes.as_array().is_some_and(|nodes| nodes.iter().all(|node| {
            ["id", "title", "kind"].iter().all(|key| node[key].is_string()) &&
            ["content", "synopsis", "notes", "status", "label"].iter().all(|key| node.get(key).is_none_or(Value::is_string)) && tree(&node["children"])
        }))
    }
    if !novel["title"].as_str().is_some_and(|s| !s.trim().is_empty()) ||
        !novel["cover"]["bg"].is_string() || !novel["cover"]["icon"].is_string() ||
        !novel["sections"].as_object().is_some_and(|sections| !sections.is_empty() && sections.values().all(tree)) ||
        !novel["trash"].as_array().is_some_and(|trash| trash.iter().all(|entry| entry["id"].is_string() && entry["section"].as_str().is_some_and(|section| novel["sections"].get(section).is_some()) && tree(&json!([entry["node"]])))) {
        return Err("Invalid project structure.".into());
    }
    Ok(id)
}

pub fn read(path: &Path) -> Result<Loaded, String> {
    let path = fs::canonicalize(path).map_err(error)?;
    if !path.is_file() { return Err("Select the project.json file inside a .katchamak folder.".into()); }
    let bytes = fs::read(&path).map_err(error)?;
    let document: Value = serde_json::from_slice(&bytes).map_err(error)?;
    validate(&document)?;
    Ok(Loaded { path, revision: revision(&bytes), document })
}

pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temp = path.with_extension(format!("{}.{}.tmp", std::process::id(), COUNTER.fetch_add(1, Ordering::SeqCst)));
    let result = (|| {
        let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&temp).map_err(error)?;
        file.write_all(bytes).map_err(error)?;
        file.sync_all().map_err(error)?;
        drop(file);
        if path.exists() { fs::copy(path, path.with_extension("json.bak")).map_err(error)?; }
        fs::rename(&temp, path).map_err(error)
    })();
    if result.is_err() { let _ = fs::remove_file(temp); }
    result
}

pub fn entries(registry: &Path) -> Result<Vec<Entry>, String> {
    if !registry.exists() { return Ok(vec![]); }
    serde_json::from_slice(&fs::read(registry).map_err(error)?).map_err(error)
}

pub fn register(registry: &Path, loaded: &Loaded) -> Result<(), String> {
    let id = validate(&loaded.document)?.to_owned();
    let mut all = entries(registry)?;
    all.retain(|entry| entry.id != id);
    all.push(Entry { id, path: loaded.path.clone() });
    fs::create_dir_all(registry.parent().ok_or("Invalid registry path.")?).map_err(error)?;
    atomic_write(registry, &serde_json::to_vec_pretty(&all).map_err(error)?)
}

pub fn library(registry: &Path) -> Result<Library, String> {
    let all = entries(registry)?;
    let registered_ids = all.iter().map(|entry| entry.id.clone()).collect();
    let mut projects = vec![];
    let mut errors = vec![];
    for entry in all {
        match read(&entry.path) {
            Ok(loaded) if loaded.document["novel"]["id"] == entry.id => projects.push(loaded),
            Ok(_) => errors.push(format!("{}: Project ID changed.", entry.path.display())),
            Err(e) => errors.push(format!("{}: {}", entry.path.display(), e)),
        }
    }
    Ok(Library { projects, errors, registered_ids })
}

pub fn ensure_user_folder(folder: &Path) -> Result<PathBuf, String> {
    let folder = fs::canonicalize(folder).map_err(error)?;
    let source = Path::new(env!("CARGO_MANIFEST_DIR")).parent().ok_or("Invalid source directory.")?;
    if folder.starts_with(source) || folder.ancestors().any(|p| p.join(".git").exists()) {
        return Err("Choose a project folder outside the application source repository.".into());
    }
    Ok(folder)
}

pub fn create_at(parent: &Path, document: &Value) -> Result<Loaded, String> {
    validate(document)?;
    let title = document["novel"]["title"].as_str().unwrap_or("Project");
    let title: String = title.chars().filter(|ch| !ch.is_control() && !"<>:\"/\\|?*".contains(*ch)).take(80).collect();
    let title = title.trim().trim_end_matches('.');
    let title = if title.is_empty() { "Project" } else { title };
    let mut folder = None;
    for suffix in 0..1000 {
        let name = if suffix == 0 { format!("{}.katchamak", title) } else { format!("{} ({}).katchamak", title, suffix + 1) };
        let candidate = parent.join(name);
        match fs::create_dir(&candidate) {
            Ok(()) => { folder = Some(candidate); break; },
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(error(e)),
        }
    }
    let path = folder.ok_or("Could not create a unique project folder.")?.join("project.json");
    atomic_write(&path, &serde_json::to_vec_pretty(document).map_err(error)?)?;
    read(&path)
}

pub fn save(registry: &Path, id: &str, expected: &str, document: &Value) -> Result<Loaded, String> {
    if validate(document)? != id { return Err("Project ID mismatch.".into()); }
    let entry = entries(registry)?.into_iter().find(|entry| entry.id == id).ok_or("Project has no registered file path.")?;
    let current = read(&entry.path)?;
    if current.revision != expected { return Err("The project file changed outside Katchamak. Your edit is kept in recovery storage; reopen or export it before replacing the file.".into()); }
    atomic_write(&entry.path, &serde_json::to_vec_pretty(document).map_err(error)?)?;
    read(&entry.path)
}

pub fn forget(registry: &Path, id: &str) -> Result<(), String> {
    let mut all = entries(registry)?;
    all.retain(|entry| entry.id != id);
    atomic_write(registry, &serde_json::to_vec_pretty(&all).map_err(error)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn projects_are_independent_files_and_external_edits_are_preserved() {
        let root = std::env::temp_dir().join(format!("katchamak-files-{}-{}", std::process::id(), COUNTER.fetch_add(1, Ordering::SeqCst)));
        fs::create_dir_all(&root).unwrap();
        let registry = root.join("appdata/recent-projects.json");
        let document = json!({"format":"katchamak-project", "version":1, "storeVersion":7, "novel":{"id":"test-id","title":"Test manuscript","cover":{"bg":"#333","icon":""},"sections":{"binder":[]},"trash":[]}});
        let first = create_at(&root, &document).unwrap();
        register(&registry, &first).unwrap();
        let second = create_at(&root, &document).unwrap();
        assert_ne!(first.path, second.path, "creating a project never overwrites an existing folder");
        let mut edited = document.clone(); edited["novel"]["title"] = json!("Edited title");
        let saved = save(&registry, "test-id", &first.revision, &edited).unwrap();
        assert_eq!(read(&first.path).unwrap().document, edited);
        assert_eq!(read(&first.path.with_extension("json.bak")).unwrap().document, document);
        assert!(save(&registry, "test-id", &first.revision, &document).is_err(), "stale writes are rejected");
        assert_eq!(library(&registry).unwrap().projects[0].revision, saved.revision, "a restarted session loads the file from its registered path");
        fs::write(&first.path, b"invalid JSON").unwrap();
        assert_eq!(library(&registry).unwrap().errors.len(), 1);
        assert!(save(&registry, "test-id", &saved.revision, &document).is_err());
        let mut invalid = document.clone(); invalid["novel"]["sections"]["binder"] = json!([{"id":"bad","title":"Bad","kind":"doc","children":"not a tree"}]);
        assert!(validate(&invalid).is_err(), "invalid trees cannot be registered as project files");
        forget(&registry, "test-id").unwrap();
        assert!(first.path.exists(), "removing a recent project never deletes its manuscript");
        assert!(entries(&registry).unwrap().is_empty());
        assert!(fs::canonicalize(&root).unwrap().starts_with(fs::canonicalize(std::env::temp_dir()).unwrap()));
        fs::remove_dir_all(&root).unwrap();
    }
}
