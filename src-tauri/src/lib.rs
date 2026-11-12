use std::{fs, io::Write, path::{Path, PathBuf}, sync::Mutex, time::UNIX_EPOCH};
use tauri::{Manager, State};
struct Workspace(Mutex<Option<PathBuf>>);
#[derive(serde::Serialize)]
struct Entry { name: String, modified: u64 }
fn err(e: impl std::fmt::Display) -> String { e.to_string() }
fn section_path(state: &Workspace, section: &str) -> Result<PathBuf,String> {
 if !["podsumowania","wiedza","szablon"].contains(&section) { return Err("Nieznana zakładka".into()); }
 let guard = state.0.lock().map_err(err)?;
 let root = guard.as_ref().ok_or("Wybierz folder materiałów")?;
 let dir = root.join(section); fs::create_dir_all(&dir).map_err(err)?;
 let canonical = dir.canonicalize().map_err(err)?;
 if !canonical.starts_with(root) {return Err("Folder wychodzi poza wybrany katalog".into())} Ok(canonical)
}
fn file_path(dir: &Path,name: &str)->Result<PathBuf,String>{
 if name.is_empty() || !name.to_lowercase().ends_with(".md") || name.chars().any(|c| c.is_control() || "<>:\"/\\|?*".contains(c)) || name.ends_with(' ') || name.starts_with('.') {return Err("Niepoprawna nazwa pliku Markdown".into())}
 let path=dir.join(name); if path.exists() && !path.canonicalize().map_err(err)?.starts_with(dir) {return Err("Plik wychodzi poza katalog".into())} Ok(path)
}
const ROOT_AGENTS: &str = "@root/AGENTS.md";
fn document_dir(state: &Workspace, section: &str, name: &str) -> Result<PathBuf,String> {
 if name != ROOT_AGENTS {return section_path(state,section)}
 if section != "wiedza" {return Err("Instrukcje są dostępne w zakładce Wiedza".into())}
 state.0.lock().map_err(err)?.clone().ok_or("Wybierz folder materiałów".into())
}
fn document_name(name: &str) -> &str {if name==ROOT_AGENTS {"AGENTS.md"} else {name}}
const BACKUP_FORMAT: &str = "%Y-%m-%d_%H-%M-%S%.9fZ";

fn backup_prefix(name: &str) -> String {
 format!("{}_backup_", &name[..name.len()-3])
}

fn backup_date(name: &str) -> Option<chrono::DateTime<chrono::Utc>> {
 let (_, timestamp) = name.strip_suffix(".md")?.rsplit_once("_backup_")?;
 chrono::NaiveDateTime::parse_from_str(timestamp, BACKUP_FORMAT).ok().map(|date| date.and_utc())
}

#[tauri::command]
fn list_versions(state: State<Workspace>, section: String, name: String) -> Result<Vec<Entry>, String> {
 let dir = document_dir(&state, &section, &name)?;
 let name = document_name(&name);
 file_path(&dir, name)?;
 let prefix = backup_prefix(name);
 let mut entries = Vec::new();
 for item in fs::read_dir(dir).map_err(err)? {
  let item = item.map_err(err)?;
  let name = item.file_name().to_string_lossy().into_owned();
  if name.starts_with(&prefix) && item.file_type().map_err(err)?.is_file() {
   if let Some(date) = backup_date(&name) {
    if name == format!("{prefix}{}.md", date.format(BACKUP_FORMAT)) {
     entries.push(Entry {name, modified: date.timestamp_millis() as u64});
    }
   }
  }
 }
 entries.sort_by(|a,b| b.name.cmp(&a.name));
 Ok(entries)
}

#[tauri::command]
fn read_version(state: State<Workspace>, section: String, name: String, version: String) -> Result<String, String> {
 let dir = document_dir(&state, &section, &name)?;
 let name = document_name(&name);
 file_path(&dir, name)?;
 let date = backup_date(&version).ok_or("Niepoprawna nazwa kopii zapasowej")?;
 if version != format!("{}{}.md", backup_prefix(name), date.format(BACKUP_FORMAT)) {
  return Err("Kopia zapasowa należy do innego dokumentu".into());
 }
 fs::read_to_string(file_path(&dir, &version)?).map_err(err)
}

