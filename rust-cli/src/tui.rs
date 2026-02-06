//! TUI Module - Terminal User Interface with ratatui
//!
//! Features: vim navigation, help overlay, file preview, search filter, themes,
//! bookmarks, virtual scrolling, async preview loading.

use std::io::{stdout, Read};
use std::path::PathBuf;
use std::fs::{self, File};
use std::time::{Duration, Instant};
use std::collections::HashMap;

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
const LAZY_LOAD_LIMIT: usize = 1000;
/// Maximum bookmarks
const MAX_BOOKMARKS: usize = 9;
/// Preview debounce delay in milliseconds
const PREVIEW_DEBOUNCE_MS: u64 = 100;

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
                    return true;
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
    BookmarkJump,  // Waiting for bookmark number
}

/// Bookmark entry
#[derive(Debug, Clone)]
struct Bookmark {
    path: PathBuf,
    name: String,
}

/// Preview state for async loading
#[derive(Debug, Clone)]
enum PreviewState {
    Loading,
    Ready(String),
    None,
}

/// Application state
struct App {
    state: AppState,
    source: Option<String>,
    dest: Option<String>,
    current_dir: PathBuf,
    all_entries: Vec<PathBuf>,
    filtered_entries: Vec<PathBuf>,
    selected: usize,
    config: Config,
    message: Option<String>,
    show_help: bool,
    preview_state: PreviewState,
    // v4 UX
    theme: Theme,
    input_mode: InputMode,
    search_query: String,
    file_filter: FileFilter,
    filter_extensions: Vec<String>,
    filter_index: usize,
    // v5 Performance
    is_large_dir: bool,
    total_entries: usize,
    // v6 Bookmarks
    bookmarks: HashMap<usize, Bookmark>,
    show_bookmarks: bool,
    // v7 Virtual scrolling
    viewport_height: usize,
    scroll_offset: usize,
    // v8 Async preview
    last_selection_change: Instant,
    preview_path: Option<PathBuf>,
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
            preview_state: PreviewState::None,
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
            bookmarks: HashMap::new(),
            show_bookmarks: false,
            viewport_height: 20,
            scroll_offset: 0,
            last_selection_change: Instant::now(),
            preview_path: None,
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
        self.schedule_preview_update();
    }

    fn apply_filters(&mut self) {
        let query = self.search_query.to_lowercase();
        self.filtered_entries = self.all_entries
            .iter()
            .filter(|p| {
                if !self.file_filter.matches(p) {
                    return false;
                }
                if query.is_empty() {
                    return true;
                }
                p.file_name()
                    .map(|n| n.to_string_lossy().to_lowercase().contains(&query))
                    .unwrap_or(false)
            })
            .cloned()
            .collect();

        if self.selected >= self.filtered_entries.len() {
            self.selected = self.filtered_entries.len().saturating_sub(1);
        }
        self.adjust_scroll();
    }

    fn schedule_preview_update(&mut self) {
        self.last_selection_change = Instant::now();
        self.preview_state = PreviewState::Loading;
        self.preview_path = self.filtered_entries.get(self.selected).cloned();
    }

    fn update_preview_if_ready(&mut self) {
        // Debounce: only update preview after delay
        if self.last_selection_change.elapsed() < Duration::from_millis(PREVIEW_DEBOUNCE_MS) {
            return;
        }

        if let PreviewState::Loading = self.preview_state {
            if let Some(ref path) = self.preview_path {
                let content = if path.is_file() {
                    read_file_preview(path).unwrap_or_else(|| "Unable to read file".to_string())
                } else {
                    let count = fs::read_dir(path).map(|rd| rd.count()).unwrap_or(0);
                    format!("📁 Directory\n\n{} items\n\nPress Enter to navigate", count)
                };
                self.preview_state = PreviewState::Ready(content);
            } else {
                self.preview_state = PreviewState::None;
            }
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
        self.adjust_scroll();
        self.schedule_preview_update();
    }

    fn adjust_scroll(&mut self) {
        // Keep selected item visible in viewport
        if self.selected < self.scroll_offset {
            self.scroll_offset = self.selected;
        } else if self.selected >= self.scroll_offset + self.viewport_height {
            self.scroll_offset = self.selected.saturating_sub(self.viewport_height - 1);
        }
    }

    fn goto_start(&mut self) {
        self.selected = 0;
        self.scroll_offset = 0;
        self.schedule_preview_update();
    }

    fn goto_end(&mut self) {
        if !self.filtered_entries.is_empty() {
            self.selected = self.filtered_entries.len() - 1;
            self.adjust_scroll();
        }
        self.schedule_preview_update();
    }

    fn page_down(&mut self, page_size: usize) {
        let len = self.filtered_entries.len();
        if len == 0 {
            return;
        }
        self.selected = (self.selected + page_size).min(len - 1);
        self.adjust_scroll();
        self.schedule_preview_update();
    }

    fn page_up(&mut self, page_size: usize) {
        self.selected = self.selected.saturating_sub(page_size);
        self.adjust_scroll();
        self.schedule_preview_update();
    }

    fn toggle_help(&mut self) {
        self.show_help = !self.show_help;
        self.show_bookmarks = false;
    }

    fn toggle_bookmarks(&mut self) {
        self.show_bookmarks = !self.show_bookmarks;
        self.show_help = false;
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
        self.schedule_preview_update();
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
        self.schedule_preview_update();
    }

    fn handle_search_backspace(&mut self) {
        self.search_query.pop();
        self.apply_filters();
        self.schedule_preview_update();
    }

    fn clear_search(&mut self) {
        self.search_query.clear();
        self.apply_filters();
        self.schedule_preview_update();
    }

    // Bookmark functions
    fn add_bookmark(&mut self) {
        let slot = self.next_free_bookmark_slot();
        if let Some(slot) = slot {
            let name = self.current_dir.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| self.current_dir.display().to_string());

            self.bookmarks.insert(slot, Bookmark {
                path: self.current_dir.clone(),
                name,
            });
            self.message = Some(format!("📌 Bookmark {} set: {}", slot, self.current_dir.display()));
        } else {
            self.message = Some("⚠️ All bookmark slots full (1-9)".to_string());
        }
    }

    fn next_free_bookmark_slot(&self) -> Option<usize> {
        for i in 1..=MAX_BOOKMARKS {
            if !self.bookmarks.contains_key(&i) {
                return Some(i);
            }
        }
        None
    }

    fn enter_bookmark_jump_mode(&mut self) {
        if self.bookmarks.is_empty() {
            self.message = Some("⚠️ No bookmarks set. Press 'm' to add one.".to_string());
        } else {
            self.input_mode = InputMode::BookmarkJump;
            self.message = Some("Press 1-9 to jump to bookmark...".to_string());
        }
    }

    fn jump_to_bookmark(&mut self, slot: usize) {
        self.input_mode = InputMode::Normal;
        if let Some(bookmark) = self.bookmarks.get(&slot).cloned() {
            if bookmark.path.exists() {
                self.current_dir = bookmark.path;
                self.search_query.clear();
                self.refresh_entries();
                self.message = Some(format!("📍 Jumped to bookmark {}: {}", slot, bookmark.name));
            } else {
                self.message = Some(format!("⚠️ Bookmark {} path no longer exists", slot));
            }
        } else {
            self.message = Some(format!("⚠️ No bookmark at slot {}", slot));
        }
    }

    #[allow(dead_code)] // UI feature for future keybind
    fn delete_bookmark(&mut self, slot: usize) {
        if self.bookmarks.remove(&slot).is_some() {
            self.message = Some(format!("🗑️ Bookmark {} deleted", slot));
        }
    }

    fn go_home(&mut self) {
        if let Ok(home) = std::env::var("HOME") {
            self.current_dir = PathBuf::from(home);
            self.search_query.clear();
            self.refresh_entries();
            self.message = Some("🏠 Jumped to home directory".to_string());
        }
    }

    fn set_viewport_height(&mut self, height: usize) {
        self.viewport_height = height.saturating_sub(2); // Account for borders
        self.adjust_scroll();
    }
}

