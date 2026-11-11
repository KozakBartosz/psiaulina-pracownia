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
 let dir=section_path(&state,&section)?;let mut entries=Vec::new();for item in fs::read_dir(dir).map_err(err)?{let item=item.map_err(err)?;let name=item.file_name().to_string_lossy().into_owned();if item.file_type().map_err(err)?.is_file()&&name.to_lowercase().ends_with(".md") {let modified=item.metadata().map_err(err)?.modified().map_err(err)?.duration_since(UNIX_EPOCH).map_err(err)?.as_millis() as u64;entries.push(Entry{name,modified});}}
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
 if section=="wiedza" && old_name.as_deref()!=Some(name.as_str()) {return Err("Można edytować tylko istniejące pliki wiedzy, bez zmiany nazwy.".into())}
 let dir=document_dir(&state,&section,&name)?;let dest=file_path(&dir,document_name(&name))?;
 let old=old_name.as_ref().map(|n|file_path(&dir,document_name(n))).transpose()?;
 if let Some(ref source)=old {let current=fs::read_to_string(source).map_err(|_|"Plik został przeniesiony lub usunięty. Skopiuj swoje zmiany i otwórz go ponownie.".to_string())?;if Some(current)!=expected{return Err("Plik zmienił się na dysku. Skopiuj swoje zmiany i otwórz aktualną wersję, aby uniknąć nadpisania.".into())}}
 if old.as_ref()!=Some(&dest)&&dest.exists(){return Err("Plik o tej nazwie już istnieje.".into())}
 let mut temp=tempfile::NamedTempFile::new_in(&dir).map_err(err)?;temp.write_all(text.as_bytes()).map_err(err)?;temp.as_file().sync_all().map_err(err)?;
 if old.as_ref()==Some(&dest){temp.persist(&dest).map_err(err)?;}else{temp.persist_noclobber(&dest).map_err(err)?;if let Some(source)=old{if let Err(e)=fs::remove_file(source){return Err(format!("Nowy plik zapisano, ale nie usunięto poprzedniej nazwy: {e}"))}}}Ok(())
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
pub fn run(){tauri::Builder::default().plugin(tauri_plugin_dialog::init()).setup(|app|{let root=app.path().app_config_dir().ok().and_then(|p|fs::read_to_string(p.join("workspace.txt")).ok()).map(PathBuf::from).filter(|p|p.is_dir()).and_then(|p|p.canonicalize().ok());app.manage(Workspace(Mutex::new(root)));Ok(())}).invoke_handler(tauri::generate_handler![get_root,set_root,list_files,read_file,save_file,save_pdf,delete_summary]).run(tauri::generate_context!()).expect("Nie udało się uruchomić Psiauliny");}

#[cfg(test)]
mod tests {
 use super::*;
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
