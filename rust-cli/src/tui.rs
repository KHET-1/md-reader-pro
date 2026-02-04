//! TUI Module - Terminal User Interface with ratatui
//!
//! Provides interactive source/destination picker and analysis viewer.
//! Features: vim navigation, help overlay, file preview, search filter, themes.

#![cfg(feature = "tui")]

use std::io::{stdout, Read};
use std::path::PathBuf;
use std::fs::{self, File};
use std::time::Duration;

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind, KeyModifiers},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    prelude::*,
    widgets::*,
};

use crate::config::Config;
use crate::analyzer;
use crate::ro_lock::ReadOnlyLock;

/// Maximum bytes to read for file preview
const PREVIEW_MAX_BYTES: usize = 4096;
/// Event poll timeout in milliseconds
const POLL_TIMEOUT_MS: u64 = 50;
/// Maximum entries to load initially (lazy loading)
const LAZY_LOAD_LIMIT: usize = 500;

/// Color themes
#[derive(Debug, Clone, Copy, PartialEq)]
enum Theme {
    Dark,
    Light,
    Ocean,
}

impl Theme {
    fn next(self) -> Self {
        match self {
            Theme::Dark => Theme::Light,
            Theme::Light => Theme::Ocean,
            Theme::Ocean => Theme::Dark,
        }
    }

    fn name(self) -> &'static str {
        match self {
            Theme::Dark => "Dark",
            Theme::Light => "Light",
            Theme::Ocean => "Ocean",
        }
    }

    fn bg(self) -> Color {
        match self {
            Theme::Dark => Color::Reset,
            Theme::Light => Color::White,
            Theme::Ocean => Color::Rgb(13, 17, 23),
        }
    }

    fn fg(self) -> Color {
        match self {
            Theme::Dark => Color::White,
            Theme::Light => Color::Black,
            Theme::Ocean => Color::Rgb(201, 209, 217),
        }
    }

    fn accent(self) -> Color {
        match self {
            Theme::Dark => Color::Cyan,
            Theme::Light => Color::Blue,
            Theme::Ocean => Color::Rgb(88, 166, 255),
        }
    }

    fn highlight(self) -> Color {
        match self {
            Theme::Dark => Color::DarkGray,
            Theme::Light => Color::LightBlue,
            Theme::Ocean => Color::Rgb(33, 38, 45),
        }
    }

    fn dim(self) -> Color {
        match self {
            Theme::Dark => Color::Gray,
            Theme::Light => Color::DarkGray,
            Theme::Ocean => Color::Rgb(110, 118, 129),
        }
    }
}

/// File type filter
#[derive(Debug, Clone, PartialEq)]
enum FileFilter {
    All,
    Extension(String),
}

impl FileFilter {
    fn matches(&self, path: &PathBuf) -> bool {
        match self {
            FileFilter::All => true,
            FileFilter::Extension(ext) => {
                if path.is_dir() {
                    return true; // Always show directories
                }
                path.extension()
                    .map(|e| e.to_string_lossy().to_lowercase() == ext.to_lowercase())
                    .unwrap_or(false)
            }
        }
    }

    fn label(&self) -> String {
        match self {
            FileFilter::All => "All".to_string(),
            FileFilter::Extension(ext) => format!("*.{}", ext),
        }
    }
}

/// Input mode for the TUI
#[derive(Debug, Clone, Copy, PartialEq)]
enum InputMode {
    Normal,
    Search,
}

/// Application state
struct App {
    state: AppState,
    source: Option<String>,
    dest: Option<String>,
    current_dir: PathBuf,
    all_entries: Vec<PathBuf>,      // All entries in directory
    filtered_entries: Vec<PathBuf>, // Filtered view
    selected: usize,
    config: Config,
    message: Option<String>,
    show_help: bool,
    preview_content: Option<String>,
    scroll_offset: usize,
    // v4 UX additions
    theme: Theme,
    input_mode: InputMode,
    search_query: String,
    file_filter: FileFilter,
    filter_extensions: Vec<String>,
    filter_index: usize,
    // v5 Performance
    is_large_dir: bool,
    total_entries: usize,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum AppState {
    SelectSource,
    SelectDest,
    Analyzing,
    Results,
    Error,
}

impl App {
    fn new(config: Config) -> Self {
        let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("/"));
        let (all_entries, is_large, total) = list_dir_lazy(&current_dir, LAZY_LOAD_LIMIT);

