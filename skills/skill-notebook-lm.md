---
name: notebooklm
description: Interact with Google NotebookLM via CLI (nlm). Use this when the user wants to manage notebooks, add sources, generate audio podcasts, research topics, query notebooks, or share content.
---

# NotebookLM Antigravity Skill

This skill provides seamless integration with Google NotebookLM through the `nlm` command-line interface. It enables you to create notebooks, add sources from URLs, text, files, or Google Drive, generate AI-powered audio podcasts, perform web research, and query your notebooks with natural language.

## Goal
To enable Google NotebookLM functionality within Antigravity for research, content generation, and knowledge management tasks.

## Prerequisites
1. **Install the tool:** Run the installation script before first use
2. **Authenticate:** You must authenticate with your Google account before using NotebookLM features

## Instructions

### Step 1: Installation (First Time Only)
Before using NotebookLM, run the installation script to set up the `nlm` CLI:

```bash
uv tool install notebooklm-mcp-cli
```

After installation, verify it's available:
```bash
nlm --version
```

### Step 2: Authentication
You must authenticate with your Google account before using NotebookLM:

**Auto Mode (Recommended):**
```bash
nlm login
```
This launches a dedicated Chrome profile. Log in to Google, and cookies will be extracted automatically.

### Step 3: Common Operations
Once authenticated, you can use any of these commands directly in the terminal:

#### Notebook Management
```bash
# List all notebooks
nlm notebook list

# Create a new notebook
nlm notebook create "Research Project"
```

#### Add Sources
```bash
# Add URL source
nlm source add <notebook-id> --url "https://example.com/article"

# Add local file
nlm source add <notebook-id> --file /path/to/file.pdf
```

#### Query Notebooks (AI Chat)
```bash
# Ask questions about your notebook
nlm notebook query <notebook-id> "What are the key findings?"
```

#### Generate Audio Podcasts
```bash
# Generate audio overview
nlm audio create <notebook-id> --confirm
```

## Constraints
- Authentication is **required** before any NotebookLM operations
- Free tier accounts have rate limits (~50 queries/day)
- Cookie-based auth expires every 2-4 weeks; re-run `nlm login` when prompted

## Troubleshooting
```bash
# Force reinstall if needed
uv tool install --force notebooklm-mcp-cli

# Remove old auth data and re-login
rm -rf ~/.notebooklm-mcp-cli
nlm login
```
