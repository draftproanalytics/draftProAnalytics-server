# DraftProAnalytics Server Copilot Customizations

Copy this `.github` folder into the root of the DraftProAnalytics server repository.

VS Code automatically loads `.github/copilot-instructions.md` for workspace chat requests. It also discovers `*.instructions.md` files from `.github/instructions` and prompt files from `.github/prompts` using the default Copilot customization locations.

Useful slash prompts after copy:

- `/create-server-module`
- `/review-server-module`
- `/mysql-first-change`

Recommended check in VS Code:

1. Open the server repo root as the workspace.
2. Open Copilot Chat.
3. Run `Chat: Configure Instructions` from the Command Palette to confirm the files are discovered.
4. Run Copilot Chat diagnostics if instructions do not appear to apply.
