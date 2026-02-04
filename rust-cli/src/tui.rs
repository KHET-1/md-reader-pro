//! TUI Module - Terminal User Interface with ratatui
//!
//! Provides interactive source/destination picker and analysis viewer.
//! Enhanced with vim-style navigation, help overlay, and file preview.

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

/// Application state
struct App {
    state: AppState,
    source: Option<String>,
    dest: Option<String>,
    current_dir: PathBuf,
    entries: Vec<PathBuf>,
    selected: usize,
    config: Config,
    message: Option<String>,
    show_help: bool,
    preview_content: Option<String>,
    scroll_offset: usize,
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
        let entries = list_dir(&current_dir);

        Self {
            state: AppState::SelectSource,
            source: None,
            dest: None,
            current_dir,
            entries,
            selected: 0,
            config,
            message: None,
            show_help: false,
            preview_content: None,
            scroll_offset: 0,
        }
    }

    fn refresh_entries(&mut self) {
        self.entries = list_dir(&self.current_dir);
        self.selected = 0;
        self.scroll_offset = 0;
        self.update_preview();
    }

    fn update_preview(&mut self) {
        if let Some(path) = self.entries.get(self.selected) {
            if path.is_file() {
                self.preview_content = read_file_preview(path);
            } else {
                // Show directory contents count
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
        if let Some(path) = self.entries.get(self.selected).cloned() {
            if path.is_dir() {
                self.current_dir = path;
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
            self.refresh_entries();
        }
    }

    fn move_selection(&mut self, delta: i32) {
        let len = self.entries.len();
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
        if !self.entries.is_empty() {
            self.selected = self.entries.len() - 1;
        }
        self.update_preview();
    }

    fn page_down(&mut self, page_size: usize) {
        let len = self.entries.len();
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
}

/// Read first N bytes of a file for preview
fn read_file_preview(path: &PathBuf) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut buffer = vec![0u8; PREVIEW_MAX_BYTES];
    let bytes_read = file.read(&mut buffer).ok()?;
    buffer.truncate(bytes_read);

    // Try to convert to string, replace invalid UTF-8
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

fn list_dir(path: &PathBuf) -> Vec<PathBuf> {
    let mut entries: Vec<PathBuf> = fs::read_dir(path)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .map(|e| e.path())
                .collect()
        })
        .unwrap_or_default();

    entries.sort_by(|a, b| {
        match (a.is_dir(), b.is_dir()) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    entries
}

/// Run the TUI application
pub async fn run(config: Config) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    let mut app = App::new(config);
    app.update_preview(); // Initial preview
    let result = run_app(&mut terminal, &mut app).await;

    // Restore terminal
    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    result
}

async fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    loop {
        let area = terminal.size()?;
        let page_size = (area.height as usize).saturating_sub(8); // Approximate visible rows

        terminal.draw(|f| ui(f, app))?;

        // Non-blocking event poll - fixes async runtime blocking
        if event::poll(Duration::from_millis(POLL_TIMEOUT_MS))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }

                // Help overlay intercepts all keys except 'q' and '?'
                if app.show_help {
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc | KeyCode::Char('?') => {
                            app.show_help = false;
                        }
                        _ => {}
                    }
                    continue;
                }

                match key.code {
                    // Quit
                    KeyCode::Char('q') | KeyCode::Esc => return Ok(()),

                    // Help
                    KeyCode::Char('?') => app.toggle_help(),

                    // Navigation - vim style
                    KeyCode::Up | KeyCode::Char('k') => app.move_selection(-1),
                    KeyCode::Down | KeyCode::Char('j') => app.move_selection(1),
                    KeyCode::Char('g') => app.goto_start(), // gg (simplified to single g)
                    KeyCode::Char('G') => app.goto_end(),

                    // Page navigation
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

                    // Reset selection
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
    // Acquire read-only lock
    let _lock = ReadOnlyLock::acquire(source).await?;

    // Analyze
    let results = analyzer::analyze(source, config).await?;
    let summary = format!(
        "✅ Analyzed {} files ({} bytes) → {}",
        results.total_files, results.total_size, dest
    );

    analyzer::export(&results, dest).await?;

    Ok(summary)
}

fn ui(frame: &mut Frame, app: &App) {
    // Main layout: header, content, status
    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Header
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

    let header = Paragraph::new(format!("{} | Press ? for help", title))
        .style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
        .block(Block::default().borders(Borders::ALL).title("💎 Diamond Drill"));
    frame.render_widget(header, main_chunks[0]);

    // Content: file list (left) + preview (right)
    let content_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(50),
            Constraint::Percentage(50),
        ])
        .split(main_chunks[1]);

    // File list
    let items: Vec<ListItem> = app.entries.iter().enumerate().map(|(i, path)| {
        let icon = if path.is_dir() { "📁" } else { "📄" };
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.display().to_string());

        let style = if i == app.selected {
            Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD)
        } else {
            Style::default()
        };

        ListItem::new(format!("{} {}", icon, name)).style(style)
    }).collect();

    let position_info = if app.entries.is_empty() {
        "(empty)".to_string()
    } else {
        format!("{}/{}", app.selected + 1, app.entries.len())
    };

    let list = List::new(items)
        .block(Block::default()
            .borders(Borders::ALL)
            .title(format!("📂 {} [{}]", app.current_dir.display(), position_info)))
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol("▶ ");

    let mut state = ListState::default();
    state.select(Some(app.selected));
    frame.render_stateful_widget(list, content_chunks[0], &mut state);

    // Preview pane
    let preview_text = app.preview_content.as_deref().unwrap_or("No preview available");
    let preview = Paragraph::new(preview_text)
        .block(Block::default().borders(Borders::ALL).title("📋 Preview"))
        .wrap(Wrap { trim: false })
        .style(Style::default().fg(Color::Gray));
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
        .block(Block::default().borders(Borders::ALL).title("Status"));
    frame.render_widget(status_bar, main_chunks[2]);

    // Help overlay (rendered last, on top)
    if app.show_help {
        render_help_overlay(frame);
    }
}

