//! GUI Module - Graphical User Interface with iced
//!
//! Provides a modern, cross-platform GUI for source/destination selection.

#![cfg(feature = "gui")]

use anyhow::Result;
use iced::{
    widget::{button, column, container, row, scrollable, text, text_input, Column, Row},
    Application, Command, Element, Length, Settings, Theme,
};
use std::path::PathBuf;

use crate::config::Config;
use crate::analyzer;
use crate::ro_lock::ReadOnlyLock;

/// Run the GUI application
pub async fn run(config: Config) -> Result<()> {
    DiamondDrill::run(Settings {
        window: iced::window::Settings {
            size: iced::Size::new(800.0, 600.0),
            ..Default::default()
        },
        ..Settings::with_flags(config)
    })?;

    Ok(())
}

struct DiamondDrill {
    config: Config,
    source_path: String,
    dest_path: String,
    current_dir: PathBuf,
    entries: Vec<PathBuf>,
    selected_entry: Option<usize>,
    state: AppState,
    message: String,
    results: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum AppState {
    SelectSource,
    SelectDest,
    Analyzing,
    Complete,
}

#[derive(Debug, Clone)]
enum Message {
    SourcePathChanged(String),
    DestPathChanged(String),
    SelectEntry(usize),
    ConfirmSource,
    ConfirmDest,
    GoUp,
    Analyze,
    AnalysisComplete(String),
    AnalysisError(String),
    Reset,
}

impl Application for DiamondDrill {
    type Executor = iced::executor::Default;
    type Message = Message;
    type Theme = Theme;
    type Flags = Config;

    fn new(config: Self::Flags) -> (Self, Command<Message>) {
        let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("/"));
        let entries = list_directory(&current_dir);

        (
            Self {
                config,
                source_path: String::new(),
                dest_path: String::new(),
                current_dir,
                entries,
                selected_entry: None,
                state: AppState::SelectSource,
                message: "Select a source file or directory".to_string(),
                results: None,
            },
            Command::none(),
        )
    }

    fn title(&self) -> String {
        "Diamond Drill 💎 - Secure File Analyzer".to_string()
    }

    fn update(&mut self, message: Message) -> Command<Message> {
        match message {
            Message::SourcePathChanged(path) => {
                self.source_path = path;
            }
            Message::DestPathChanged(path) => {
                self.dest_path = path;
            }
            Message::SelectEntry(index) => {
                if let Some(entry) = self.entries.get(index) {
                    if entry.is_dir() {
                        self.current_dir = entry.clone();
                        self.entries = list_directory(&self.current_dir);
                        self.selected_entry = None;
                    } else {
                        self.selected_entry = Some(index);
                        match self.state {
                            AppState::SelectSource => {
                                self.source_path = entry.display().to_string();
                            }
                            AppState::SelectDest => {
                                self.dest_path = entry.display().to_string();
                            }
                            _ => {}
                        }
                    }
                }
            }
            Message::GoUp => {
                if let Some(parent) = self.current_dir.parent() {
                    self.current_dir = parent.to_path_buf();
                    self.entries = list_directory(&self.current_dir);
                    self.selected_entry = None;
                }
            }
            Message::ConfirmSource => {
                if !self.source_path.is_empty() {
                    self.state = AppState::SelectDest;
                    self.message = format!("Source: {} | Select destination", self.source_path);
                }
            }
            Message::ConfirmDest => {
                if !self.dest_path.is_empty() {
                    self.message = "Ready to analyze. Click 'Analyze' to begin.".to_string();
                }
            }
            Message::Analyze => {
                if !self.source_path.is_empty() && !self.dest_path.is_empty() {
                    self.state = AppState::Analyzing;
                    self.message = "Analyzing...".to_string();

                    let source = self.source_path.clone();
                    let dest = self.dest_path.clone();
                    let config = self.config.clone();

                    return Command::perform(
                        async move {
                            run_analysis(source, dest, config).await
                        },
                        |result| match result {
                            Ok(summary) => Message::AnalysisComplete(summary),
                            Err(e) => Message::AnalysisError(e.to_string()),
                        },
                    );
                }
            }
            Message::AnalysisComplete(summary) => {
                self.state = AppState::Complete;
                self.message = "✅ Analysis complete!".to_string();
                self.results = Some(summary);
            }
            Message::AnalysisError(error) => {
                self.state = AppState::Complete;
                self.message = format!("❌ Error: {}", error);
            }
            Message::Reset => {
                self.state = AppState::SelectSource;
                self.source_path.clear();
                self.dest_path.clear();
                self.results = None;
                self.message = "Select a source file or directory".to_string();
            }
        }

        Command::none()
    }