        Self {
            state: AppState::SelectSource,
            source: None,
            dest: None,
            current_dir,
            all_entries: all_entries.clone(),
            filtered_entries: all_entries,
            selected: 0,
            config,
            message: None,
            show_help: false,
            preview_content: None,
            scroll_offset: 0,
            theme: Theme::Dark,
            input_mode: InputMode::Normal,
            search_query: String::new(),
            file_filter: FileFilter::All,
            filter_extensions: vec![
                "rs".to_string(),
                "md".to_string(),
                "toml".to_string(),
                "json".to_string(),
                "txt".to_string(),
            ],
            filter_index: 0,
            is_large_dir: is_large,
            total_entries: total,
        }
    }

    fn refresh_entries(&mut self) {
        let (entries, is_large, total) = list_dir_lazy(&self.current_dir, LAZY_LOAD_LIMIT);
        self.all_entries = entries;
        self.is_large_dir = is_large;
        self.total_entries = total;
        self.apply_filters();
        self.selected = 0;
        self.scroll_offset = 0;
        self.update_preview();
    }

    fn apply_filters(&mut self) {
        let query = self.search_query.to_lowercase();
        self.filtered_entries = self.all_entries
            .iter()
            .filter(|p| {
                // Apply file filter
                if !self.file_filter.matches(p) {
                    return false;
                }
                // Apply search query
                if query.is_empty() {
                    return true;
                }
                p.file_name()
                    .map(|n| n.to_string_lossy().to_lowercase().contains(&query))
                    .unwrap_or(false)
            })
            .cloned()
            .collect();

        // Reset selection if out of bounds
        if self.selected >= self.filtered_entries.len() {
            self.selected = self.filtered_entries.len().saturating_sub(1);
        }
    }

    fn update_preview(&mut self) {
        if let Some(path) = self.filtered_entries.get(self.selected) {
            if path.is_file() {
                self.preview_content = read_file_preview(path);
            } else {
                let count = fs::read_dir(path).map(|rd| rd.count()).unwrap_or(0);
                self.preview_content = Some(format!(
                    "📁 Directory\n\n{} items\n\nPress Enter to navigate",
                    count
                ));
            }
        } else {
            self.preview_content = None;
        }
    }

    fn select_current(&mut self) {
        if let Some(path) = self.filtered_entries.get(self.selected).cloned() {
            if path.is_dir() {
                self.current_dir = path;
                self.search_query.clear();
                self.refresh_entries();
            } else {
                match self.state {
                    AppState::SelectSource => {
                        self.source = Some(path.display().to_string());
                        self.state = AppState::SelectDest;
                        self.message = Some(format!("✅ Source: {}", path.display()));
                    }
                    AppState::SelectDest => {
                        self.dest = Some(path.display().to_string());
                        self.message = Some(format!(
                            "✅ Source: {} | Dest: {} | Press 'a' to analyze",
                            self.source.as_deref().unwrap_or("?"),
                            path.display()
                        ));
                    }
                    _ => {}
                }
            }
        }
    }

    fn go_up(&mut self) {
        if let Some(parent) = self.current_dir.parent() {
            self.current_dir = parent.to_path_buf();
            self.search_query.clear();
            self.refresh_entries();
        }
    }

    fn move_selection(&mut self, delta: i32) {
        let len = self.filtered_entries.len();
        if len == 0 {
            return;
        }

        self.selected = if delta > 0 {
            (self.selected + delta as usize).min(len - 1)
        } else {
            self.selected.saturating_sub((-delta) as usize)
        };
        self.update_preview();
    }

    fn goto_start(&mut self) {
        self.selected = 0;
        self.scroll_offset = 0;
        self.update_preview();
    }

    fn goto_end(&mut self) {
        if !self.filtered_entries.is_empty() {
            self.selected = self.filtered_entries.len() - 1;
        }
        self.update_preview();
    }

