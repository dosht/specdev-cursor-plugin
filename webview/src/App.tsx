import React, { useState, useEffect } from 'react';
import './App.css';
import MarkdownEditor from './components/MarkdownEditor';
import TaskList from './components/TaskList';

type TabType = 'requirements' | 'design' | 'tasks';

interface FileContent {
  requirements: string;
  design: string;
  tasks: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('requirements');
  const [fileContent, setFileContent] = useState<FileContent>({
    requirements: '',
    design: '',
    tasks: ''
  });
  // Review status for each doc
  const [reviewStatus, setReviewStatus] = useState<{
    requirements: 'pending' | 'approved' | 'rejected';
    design: 'pending' | 'approved' | 'rejected';
    tasks: 'pending' | 'approved' | 'rejected';
  }>({
    requirements: 'pending',
    design: 'pending',
    tasks: 'pending',
  });
  const [showAgentInfo, setShowAgentInfo] = useState(true);

  useEffect(() => {
    loadSpecDevFiles();
  }, []);

  const loadSpecDevFiles = async () => {
    try {
      // This would communicate with the VS Code extension to load files
      const content = await window.vscode?.postMessage({ 
        command: 'loadFiles' 
      });
      if (content) {
        setFileContent(content);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const saveFile = async (type: TabType, content: string) => {
    setFileContent(prev => ({ ...prev, [type]: content }));
    
    // Save to .specdev folder
    try {
      await window.vscode?.postMessage({
        command: 'saveFile',
        type,
        content
      });
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const getInitialContent = (type: TabType): string => {
    switch (type) {
      case 'requirements':
        return `# Requirements Document

## Introduction
[Introduction text here]

## Requirements

### Requirement 1
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
This section should have EARS requirements
1. WHEN [event] THEN [system] SHALL [response]
2. IF [precondition] THEN [system] SHALL [response]

### Requirement 2
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
1. WHEN [event] THEN [system] SHALL [response]
2. WHEN [event] AND [condition] THEN [system] SHALL [response]
`;

      case 'design':
        return `# Design Document

## Architecture Overview
\`\`\`mermaid
graph TD
    A[User Interface] --> B[Business Logic]
    B --> C[Data Layer]
    C --> D[Storage]
\`\`\`

## System Components

### Component 1
Description of component 1

### Component 2  
Description of component 2

## Data Flow
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as System
    participant D as Database
    
    U->>S: Request
    S->>D: Query
    D->>S: Response
    S->>U: Result
\`\`\`
`;

      case 'tasks':
        return `# Task List

## Sprint 1

- [ ] Task 1: Implement user authentication
  - [ ] Create login form
  - [ ] Add validation
  - [ ] Integrate with backend API

- [ ] Task 2: Design database schema
  - [x] Define user table
  - [ ] Define product table
  - [ ] Create relationships

- [ ] Task 3: Setup project infrastructure
  - [x] Initialize repository
  - [x] Setup CI/CD pipeline
  - [ ] Configure deployment
`;
      default:
        return '';
    }
  };

  // Review checkpoint handlers
  const handleReview = (type: TabType, status: 'approved' | 'rejected') => {
    setReviewStatus(prev => ({ ...prev, [type]: status }));
  };
  const handleRegenerate = (type: TabType) => {
    // Send message to backend to regenerate (to be implemented)
    window.vscode?.postMessage({ command: 'regenerate', type });
    setReviewStatus(prev => ({ ...prev, [type]: 'pending' }));
  };

  // Visual indicator for incomplete/pending review
  const renderStatusBanner = () => {
    const status = reviewStatus[activeTab];
    if (status === 'pending') {
      return <div className="status-banner">Pending review: Please review and approve this document.</div>;
    }
    if (status === 'rejected') {
      return <div className="status-banner rejected">Document rejected. Please edit and regenerate.</div>;
    }
    return null;
  };

  const currentContent = fileContent[activeTab] || getInitialContent(activeTab);

  return (
    <div className="specdev-app">
      {showAgentInfo && (
        <div className="agent-info-banner">
          <span>
            <b>Note:</b> Document generation (requirements, design, tasks) is performed by the <b>Cursor agent/chat</b>, not directly by this extension. Use the agent to generate and review documents. <a href="https://github.com/yourusername/specdev-cursor-plugin#kiro-workflow--agent-integration" target="_blank" rel="noopener noreferrer">Learn more</a>.
          </span>
          <button className="close-banner" onClick={() => setShowAgentInfo(false)}>×</button>
        </div>
      )}
      <header className="app-header">
        <h1>SpecDev - Specification Development</h1>
      </header>
      
      <nav className="tab-navigation">
        {(['requirements', 'design', 'tasks'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {renderStatusBanner()}
        {activeTab === 'tasks' ? (
          <TaskList
            content={currentContent}
            onChange={(content) => saveFile('tasks', content)}
            // Add more props for review and workflow as needed
          />
        ) : (
          <MarkdownEditor
            content={currentContent}
            onChange={(content) => saveFile(activeTab, content)}
            enableMermaid={activeTab === 'design'}
            reviewStatus={reviewStatus[activeTab]}
            onReview={(status) => handleReview(activeTab, status)}
            onRegenerate={() => handleRegenerate(activeTab)}
          />
        )}
      </main>
    </div>
  );
};

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
    };
  }
}

export default App;