    fn view(&self) -> Element<Message> {
        let header = text("💎 Diamond Drill - Secure File Analyzer")
            .size(24);

        let status = text(&self.message).size(14);

        // File browser
        let browser = self.file_browser_view();

        // Input fields
        let inputs = self.inputs_view();

        // Action buttons
        let actions = self.actions_view();

        // Results
        let results = if let Some(ref results) = self.results {
            text(results).size(12)
        } else {
            text("")
        };

        let content = column![
            header,
            status,
            browser,
            inputs,
            actions,
            results,
        ]
        .spacing(10)
        .padding(20);

        container(content)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn theme(&self) -> Theme {
        Theme::Dark
    }
}

impl DiamondDrill {
    fn file_browser_view(&self) -> Element<Message> {
        let path_display = text(format!("📂 {}", self.current_dir.display())).size(12);

        let up_button = button("⬆️ Up").on_press(Message::GoUp);

        let entries: Vec<Element<Message>> = self.entries.iter().enumerate().map(|(i, path)| {
            let icon = if path.is_dir() { "📁" } else { "📄" };
            let name = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "..".to_string());

            let label = format!("{} {}", icon, name);
            let btn = button(text(label).size(12))
                .on_press(Message::SelectEntry(i))
                .width(Length::Fill);

            btn.into()
        }).collect();

        let list = Column::with_children(entries).spacing(2);

        column![
            row![path_display, up_button].spacing(10),
            scrollable(list).height(Length::Fixed(200.0)),
        ]
        .spacing(5)
        .into()
    }

    fn inputs_view(&self) -> Element<Message> {
        let source_input = text_input("Source path...", &self.source_path)
            .on_input(Message::SourcePathChanged)
            .padding(10);

        let dest_input = text_input("Destination path...", &self.dest_path)
            .on_input(Message::DestPathChanged)
            .padding(10);

        column![
            row![text("Source:").width(Length::Fixed(100.0)), source_input],
            row![text("Dest:").width(Length::Fixed(100.0)), dest_input],
        ]
        .spacing(10)
        .into()
    }

    fn actions_view(&self) -> Element<Message> {
        let mut buttons = Row::new().spacing(10);

        match self.state {
            AppState::SelectSource => {
                buttons = buttons.push(
                    button("✅ Confirm Source")
                        .on_press(Message::ConfirmSource)
                );
            }
            AppState::SelectDest => {
                buttons = buttons.push(
                    button("✅ Confirm Dest")
                        .on_press(Message::ConfirmDest)
                );
                buttons = buttons.push(
                    button("🔍 Analyze")
                        .on_press(Message::Analyze)
                );
            }
            AppState::Analyzing => {
                buttons = buttons.push(text("⏳ Analyzing..."));
            }
            AppState::Complete => {
                buttons = buttons.push(
                    button("🔄 New Analysis")
                        .on_press(Message::Reset)
                );
            }
        }

        buttons.into()
    }
}

fn list_directory(path: &PathBuf) -> Vec<PathBuf> {
    let mut entries: Vec<PathBuf> = std::fs::read_dir(path)
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

async fn run_analysis(source: String, dest: String, config: Config) -> Result<String> {
    // Acquire read-only lock
    let _lock = ReadOnlyLock::acquire(&source).await?;

    // Run analysis
    let results = analyzer::analyze(&source, &config).await?;

    // Export
    analyzer::export(&results, &dest).await?;

    Ok(format!(
        "Analyzed {} files ({} bytes)\nExported to: {}",
        results.total_files, results.total_size, dest
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_directory() {
        let temp = tempfile::tempdir().unwrap();
        std::fs::write(temp.path().join("file.txt"), "content").unwrap();

        let entries = list_directory(&temp.path().to_path_buf());
        assert!(!entries.is_empty());
    }
}