fn render_help_overlay(frame: &mut Frame) {
    let area = frame.area();

    // Center the help box
    let help_width = 60;
    let help_height = 20;
    let help_area = Rect {
        x: area.width.saturating_sub(help_width) / 2,
        y: area.height.saturating_sub(help_height) / 2,
        width: help_width.min(area.width),
        height: help_height.min(area.height),
    };

    // Semi-transparent background effect (clear area)
    let overlay = Block::default()
        .style(Style::default().bg(Color::Black));
    frame.render_widget(overlay, area);

    let help_text = vec![
        Line::from(Span::styled("KEYBOARD SHORTCUTS", Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan))),
        Line::from(""),
        Line::from(Span::styled("Navigation", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  j/↓         Move down"),
        Line::from("  k/↑         Move up"),
        Line::from("  g           Go to first item"),
        Line::from("  G           Go to last item"),
        Line::from("  Ctrl+d      Half page down"),
        Line::from("  Ctrl+u      Half page up"),
        Line::from("  PgDn/PgUp   Full page scroll"),
        Line::from(""),
        Line::from(Span::styled("Actions", Style::default().add_modifier(Modifier::BOLD))),
        Line::from("  Enter/l     Select / Enter directory"),
        Line::from("  Backspace/h Go to parent directory"),
        Line::from("  a           Analyze (when both selected)"),
        Line::from("  r           Reset selection"),
        Line::from("  ?           Toggle this help"),
        Line::from("  q/Esc       Quit"),
    ];

    let help = Paragraph::new(help_text)
        .block(Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan))
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
        // Directories should come first
        assert!(entries[0].is_dir());
    }

    #[test]
    fn test_app_move_selection() {
        let config = Config::default();
        let mut app = App::new(config);
        app.entries = vec![
            PathBuf::from("/a"),
            PathBuf::from("/b"),
            PathBuf::from("/c"),
        ];

        app.move_selection(1);
        assert_eq!(app.selected, 1);

        app.move_selection(1);
        assert_eq!(app.selected, 2);

        app.move_selection(1);
        assert_eq!(app.selected, 2); // Clamped, no wrap
    }

    #[test]
    fn test_app_goto_navigation() {
        let config = Config::default();
        let mut app = App::new(config);
        app.entries = vec![
            PathBuf::from("/a"),
            PathBuf::from("/b"),
            PathBuf::from("/c"),
        ];

        app.goto_end();
        assert_eq!(app.selected, 2);

        app.goto_start();
        assert_eq!(app.selected, 0);
    }

    #[test]
    fn test_app_page_navigation() {
        let config = Config::default();
        let mut app = App::new(config);
        app.entries = (0..50).map(|i| PathBuf::from(format!("/file{}", i))).collect();

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
}