/// Read first N bytes of a file for preview
fn read_file_preview(path: &PathBuf) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut buffer = vec![0u8; PREVIEW_MAX_BYTES];
    let bytes_read = file.read(&mut buffer).ok()?;
    buffer.truncate(bytes_read);

    let content = String::from_utf8_lossy(&buffer).to_string();

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

/// List directory with lazy loading
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
#[allow(dead_code)]
fn list_dir(path: &PathBuf) -> Vec<PathBuf> {
    list_dir_lazy(path, usize::MAX).0
}

/// Run the TUI application
pub async fn run(config: Config) -> Result<()> {
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    let mut app = App::new(config);
    app.schedule_preview_update();
    let result = run_app(&mut terminal, &mut app).await;

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    result
}

async fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    loop {
        let area = terminal.size()?;
        let page_size = (area.height as usize).saturating_sub(8);
        app.set_viewport_height(area.height.saturating_sub(10) as usize);

        // Update preview if debounce period passed
        app.update_preview_if_ready();

        terminal.draw(|f| ui(f, app))?;

        if event::poll(Duration::from_millis(POLL_TIMEOUT_MS))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }

                // Help overlay
                if app.show_help {
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc | KeyCode::Char('?') => {
                            app.show_help = false;
                        }
                        _ => {}
                    }
                    continue;
                }

                // Bookmarks overlay
                if app.show_bookmarks {
                    match key.code {
                        KeyCode::Char('B') | KeyCode::Esc => {
                            app.show_bookmarks = false;
                        }
                        KeyCode::Char(c) if c.is_ascii_digit() && c != '0' => {
                            let slot = c.to_digit(10).unwrap() as usize;
                            app.show_bookmarks = false;
                            app.jump_to_bookmark(slot);
                        }
                        KeyCode::Char('d') => {
                            // Delete mode - next digit deletes
                            app.message = Some("Press 1-9 to delete bookmark...".to_string());
                        }
                        _ => {}
                    }
                    continue;
                }

                // Bookmark jump mode
                if app.input_mode == InputMode::BookmarkJump {
                    match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.message = None;
                        }
                        KeyCode::Char(c) if c.is_ascii_digit() && c != '0' => {
                            let slot = c.to_digit(10).unwrap() as usize;
                            app.jump_to_bookmark(slot);
                        }
                        _ => {
                            app.input_mode = InputMode::Normal;
                            app.message = Some("⚠️ Invalid bookmark slot".to_string());
                        }
                    }
                    continue;
                }

                // Search mode
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

                    // Bookmarks
                    KeyCode::Char('m') => app.add_bookmark(),
                    KeyCode::Char('\'') => app.enter_bookmark_jump_mode(),
                    KeyCode::Char('B') => app.toggle_bookmarks(),
                    KeyCode::Char('~') => app.go_home(),

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

    let bg_block = Block::default().style(Style::default().bg(theme.bg()));
    frame.render_widget(bg_block, frame.area());

    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
            Constraint::Length(1),  // Search bar
            Constraint::Min(10),    // Content
            Constraint::Length(3),  // Status
        ])
        .split(frame.area());

    // Header with bookmark count
    let title = match app.state {
        AppState::SelectSource => "📂 Select Source File",
        AppState::SelectDest => "📂 Select Destination",
        AppState::Analyzing => "⏳ Analyzing...",
        AppState::Results => "✅ Analysis Complete",
        AppState::Error => "❌ Error",
    };

    let bookmark_count = if app.bookmarks.is_empty() {
        String::new()
    } else {
        format!(" | 📌{}", app.bookmarks.len())
    };

    let header_text = format!(
        "{} | {} | {}{} | ?",
        title, theme.name(), app.file_filter.label(), bookmark_count
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
    } else if app.input_mode == InputMode::BookmarkJump {
        Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(theme.dim())
    };

    let search_text = if app.input_mode == InputMode::BookmarkJump {
        "🔖 Press 1-9 to jump to bookmark...".to_string()
    } else if app.search_query.is_empty() {
        if app.input_mode == InputMode::Search {
            "Type to search...".to_string()
        } else {
            "/ search | m bookmark | ' jump | ~ home".to_string()
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

    // Virtual scrolling: only create visible items
    let visible_start = app.scroll_offset;
    let visible_end = (app.scroll_offset + app.viewport_height).min(app.filtered_entries.len());

    let items: Vec<ListItem> = app.filtered_entries[visible_start..visible_end]
        .iter()
        .enumerate()
        .map(|(rel_idx, path)| {
            let abs_idx = visible_start + rel_idx;
            let icon = if path.is_dir() { "📁" } else { "📄" };
            let name = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.display().to_string());

            let style = if abs_idx == app.selected {
                Style::default().bg(theme.highlight()).fg(theme.fg()).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme.fg())
            };

            ListItem::new(format!("{} {}", icon, name)).style(style)
        })
        .collect();

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

    // Adjust selection for virtual scroll offset
    let mut state = ListState::default();
    if app.selected >= visible_start && app.selected < visible_end {
        state.select(Some(app.selected - visible_start));
    }
    frame.render_stateful_widget(list, content_chunks[0], &mut state);

    // Preview pane
    let preview_text = match &app.preview_state {
        PreviewState::Loading => "⏳ Loading preview...".to_string(),
        PreviewState::Ready(content) => content.clone(),
        PreviewState::None => "No preview available".to_string(),
    };

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

    // Overlays
    if app.show_help {
        render_help_overlay(frame, theme);
    }
    if app.show_bookmarks {
        render_bookmarks_overlay(frame, app, theme);
    }
}