#[tauri::command]
fn get_root(state:State<Workspace>)->Result<Option<String>,String>{Ok(state.0.lock().map_err(err)?.as_ref().map(|p|p.to_string_lossy().into_owned()))}
#[tauri::command]
fn set_root(app:tauri::AppHandle,state:State<Workspace>,path:String)->Result<String,String>{
 let root=PathBuf::from(path).canonicalize().map_err(err)?;if !root.is_dir(){return Err("Wybierz katalog".into())}
 for section in ["podsumowania","wiedza","szablon"] {let dir=root.join(section);fs::create_dir_all(&dir).map_err(err)?;if !dir.canonicalize().map_err(err)?.starts_with(&root){return Err("Folder jest dowiązaniem poza katalog materiałów".into())}}
 let config=app.path().app_config_dir().map_err(err)?;fs::create_dir_all(&config).map_err(err)?;fs::write(config.join("workspace.txt"),root.to_string_lossy().as_bytes()).map_err(err)?;
 *state.0.lock().map_err(err)?=Some(root.clone());Ok(root.to_string_lossy().into_owned())
}
#[tauri::command]
fn list_files(state:State<Workspace>,section:String)->Result<Vec<Entry>,String>{
 let dir=section_path(&state,&section)?;let mut entries=Vec::new();for item in fs::read_dir(dir).map_err(err)?{let item=item.map_err(err)?;let name=item.file_name().to_string_lossy().into_owned();if item.file_type().map_err(err)?.is_file()&&name.to_lowercase().ends_with(".md")&&backup_date(&name).is_none() {let modified=item.metadata().map_err(err)?.modified().map_err(err)?.duration_since(UNIX_EPOCH).map_err(err)?.as_millis() as u64;entries.push(Entry{name,modified});}}
 if section=="wiedza" {
  let root=document_dir(&state,&section,ROOT_AGENTS)?;
  let path=file_path(&root,"AGENTS.md")?;
  if path.is_file(){let modified=path.metadata().map_err(err)?.modified().map_err(err)?.duration_since(UNIX_EPOCH).map_err(err)?.as_millis() as u64;entries.push(Entry{name:ROOT_AGENTS.into(),modified});}
 }
 Ok(entries)
}
#[tauri::command]
fn read_file(state:State<Workspace>,section:String,name:String)->Result<String,String>{fs::read_to_string(file_path(&document_dir(&state,&section,&name)?,document_name(&name))?).map_err(err)}
#[tauri::command]
fn save_file(state:State<Workspace>,section:String,old_name:Option<String>,name:String,text:String,expected:Option<String>)->Result<(),String>{
 save_document(&state, &section, old_name.as_deref(), &name, &text, expected.as_deref())
}

