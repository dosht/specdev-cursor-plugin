import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class SpecDevProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SpecDevProvider.currentPanel) {
      SpecDevProvider.currentPanel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'specdev',
      'SpecDev',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    SpecDevProvider.currentPanel = panel;
    const provider = new SpecDevProvider(extensionUri);
    provider.setupWebview(panel);

    panel.onDidDispose(
      () => {
        SpecDevProvider.currentPanel = undefined;
      },
      null,
    );
  }

  private setupWebview(panel: vscode.WebviewPanel) {
    panel.webview.html = this.getHtmlForWebview(panel.webview);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'loadFiles':
            const fileContent = await this.loadSpecDevFiles();
            panel.webview.postMessage({
              command: 'filesLoaded',
              content: fileContent
            });
            break;
          case 'saveFile':
            await this.saveSpecDevFile(message.type, message.content);
            break;
          case 'regenerate':
            vscode.window.showInformationMessage(`Regenerating ${message.type}... (stub)`);
            // TODO: Integrate with Cursor GPT for actual regeneration
            break;
        }
      },
      undefined,
    );
  }

  private async loadSpecDevFiles(): Promise<{requirements: string, design: string, tasks: string}> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return { requirements: '', design: '', tasks: '' };
    }

    const specdevPath = path.join(workspaceFolder.uri.fsPath, '.specdev');
    
    // Ensure .specdev directory exists
    if (!fs.existsSync(specdevPath)) {
      fs.mkdirSync(specdevPath, { recursive: true });
    }

    const files = ['requirements.md', 'design.md', 'tasks.md'];
    const content: any = {};

    for (const file of files) {
      const filePath = path.join(specdevPath, file);
      const key = file.replace('.md', '');
      
      try {
        if (fs.existsSync(filePath)) {
          content[key] = fs.readFileSync(filePath, 'utf8');
        } else {
          content[key] = '';
        }
      } catch (error) {
        content[key] = '';
      }
    }

    return content;
  }

  private async saveSpecDevFile(type: string, content: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const specdevPath = path.join(workspaceFolder.uri.fsPath, '.specdev');
    
    // Ensure .specdev directory exists
    if (!fs.existsSync(specdevPath)) {
      fs.mkdirSync(specdevPath, { recursive: true });
    }

    const filePath = path.join(specdevPath, `${type}.md`);
    
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      vscode.window.showInformationMessage(`${type}.md saved successfully`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save ${type}.md: ${error}`);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SpecDev</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .tabs {
                display: flex;
                border-bottom: 1px solid var(--vscode-panel-border);
                margin-bottom: 20px;
            }
            .tab {
                padding: 10px 20px;
                background: var(--vscode-tab-inactiveBackground);
                border: none;
                color: var(--vscode-tab-inactiveForeground);
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }
            .tab.active {
                background: var(--vscode-tab-activeBackground);
                color: var(--vscode-tab-activeForeground);
                border-bottom-color: var(--vscode-tab-activeBorder);
            }
            .content {
                display: none;
            }
            .content.active {
                display: block;
            }
            textarea {
                width: 100%;
                height: 500px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                padding: 10px;
                font-family: 'Courier New', monospace;
                resize: vertical;
            }
            .toolbar {
                margin-bottom: 10px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 6px 12px;
                cursor: pointer;
                margin-right: 10px;
            }
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>SpecDev - Specification Development</h1>
            
            <div class="tabs">
                <button class="tab active" onclick="showTab('requirements')">Requirements</button>
                <button class="tab" onclick="showTab('design')">Design</button>
                <button class="tab" onclick="showTab('tasks')">Tasks</button>
            </div>

            <div id="requirements" class="content active">
                <div class="toolbar">
                    <button onclick="saveFile('requirements')">Save Requirements</button>
                </div>
                <textarea id="requirements-content" placeholder="Enter requirements in markdown format..."></textarea>
            </div>

            <div id="design" class="content">
                <div class="toolbar">
                    <button onclick="saveFile('design')">Save Design</button>
                </div>
                <textarea id="design-content" placeholder="Enter design documentation with Mermaid diagrams..."></textarea>
            </div>

            <div id="tasks" class="content">
                <div class="toolbar">
                    <button onclick="saveFile('tasks')">Save Tasks</button>
                </div>
                <textarea id="tasks-content" placeholder="Enter tasks in markdown format with checkboxes..."></textarea>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let currentContent = { requirements: '', design: '', tasks: '' };

            // Load files on startup
            vscode.postMessage({ command: 'loadFiles' });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'filesLoaded':
                        currentContent = message.content;
                        updateTextareas();
                        break;
                }
            });

            function showTab(tabName) {
                // Hide all content
                const contents = document.querySelectorAll('.content');
                contents.forEach(content => content.classList.remove('active'));
                
                // Remove active from all tabs
                const tabs = document.querySelectorAll('.tab');
                tabs.forEach(tab => tab.classList.remove('active'));
                
                // Show selected content and tab
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');
            }

            function saveFile(type) {
                const content = document.getElementById(type + '-content').value;
                vscode.postMessage({
                    command: 'saveFile',
                    type: type,
                    content: content
                });
            }

            function updateTextareas() {
                document.getElementById('requirements-content').value = currentContent.requirements || getDefaultContent('requirements');
                document.getElementById('design-content').value = currentContent.design || getDefaultContent('design');
                document.getElementById('tasks-content').value = currentContent.tasks || getDefaultContent('tasks');
            }

            function getDefaultContent(type) {
                switch(type) {
                    case 'requirements':
                        return \`# Requirements Document\n\n## Introduction\n[Introduction text here]\n\n## Requirements\n\n### Requirement 1\n**User Story:** As a [role], I want [feature], so that [benefit]\n\n#### Acceptance Criteria\nThis section should have EARS requirements\n1. WHEN [event] THEN [system] SHALL [response]\n2. IF [precondition] THEN [system] SHALL [response]\n\n### Requirement 2\n**User Story:** As a [role], I want [feature], so that [benefit]\n\n#### Acceptance Criteria\n1. WHEN [event] THEN [system] SHALL [response]\n2. WHEN [event] AND [condition] THEN [system] SHALL [response]\n\`;
                    case 'design':
                        return \`# Design Document\n\n## Architecture Overview\n\\\`\\\`\\\`mermaid\ngraph TD\n    A[User Interface] --> B[Business Logic]\n    B --> C[Data Layer]\n    C --> D[Storage]\n\\\`\\\`\\\`\n\n## System Components\n\n### Component 1\nDescription of component 1\n\n### Component 2  \nDescription of component 2\n\n## Data Flow\n\\\`\\\`\\\`mermaid\nsequenceDiagram\n    participant U as User\n    participant S as System\n    participant D as Database\n    \n    U->>S: Request\n    S->>D: Query\n    D->>S: Response\n    S->>U: Result\n\\\`\\\`\\\`\n\`;
                    case 'tasks':
                        return \`# Task List\n\n## Sprint 1\n\n- [ ] Task 1: Implement user authentication\n  - [ ] Create login form\n  - [ ] Add validation\n  - [ ] Integrate with backend API\n\n- [ ] Task 2: Design database schema\n  - [x] Define user table\n  - [ ] Define product table\n  - [ ] Create relationships\n\n- [ ] Task 3: Setup project infrastructure\n  - [x] Initialize repository\n  - [x] Setup CI/CD pipeline\n  - [ ] Configure deployment\n\`;
                    default:
                        return '';
                }
            }
        </script>
    </body>
    </html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = vscode.commands.registerCommand('specdev.openSpecDev', () => {
    SpecDevProvider.createOrShow(context.extensionUri);
  });

  // /specdev init
  const initCmd = vscode.commands.registerCommand('specdev.init', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;
    const specdevPath = path.join(workspaceFolder.uri.fsPath, '.specdev');
    if (!fs.existsSync(specdevPath)) fs.mkdirSync(specdevPath, { recursive: true });
    const templates = {
      'requirements.md': '# Requirements Document\n\n## Introduction\n[Introduction text here]\n',
      'design.md': '# Design Document\n\n## Architecture Overview\n',
      'tasks.md': '# Task List\n\n- [ ] Example task\n',
    };
    for (const [file, content] of Object.entries(templates)) {
      const filePath = path.join(specdevPath, file);
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content, 'utf8');
    }
    // Generate .cursor/rules files
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursor', 'rules');
    if (!fs.existsSync(cursorRulesPath)) fs.mkdirSync(cursorRulesPath, { recursive: true });
    // Copy rules from prompts and rules/spec.md and tasks.md
    const specSrc = path.join(__dirname, '..', 'prompts and rules', 'spec.md');
    const tasksSrc = path.join(__dirname, '..', 'prompts and rules', 'tasks.md');
    const specDest = path.join(cursorRulesPath, 'specdev-spec.mdc');
    const tasksDest = path.join(cursorRulesPath, 'specdev-tasks.mdc');
    if (fs.existsSync(specSrc)) fs.copyFileSync(specSrc, specDest);
    if (fs.existsSync(tasksSrc)) fs.copyFileSync(tasksSrc, tasksDest);
    vscode.window.showInformationMessage('SpecDev initialized and .cursor/rules files created.');
  });

  // /specdev generate requirements from prompt
  const genReqCmd = vscode.commands.registerCommand('specdev.generateRequirementsFromPrompt', async () => {
    // TODO: Use Cursor GPT API to rewrite prompt to requirements (stub)
    vscode.window.showInformationMessage('Generating requirements from prompt... (stub)');
  });

  // /specdev generate design from requirements
  const genDesignCmd = vscode.commands.registerCommand('specdev.generateDesignFromRequirements', async () => {
    // TODO: Use Cursor GPT API to generate design from requirements (stub)
    vscode.window.showInformationMessage('Generating design from requirements... (stub)');
  });

  // /specdev generate tasks from design
  const genTasksCmd = vscode.commands.registerCommand('specdev.generateTasksFromDesign', async () => {
    // TODO: Use Cursor GPT API to generate tasks from design (stub)
    vscode.window.showInformationMessage('Generating tasks from design... (stub)');
  });

  context.subscriptions.push(provider, initCmd, genReqCmd, genDesignCmd, genTasksCmd);
}

export function deactivate() {}