fn render_help_overlay(frame: &mut Frame, theme: Theme) {
    let area = frame.area();

    let help_width = 68;
    let help_height = 28;
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
        Line::from("  /           Enter search mode"),
        Line::from("  f           Cycle file type filter"),
        Line::from("  c           Clear search query"),
        Line::from(""),
        Line::from(Span::styled("Bookmarks", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  m           Add current directory to bookmarks"),
        Line::from("  '           Jump to bookmark (then press 1-9)"),
        Line::from("  B           Show/hide bookmarks panel"),
        Line::from("  ~           Jump to home directory"),
        Line::from(""),
        Line::from(Span::styled("Actions", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  Enter/l     Select / Enter directory"),
        Line::from("  Backspace/h Go to parent directory"),
        Line::from("  a           Analyze | r Reset | t Theme | q Quit"),
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

fn render_bookmarks_overlay(frame: &mut Frame, app: &App, theme: Theme) {
    let area = frame.area();

    let bm_width = 50;
    let bm_height = 14;
    let bm_area = Rect {
        x: area.width.saturating_sub(bm_width) / 2,
        y: area.height.saturating_sub(bm_height) / 2,
        width: bm_width.min(area.width),
        height: bm_height.min(area.height),
    };

    let overlay = Block::default().style(Style::default().bg(Color::Black));
    frame.render_widget(overlay, area);

    let mut lines = vec![
        Line::from(Span::styled("📌 BOOKMARKS", Style::default().add_modifier(Modifier::BOLD).fg(theme.accent()))),
        Line::from(""),
    ];

    if app.bookmarks.is_empty() {
        lines.push(Line::from(Span::styled("  No bookmarks set", Style::default().fg(theme.dim()))));
        lines.push(Line::from(""));
        lines.push(Line::from("  Press 'm' to bookmark current directory"));
    } else {
        for i in 1..=MAX_BOOKMARKS {
            if let Some(bookmark) = app.bookmarks.get(&i) {
                lines.push(Line::from(vec![
                    Span::styled(format!("  {} ", i), Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
                    Span::styled(&bookmark.name, Style::default().fg(theme.fg())),
                ]));
            }
        }
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled("  Press 1-9 to jump | B to close", Style::default().fg(theme.dim()))));

    let bookmarks = Paragraph::new(lines)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Yellow))
            .title("Bookmarks"))
        .style(Style::default().bg(Color::Black).fg(Color::White))
        .alignment(Alignment::Left);

    frame.render_widget(bookmarks, bm_area);
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

    #[test]
    fn test_bookmarks() {
        let config = Config::default();
        let mut app = App::new(config);

        assert!(app.bookmarks.is_empty());
        app.add_bookmark();
        assert_eq!(app.bookmarks.len(), 1);
        assert!(app.bookmarks.contains_key(&1));

        app.add_bookmark();
        assert_eq!(app.bookmarks.len(), 2);
        assert!(app.bookmarks.contains_key(&2));

        app.delete_bookmark(1);
        assert_eq!(app.bookmarks.len(), 1);
        assert!(!app.bookmarks.contains_key(&1));
    }

    #[test]
    fn test_virtual_scroll() {
        let config = Config::default();
        let mut app = App::new(config);
        app.all_entries = (0..100).map(|i| PathBuf::from(format!("/file{}", i))).collect();
        app.filtered_entries = app.all_entries.clone();
        app.viewport_height = 10;

        // Initially at top
        assert_eq!(app.scroll_offset, 0);

        // Move to item 15
        app.selected = 15;
        app.adjust_scroll();
        assert!(app.scroll_offset > 0);
        assert!(app.selected >= app.scroll_offset);
        assert!(app.selected < app.scroll_offset + app.viewport_height);
    }

    #[test]
    fn test_preview_state() {
        let config = Config::default();
        let mut app = App::new(config);

        // Initial state should be Loading after schedule
        app.schedule_preview_update();
        assert!(matches!(app.preview_state, PreviewState::Loading));
    }
}