    fn page_down(&mut self, page_size: usize) {
        let len = self.filtered_entries.len();
        if len == 0 {
            return;
        }
        self.selected = (self.selected + page_size).min(len - 1);
        self.update_preview();
    }

    fn page_up(&mut self, page_size: usize) {
        self.selected = self.selected.saturating_sub(page_size);
        self.update_preview();
    }

    fn toggle_help(&mut self) {
        self.show_help = !self.show_help;
    }

    fn cycle_theme(&mut self) {
        self.theme = self.theme.next();
        self.message = Some(format!("🎨 Theme: {}", self.theme.name()));
    }

    fn cycle_filter(&mut self) {
        self.filter_index = (self.filter_index + 1) % (self.filter_extensions.len() + 1);
        self.file_filter = if self.filter_index == 0 {
            FileFilter::All
        } else {
            FileFilter::Extension(self.filter_extensions[self.filter_index - 1].clone())
        };
        self.apply_filters();
        self.message = Some(format!("🔍 Filter: {}", self.file_filter.label()));
        self.update_preview();
    }

    fn enter_search_mode(&mut self) {
        self.input_mode = InputMode::Search;
        self.search_query.clear();
    }

    fn exit_search_mode(&mut self) {
        self.input_mode = InputMode::Normal;
    }

    fn handle_search_input(&mut self, c: char) {
        self.search_query.push(c);
        self.apply_filters();
        self.update_preview();
    }

    fn handle_search_backspace(&mut self) {
        self.search_query.pop();
        self.apply_filters();
        self.update_preview();
    }

    fn clear_search(&mut self) {
        self.search_query.clear();
        self.apply_filters();
        self.update_preview();
    }
}

/// Read first N bytes of a file for preview
fn read_file_preview(path: &PathBuf) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut buffer = vec![0u8; PREVIEW_MAX_BYTES];
    let bytes_read = file.read(&mut buffer).ok()?;
    buffer.truncate(bytes_read);

    let content = String::from_utf8_lossy(&buffer).to_string();

    // Check if file is likely binary
    if content.chars().take(512).filter(|c| c.is_control() && *c != '\n' && *c != '\r' && *c != '\t').count() > 10 {
        let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        return Some(format!(
            "📦 Binary file\n\nSize: {} bytes\n\nPreview not available",
            size
        ));
    }

    let truncated = if bytes_read == PREVIEW_MAX_BYTES {
        format!("{}\n\n... (truncated)", content)
    } else {
        content
    };

    Some(truncated)
}

/// List directory with lazy loading for large directories
fn list_dir_lazy(path: &PathBuf, limit: usize) -> (Vec<PathBuf>, bool, usize) {
    let read_dir = match fs::read_dir(path) {
        Ok(rd) => rd,
        Err(_) => return (vec![], false, 0),
    };

    let mut entries: Vec<PathBuf> = Vec::new();
    let mut total_count = 0;

    for entry in read_dir.filter_map(|e| e.ok()) {
        total_count += 1;
        if entries.len() < limit {
            entries.push(entry.path());
        }
    }

    let is_large = total_count > limit;

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_dir(), b.is_dir()) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    (entries, is_large, total_count)
}

/// Legacy list_dir for compatibility
fn list_dir(path: &PathBuf) -> Vec<PathBuf> {
    list_dir_lazy(path, usize::MAX).0
}

/// Run the TUI application
pub async fn run(config: Config) -> Result<()> {
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    let mut app = App::new(config);
    app.update_preview();
    let result = run_app(&mut terminal, &mut app).await;

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    result
}

async fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    loop {
        let area = terminal.size()?;
        let page_size = (area.height as usize).saturating_sub(8);

        terminal.draw(|f| ui(f, app))?;

        if event::poll(Duration::from_millis(POLL_TIMEOUT_MS))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }

                // Help overlay intercepts all keys
                if app.show_help {
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc | KeyCode::Char('?') => {
                            app.show_help = false;
                        }
                        _ => {}
                    }
                    continue;
                }

                // Search mode input handling
                if app.input_mode == InputMode::Search {
                    match key.code {
                        KeyCode::Esc => app.exit_search_mode(),
                        KeyCode::Enter => app.exit_search_mode(),
                        KeyCode::Backspace => app.handle_search_backspace(),
                        KeyCode::Char(c) => app.handle_search_input(c),
                        _ => {}
                    }
                    continue;
                }

                // Normal mode
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                    KeyCode::Char('?') => app.toggle_help(),

                    // Search & Filter
                    KeyCode::Char('/') => app.enter_search_mode(),
                    KeyCode::Char('f') => app.cycle_filter(),
                    KeyCode::Char('c') => app.clear_search(),

                    // Theme
                    KeyCode::Char('t') => app.cycle_theme(),

                    // Navigation
                    KeyCode::Up | KeyCode::Char('k') => app.move_selection(-1),
                    KeyCode::Down | KeyCode::Char('j') => app.move_selection(1),
                    KeyCode::Char('g') => app.goto_start(),
                    KeyCode::Char('G') => app.goto_end(),
                    KeyCode::PageUp => app.page_up(page_size),
                    KeyCode::PageDown => app.page_down(page_size),
                    KeyCode::Char('d') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                        app.page_down(page_size / 2);
                    }
                    KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                        app.page_up(page_size / 2);
                    }

                    // Directory navigation
                    KeyCode::Enter | KeyCode::Char('l') => app.select_current(),
                    KeyCode::Backspace | KeyCode::Char('h') => app.go_up(),

                    // Analyze
                    KeyCode::Char('a') if app.source.is_some() && app.dest.is_some() => {
                        app.state = AppState::Analyzing;
                        app.message = Some("⏳ Analyzing...".to_string());
                        terminal.draw(|f| ui(f, app))?;

                        let source = app.source.as_ref().unwrap();
                        let dest = app.dest.as_ref().unwrap();

                        match run_analysis(source, dest, &app.config).await {
                            Ok(summary) => {
                                app.state = AppState::Results;
                                app.message = Some(summary);
                            }
                            Err(e) => {
                                app.state = AppState::Error;
                                app.message = Some(format!("❌ Error: {}", e));
                            }
                        }
                    }

                    // Reset
                    KeyCode::Char('r') => {
                        app.source = None;
                        app.dest = None;
                        app.state = AppState::SelectSource;
                        app.message = Some("🔄 Selection reset".to_string());
                    }

                    _ => {}
                }
            }
        }
    }
}

async fn run_analysis(source: &str, dest: &str, config: &Config) -> Result<String> {
    let _lock = ReadOnlyLock::acquire(source).await?;
    let results = analyzer::analyze(source, config).await?;
    let summary = format!(
        "✅ Analyzed {} files ({} bytes) → {}",
        results.total_files, results.total_size, dest
    );
    analyzer::export(&results, dest).await?;
    Ok(summary)
}

