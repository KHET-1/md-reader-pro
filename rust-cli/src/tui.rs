//! TUI Module - Terminal User Interface with ratatui
//!
//! Provides interactive source/destination picker and analysis viewer.

#![cfg(feature = "tui")]

use std::io::{self, stdout};
use std::path::PathBuf;
use std::fs;

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
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
        }
    }

    fn refresh_entries(&mut self) {
        self.entries = list_dir(&self.current_dir);
        self.selected = 0;
    }

    fn select_current(&mut self) {
        if let Some(path) = self.entries.get(self.selected) {
            if path.is_dir() {
                self.current_dir = path.clone();
                self.refresh_entries();
            } else {
                match self.state {
                    AppState::SelectSource => {
                        self.source = Some(path.display().to_string());
                        self.state = AppState::SelectDest;
                        self.message = Some(format!("Source: {}", path.display()));
                    }
                    AppState::SelectDest => {
                        self.dest = Some(path.display().to_string());
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

        let new_selected = if delta > 0 {
            (self.selected + delta as usize) % len
        } else {
            (self.selected + len - (-delta) as usize % len) % len
        };
        self.selected = new_selected;
    }
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
    let result = run_app(&mut terminal, &mut app).await;

    // Restore terminal
    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;

    result
}

async fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> Result<()> {
    loop {
        terminal.draw(|f| ui(f, app))?;

        if let Event::Key(key) = event::read()? {
            if key.kind != KeyEventKind::Press {
                continue;
            }

            match key.code {
                KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                KeyCode::Up | KeyCode::Char('k') => app.move_selection(-1),
                KeyCode::Down | KeyCode::Char('j') => app.move_selection(1),
                KeyCode::Enter => app.select_current(),
                KeyCode::Backspace | KeyCode::Char('h') => app.go_up(),
                KeyCode::Char('a') if app.source.is_some() && app.dest.is_some() => {
                    // Run analysis
                    app.state = AppState::Analyzing;
                    terminal.draw(|f| ui(f, app))?;

                    let source = app.source.as_ref().unwrap();
                    let dest = app.dest.as_ref().unwrap();

                    // Acquire read-only lock
                    let _lock = ReadOnlyLock::acquire(source).await?;

                    // Analyze
                    let results = analyzer::analyze(source, &app.config).await?;
                    analyzer::export(&results, dest).await?;

                    app.state = AppState::Results;
                    app.message = Some(format!(
                        "✅ Analyzed {} files, exported to {}",
                        results.total_files, dest
                    ));
                }
                _ => {}
            }
        }
    }
}

fn ui(frame: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(10),
            Constraint::Length(3),
        ])
        .split(frame.area());

    // Header
    let title = match app.state {
        AppState::SelectSource => "📂 Select Source (Enter=select, Backspace=up, q=quit)",
        AppState::SelectDest => "📂 Select Destination (Enter=select, a=analyze)",
        AppState::Analyzing => "⏳ Analyzing...",
        AppState::Results => "✅ Complete! (q=quit)",
        AppState::Error => "❌ Error",
    };

    let header = Paragraph::new(title)
        .style(Style::default().fg(Color::Cyan).bold())
        .block(Block::default().borders(Borders::ALL).title("Diamond Drill 💎"));
    frame.render_widget(header, chunks[0]);

    // File list
    let items: Vec<ListItem> = app.entries.iter().map(|path| {
        let icon = if path.is_dir() { "📁" } else { "📄" };
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.display().to_string());
        ListItem::new(format!("{} {}", icon, name))
    }).collect();

    let list = List::new(items)
        .block(Block::default()
            .borders(Borders::ALL)
            .title(format!("📂 {}", app.current_dir.display())))
        .highlight_style(Style::default().bg(Color::DarkGray).bold())
        .highlight_symbol("▶ ");

    let mut state = ListState::default();
    state.select(Some(app.selected));
    frame.render_stateful_widget(list, chunks[1], &mut state);

    // Status bar
    let status = if let Some(ref msg) = app.message {
        msg.clone()
    } else {
        format!(
            "Source: {} | Dest: {}",
            app.source.as_deref().unwrap_or("(none)"),
            app.dest.as_deref().unwrap_or("(none)")
        )
    };

    let status_bar = Paragraph::new(status)
        .style(Style::default().fg(Color::Yellow))
        .block(Block::default().borders(Borders::ALL));
    frame.render_widget(status_bar, chunks[2]);
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
        assert_eq!(app.selected, 0); // Wrap around
    }
}
