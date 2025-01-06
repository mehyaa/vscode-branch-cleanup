# VS Code Branch Cleanup Extension

[![Build Status][build-status-badge-url]][build-status-url]
[![Visual Studio Marketplace][marketplace-badge-url]][marketplace-url]
[![Installs][marketplace-installs-badge-url]][marketplace-url]
[![Rating][marketplace-rating-badge-url]][marketplace-url]
[![GitHub Issues][issues-badge-url]][issues-url]

## Overview

The **Branch Cleanup** extension for Visual Studio Code is designed to help users clean up Git branches with ease.

- **Extension URL**: [VS Marketplace][marketplace-url]
- **Source Code**: [GitHub Repository][repo-url]

---

## Installation

### From the Visual Studio Code Marketplace

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking the Extensions icon in the Activity Bar (or press `Ctrl+Shift+X`).
3. Search for **Branch Cleanup**.
4. Click **Install**.

### From the VSIX File

1. Download the latest `.vsix` file from the [GitHub Releases][releases-url].
2. Open VS Code.
3. Press `Ctrl+Shift+P` to open the Command Palette and type `Extensions: Install from VSIX`.
4. Select the downloaded `.vsix` file to install.

---

## Usage

1. Open the Command Palette (`Ctrl+Shift+P`).
2. Type `Branch Cleanup: Delete Branches`.
3. All branches (with some are pre-selected) will be listed, select what branches in which repo should be deleted and click OK

---

## Contributing

We welcome contributions to improve the extension! To get started:

1. **Fork the Repository**:
   - Go to the [GitHub Repository][repo-url].
   - Click the **Fork** button to create your own copy of the repository.

2. **Clone Your Fork**:
   ```sh
   git clone https://github.com/your-username/vscode-branch-cleanup.git
   ```
   Replace `your-username` with your GitHub username.

3. **Create a Feature Branch**:
   ```sh
   git checkout -b feature/your-feature-name
   ```
   Replace `your-feature-name` with a descriptive name for your feature or fix.

4. **Make Changes**:
   - Implement your feature or fix.
   - Test your changes thoroughly.

5. **Commit Your Changes**:
   ```sh
   git add .
   git commit -m "Add your descriptive commit message here"
   ```

6. **Push Your Branch**:
   ```sh
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**:
   - Go to the original repository on GitHub.
   - Click the **Pull Requests** tab.
   - Click **New Pull Request** and select your feature branch.
   - Add a description of your changes and submit the pull request.

### Reporting Issues

- Use the [GitHub Issues page][issues-url] to report bugs or suggest new features.

---

## License

This project is licensed under the [MIT License][license-url].

---

## Support

If you encounter any issues or have questions about the extension, feel free to:

- Open a issue on [GitHub Issues][issues-url].
- Reach out via the [Marketplace Page][marketplace-url].

---

## Thanks

Icon made by [edt.im][icon-author-url] from [flaticon.com][icon-url]


[repo-url]: https://github.com/mehyaa/vscode-branch-cleanup
[license-url]: https://github.com/mehyaa/vscode-branch-cleanup/blob/master/LICENSE
[releases-url]: https://github.com/mehyaa/vscode-branch-cleanup/releases
[issues-url]: https://github.com/mehyaa/vscode-branch-cleanup/issues
[issues-badge-url]: https://img.shields.io/github/issues/mehyaa/vscode-branch-cleanup
[build-status-url]: https://github.com/mehyaa/vscode-branch-cleanup/actions/workflows/build.yml
[build-status-badge-url]: https://github.com/mehyaa/vscode-branch-cleanup/actions/workflows/build.yml/badge.svg
[marketplace-url]: https://marketplace.visualstudio.com/items?itemName=mehyaa.branch-cleanup
[marketplace-badge-url]: https://img.shields.io/visual-studio-marketplace/v/mehyaa.branch-cleanup
[marketplace-installs-badge-url]: https://img.shields.io/visual-studio-marketplace/i/mehyaa.branch-cleanup
[marketplace-rating-badge-url]: https://img.shields.io/visual-studio-marketplace/r/mehyaa.branch-cleanup
[icon-url]: https://www.flaticon.com/free-icon/delete_6577290
[icon-author-url]: https://www.flaticon.com/authors/edtim