fn ui(frame: &mut Frame, app: &App) {
    let theme = app.theme;

    // Clear with background color
    let bg_block = Block::default().style(Style::default().bg(theme.bg()));
    frame.render_widget(bg_block, frame.area());

    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
            Constraint::Length(1),  // Search bar (when active)
            Constraint::Min(10),    // Content
            Constraint::Length(3),  // Status
        ])
        .split(frame.area());

    // Header
    let title = match app.state {
        AppState::SelectSource => "📂 Select Source File",
        AppState::SelectDest => "📂 Select Destination",
        AppState::Analyzing => "⏳ Analyzing...",
        AppState::Results => "✅ Analysis Complete",
        AppState::Error => "❌ Error",
    };

    let header_text = format!(
        "{} | Theme: {} | Filter: {} | ? for help",
        title, theme.name(), app.file_filter.label()
    );

    let header = Paragraph::new(header_text)
        .style(Style::default().fg(theme.accent()).add_modifier(Modifier::BOLD))
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.dim()))
            .title("💎 Diamond Drill"));
    frame.render_widget(header, main_chunks[0]);

    // Search bar
    let search_style = if app.input_mode == InputMode::Search {
        Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(theme.dim())
    };

    let search_text = if app.search_query.is_empty() {
        if app.input_mode == InputMode::Search {
            "Type to search...".to_string()
        } else {
            "Press / to search".to_string()
        }
    } else {
        format!("🔍 {}", app.search_query)
    };

    let search_bar = Paragraph::new(search_text).style(search_style);
    frame.render_widget(search_bar, main_chunks[1]);

    // Content
    let content_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(main_chunks[2]);

    // File list
    let items: Vec<ListItem> = app.filtered_entries.iter().enumerate().map(|(i, path)| {
        let icon = if path.is_dir() { "📁" } else { "📄" };
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.display().to_string());

        let style = if i == app.selected {
            Style::default().bg(theme.highlight()).fg(theme.fg()).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme.fg())
        };

        ListItem::new(format!("{} {}", icon, name)).style(style)
    }).collect();

    let position_info = if app.filtered_entries.is_empty() {
        "(empty)".to_string()
    } else if app.is_large_dir {
        format!("{}/{} ({}+ total)", app.selected + 1, app.filtered_entries.len(), app.total_entries)
    } else {
        format!("{}/{}", app.selected + 1, app.filtered_entries.len())
    };

    let list = List::new(items)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.dim()))
            .title(format!("📂 {} [{}]", app.current_dir.display(), position_info)))
        .highlight_style(Style::default().bg(theme.highlight()).add_modifier(Modifier::BOLD))
        .highlight_symbol("▶ ");

    let mut state = ListState::default();
    state.select(Some(app.selected));
    frame.render_stateful_widget(list, content_chunks[0], &mut state);

    // Preview pane
    let preview_text = app.preview_content.as_deref().unwrap_or("No preview available");
    let preview = Paragraph::new(preview_text)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.dim()))
            .title("📋 Preview"))
        .wrap(Wrap { trim: false })
        .style(Style::default().fg(theme.dim()));
    frame.render_widget(preview, content_chunks[1]);

    // Status bar
    let status = if let Some(ref msg) = app.message {
        msg.clone()
    } else {
        format!(
            "Source: {} │ Dest: {}",
            app.source.as_deref().unwrap_or("(none)"),
            app.dest.as_deref().unwrap_or("(none)")
        )
    };

    let status_bar = Paragraph::new(status)
        .style(Style::default().fg(Color::Yellow))
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.dim()))
            .title("Status"));
    frame.render_widget(status_bar, main_chunks[3]);

    // Help overlay
    if app.show_help {
        render_help_overlay(frame, theme);
    }
}