fn save_document(state: &Workspace, section: &str, old_name: Option<&str>, name: &str, text: &str, expected: Option<&str>) -> Result<(), String> {
 if section=="wiedza" && old_name!=Some(name) {return Err("Można edytować tylko istniejące pliki wiedzy, bez zmiany nazwy.".into())}
 let dir=document_dir(state,section,name)?;let dest=file_path(&dir,document_name(name))?;
 let old=old_name.map(|n|file_path(&dir,document_name(n))).transpose()?;
 if let Some(ref source)=old {let current=fs::read_to_string(source).map_err(|_|"Plik został przeniesiony lub usunięty. Skopiuj swoje zmiany i otwórz go ponownie.".to_string())?;if Some(current.as_str())!=expected{return Err("Plik zmienił się na dysku. Skopiuj swoje zmiany i otwórz aktualną wersję, aby uniknąć nadpisania.".into())}}
 if old.as_ref()!=Some(&dest)&&dest.exists(){return Err("Plik o tej nazwie już istnieje.".into())}
 let mut temp=tempfile::NamedTempFile::new_in(&dir).map_err(err)?;temp.write_all(text.as_bytes()).map_err(err)?;temp.as_file().sync_all().map_err(err)?;
 if backup_date(document_name(name)).is_some() {return Err("Ta nazwa jest zarezerwowana dla kopii zapasowych.".into())}
 let timestamp = chrono::Utc::now().format(BACKUP_FORMAT);
 let backup = file_path(&dir, &format!("{}{timestamp}.md", backup_prefix(document_name(name))))?;
 let mut snapshot = tempfile::NamedTempFile::new_in(&dir).map_err(err)?;
 snapshot.write_all(text.as_bytes()).map_err(err)?;
 snapshot.as_file().sync_all().map_err(err)?;
 snapshot.persist_noclobber(&backup).map_err(err)?;

 let result = if old.as_ref() == Some(&dest) {temp.persist(&dest)} else {temp.persist_noclobber(&dest)};
 if let Err(error) = result {
  fs::remove_file(&backup).map_err(|cleanup| format!("{error}. Nie usunięto kopii zapasowej: {cleanup}"))?;
  return Err(err(error));
 }
 if let Some(source) = old.filter(|source| source != &dest) {
  fs::remove_file(source).map_err(|e| format!("Nowy plik zapisano, ale nie usunięto poprzedniej nazwy: {e}"))?;
 }
 Ok(())
}
#[tauri::command]
fn delete_summary(state:State<Workspace>,name:String,expected:String)->Result<(),String>{
 let dir=section_path(&state,"podsumowania")?;
 let path=file_path(&dir,&name)?;
 let current=fs::read_to_string(&path).map_err(err)?;
 if current!=expected{return Err("Plik zmienił się na dysku. Otwórz go ponownie przed usunięciem.".into())}
 trash::delete(&path).map_err(err)
}
#[tauri::command]
fn save_pdf(path:String,bytes:Vec<u8>)->Result<(),String>{let path=PathBuf::from(path);if path.extension().and_then(|e|e.to_str()).map(|e|e.to_lowercase())!=Some("pdf".into()){return Err("Wybierz plik z rozszerzeniem .pdf".into())}let mut temp=tempfile::NamedTempFile::new_in(path.parent().ok_or("Niepoprawna ścieżka")?).map_err(err)?;temp.write_all(&bytes).map_err(err)?;temp.persist(path).map_err(err)?;Ok(())}
pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).setup(|app|{let root=app.path().app_config_dir().ok().and_then(|p|fs::read_to_string(p.join("workspace.txt")).ok()).map(PathBuf::from).filter(|p|p.is_dir()).and_then(|p|p.canonicalize().ok());app.manage(Workspace(Mutex::new(root)));Ok(())}).invoke_handler(tauri::generate_handler![get_root,set_root,list_files,read_file,list_versions,read_version,save_file,save_pdf,delete_summary]).run(tauri::generate_context!()).expect("Nie udało się uruchomić Psiauliny");}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn saves_the_written_content_in_a_separate_timestamped_copy() {
  let temp = tempfile::tempdir().unwrap();
  let state = Workspace(Mutex::new(Some(temp.path().canonicalize().unwrap())));
  let name = "Próba.md";
  save_document(&state, "podsumowania", None, name, "Pierwszy zapis", None).unwrap();
  save_document(&state, "podsumowania", Some(name), name, "Drugi zapis", Some("Pierwszy zapis")).unwrap();
  assert!(save_document(&state, "podsumowania", Some(name), name, "Konflikt", Some("Pierwszy zapis")).is_err());
  let dir = section_path(&state, "podsumowania").unwrap();
  assert_eq!(fs::read_to_string(dir.join(name)).unwrap(), "Drugi zapis");
  let mut copies = Vec::new();
  for item in fs::read_dir(dir).unwrap() {
   let item = item.unwrap();
   let filename = item.file_name();
   let filename = filename.to_str().unwrap();
   if filename == name {continue}
   assert!(filename.starts_with("Próba_backup_"));
   assert!(backup_date(filename).is_some());
   copies.push(fs::read_to_string(item.path()).unwrap());
  }
  copies.sort();
  assert_eq!(copies, ["Drugi zapis", "Pierwszy zapis"]);
 }
 #[test]
 fn root_instructions_are_separate_from_knowledge_files() {
  let temp=tempfile::tempdir().unwrap();
  let root=temp.path().canonicalize().unwrap();
  let state=Workspace(Mutex::new(Some(root.clone())));
  fs::write(root.join("AGENTS.md"),"root instructions").unwrap();
  let knowledge=section_path(&state,"wiedza").unwrap();
  fs::write(knowledge.join("AGENTS.md"),"local instructions").unwrap();
  let dir=document_dir(&state,"wiedza",ROOT_AGENTS).unwrap();
  assert_eq!(fs::read_to_string(file_path(&dir,document_name(ROOT_AGENTS)).unwrap()).unwrap(),"root instructions");
  let dir=document_dir(&state,"wiedza","AGENTS.md").unwrap();
  assert_eq!(fs::read_to_string(file_path(&dir,"AGENTS.md").unwrap()).unwrap(),"local instructions");
  assert!(document_dir(&state,"podsumowania",ROOT_AGENTS).is_err());
  assert!(file_path(&root,"../AGENTS.md").is_err());
 }
}
