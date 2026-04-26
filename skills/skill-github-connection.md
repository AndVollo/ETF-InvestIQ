# Skill: GitHub Connection Protocol

## Description
This skill provides instructions for connecting a local project directory to a remote GitHub repository without using the GitHub CLI (`gh`).

## Prerequisites
- Git installed on the local machine.
- A GitHub account.

## Workflow

### 1. Create a Repository on GitHub
1. Log in to [GitHub](https://github.com/).
2. Click the **+** icon in the top right and select **New repository**.
3. Name your repository (e.g., `Lab_Dashboard`).
4. Keep it **Public** or **Private** as desired.
5. **CRITICAL**: Do NOT initialize the repository with a README, license, or .gitignore (keep it empty).
6. Click **Create repository**.

### 2. Connect Local Repo to GitHub
Copy the HTTPS or SSH URL from the "Quick setup" page and run:

```bash
# Replace <URL> with your repository URL
git remote add origin <URL>
git push -u origin main
```

## Troubleshooting
- **Authentication Failed**: If you haven't set up SSH, use HTTPS and generate a [Personal Access Token (PAT)](https://github.com/settings/tokens) to use as your password.
- **Permission Denied (publickey)**: Ensure your SSH key is added to your GitHub account settings.