fn render_help_overlay(frame: &mut Frame, theme: Theme) {
    let area = frame.area();

    let help_width = 65;
    let help_height = 24;
    let help_area = Rect {
        x: area.width.saturating_sub(help_width) / 2,
        y: area.height.saturating_sub(help_height) / 2,
        width: help_width.min(area.width),
        height: help_height.min(area.height),
    };

    let overlay = Block::default().style(Style::default().bg(Color::Black));
    frame.render_widget(overlay, area);

    let help_text = vec![
        Line::from(Span::styled("KEYBOARD SHORTCUTS", Style::default().add_modifier(Modifier::BOLD).fg(theme.accent()))),
        Line::from(""),
        Line::from(Span::styled("Navigation", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  j/↓         Move down"),
        Line::from("  k/↑         Move up"),
        Line::from("  g           Go to first item"),
        Line::from("  G           Go to last item"),
        Line::from("  Ctrl+d/u    Half page down/up"),
        Line::from("  PgDn/PgUp   Full page scroll"),
        Line::from(""),
        Line::from(Span::styled("Search & Filter", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  /           Enter search mode (type to filter)"),
        Line::from("  f           Cycle file type filter (*.rs, *.md, etc)"),
        Line::from("  c           Clear search query"),
        Line::from(""),
        Line::from(Span::styled("Actions", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  Enter/l     Select / Enter directory"),
        Line::from("  Backspace/h Go to parent directory"),
        Line::from("  a           Analyze (when both selected)"),
        Line::from("  r           Reset selection"),
        Line::from("  t           Cycle theme (Dark/Light/Ocean)"),
        Line::from("  ?           Toggle this help"),
        Line::from("  q/Esc       Quit"),
    ];

    let help = Paragraph::new(help_text)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme.accent()))
            .title("💎 Help")
            .title_style(Style::default().add_modifier(Modifier::BOLD)))
        .style(Style::default().bg(Color::Black).fg(Color::White))
        .alignment(Alignment::Left);

    frame.render_widget(help, help_area);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_dir() {
        let temp = tempfile::tempdir().unwrap();
        std::fs::write(temp.path().join("file.txt"), "content").unwrap();
        std::fs::create_dir(temp.path().join("subdir")).unwrap();

        let entries = list_dir(&temp.path().to_path_buf());
        assert_eq!(entries.len(), 2);
        assert!(entries[0].is_dir());
    }

    #[test]
    fn test_app_move_selection() {
        let config = Config::default();
        let mut app = App::new(config);
        app.all_entries = vec![
            PathBuf::from("/a"),
            PathBuf::from("/b"),
            PathBuf::from("/c"),
        ];
        app.filtered_entries = app.all_entries.clone();

        app.move_selection(1);
        assert_eq!(app.selected, 1);

        app.move_selection(1);
        assert_eq!(app.selected, 2);

        app.move_selection(1);
        assert_eq!(app.selected, 2);
    }

    #[test]
    fn test_app_goto_navigation() {
        let config = Config::default();
        let mut app = App::new(config);
        app.all_entries = vec![
            PathBuf::from("/a"),
            PathBuf::from("/b"),
            PathBuf::from("/c"),
        ];
        app.filtered_entries = app.all_entries.clone();

        app.goto_end();
        assert_eq!(app.selected, 2);

        app.goto_start();
        assert_eq!(app.selected, 0);
    }

    #[test]
    fn test_app_page_navigation() {
        let config = Config::default();
        let mut app = App::new(config);
        app.all_entries = (0..50).map(|i| PathBuf::from(format!("/file{}", i))).collect();
        app.filtered_entries = app.all_entries.clone();

        app.page_down(10);
        assert_eq!(app.selected, 10);

        app.page_down(10);
        assert_eq!(app.selected, 20);

        app.page_up(5);
        assert_eq!(app.selected, 15);
    }

    #[test]
    fn test_toggle_help() {
        let config = Config::default();
        let mut app = App::new(config);

        assert!(!app.show_help);
        app.toggle_help();
        assert!(app.show_help);
        app.toggle_help();
        assert!(!app.show_help);
    }

    #[test]
    fn test_read_file_preview() {
        let temp = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(temp.path(), "Hello, preview!").unwrap();

        let preview = read_file_preview(&temp.path().to_path_buf());
        assert!(preview.is_some());
        assert!(preview.unwrap().contains("Hello, preview!"));
    }

    #[test]
    fn test_theme_cycle() {
        let config = Config::default();
        let mut app = App::new(config);

        assert_eq!(app.theme, Theme::Dark);
        app.cycle_theme();
        assert_eq!(app.theme, Theme::Light);
        app.cycle_theme();
        assert_eq!(app.theme, Theme::Ocean);
        app.cycle_theme();
        assert_eq!(app.theme, Theme::Dark);
    }

    #[test]
    fn test_file_filter() {
        let filter = FileFilter::Extension("rs".to_string());
        assert!(filter.matches(&PathBuf::from("/foo/bar.rs")));
        assert!(!filter.matches(&PathBuf::from("/foo/bar.txt")));

        // Directories always match
        let temp = tempfile::tempdir().unwrap();
        assert!(filter.matches(&temp.path().to_path_buf()));
    }

    #[test]
    fn test_search_filter() {
        let config = Config::default();
        let mut app = App::new(config);
        app.all_entries = vec![
            PathBuf::from("/apple.txt"),
            PathBuf::from("/banana.rs"),
            PathBuf::from("/cherry.md"),
        ];
        app.filtered_entries = app.all_entries.clone();

        app.search_query = "an".to_string();
        app.apply_filters();
        assert_eq!(app.filtered_entries.len(), 1);
        assert!(app.filtered_entries[0].to_string_lossy().contains("banana"));
    }

    #[test]
    fn test_lazy_loading() {
        let temp = tempfile::tempdir().unwrap();
        for i in 0..10 {
            std::fs::write(temp.path().join(format!("file{}.txt", i)), "content").unwrap();
        }

        let (entries, is_large, total) = list_dir_lazy(&temp.path().to_path_buf(), 5);
        assert_eq!(entries.len(), 5);
        assert!(is_large);
        assert_eq!(total, 10);
    }
}
