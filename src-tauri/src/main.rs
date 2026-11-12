#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod project_store;
mod disk_commands;
mod storage_settings;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![disk_commands::load_disk_projects, disk_commands::save_disk_recovery, disk_commands::create_disk_project, disk_commands::open_disk_project, disk_commands::read_disk_project, disk_commands::save_disk_project, disk_commands::forget_disk_project, disk_commands::migrate_disk_projects, disk_commands::get_storage_settings, disk_commands::set_storage_settings, disk_commands::browse_project_location, disk_commands::open_backups_folder])
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .run(tauri::generate_context!())
        .expect("Katchamak could not start");
}
