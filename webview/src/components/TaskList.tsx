import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface TaskListProps {
  content: string;
  onChange: (content: string) => void;
  onTaskComplete?: (taskName: string) => void;
  activeTaskIndex?: number;
  onStartNextTask?: (nextIndex: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({ content, onChange, onTaskComplete, activeTaskIndex, onStartNextTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [completedTask, setCompletedTask] = useState<string | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  // Debounced auto-save
  useEffect(() => {
    if (isEditing) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onChange(editContent);
      }, 800);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editContent, isEditing, onChange]);

  const handleSave = () => {
    onChange(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  // Parse tasks and enforce only one active
  const parseTasks = () => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const isTask = line.match(/^- \[.\] (.+)/);
      return {
        line,
        isTask: !!isTask,
        taskName: isTask ? isTask[1] : '',
        checked: line.includes('- [x]'),
        index: idx
      };
    });
  };

  const tasks = parseTasks();
  const firstIncomplete = tasks.findIndex(t => t.isTask && !t.checked);

  const toggleTask = (lineIndex: number) => {
    if (lineIndex !== firstIncomplete) return; // Only allow the first incomplete task
    const lines = content.split('\n');
    const line = lines[lineIndex];
    if (line.includes('- [ ]')) {
      lines[lineIndex] = line.replace('- [ ]', '- [x]');
      setCompletedTask(tasks[lineIndex].taskName);
      setShowNextPrompt(true);
      if (onTaskComplete) onTaskComplete(tasks[lineIndex].taskName);
    }
    const newContent = lines.join('\n');
    onChange(newContent);
  };

  const handleStartNext = () => {
    setShowNextPrompt(false);
    setCompletedTask(null);
    if (onStartNextTask && firstIncomplete + 1 < tasks.length) {
      onStartNextTask(firstIncomplete + 1);
    }
  };

  const TaskCheckbox = ({ checked, lineIndex }: { checked: boolean; lineIndex: number }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={lineIndex !== firstIncomplete}
      onChange={() => toggleTask(lineIndex)}
      className={lineIndex === firstIncomplete ? 'task-checkbox active' : 'task-checkbox'}
    />
  );

  const renderTaskContent = () => {
    const lines = content.split('\n');
    let currentLineIndex = 0;
    return (
      <ReactMarkdown
        components={{
          li: ({ node, className, children, ...props }) => {
            const lineContent = lines[currentLineIndex] || '';
            const isTask = lineContent.includes('- [ ]') || lineContent.includes('- [x]');
            const isChecked = lineContent.includes('- [x]');
            const isActive = currentLineIndex === firstIncomplete;
            currentLineIndex++;
            if (isTask) {
              return (
                <li className={`task-item ${isChecked ? 'completed' : ''} ${isActive ? 'active-task' : ''}`} {...props}>
                  <TaskCheckbox checked={isChecked} lineIndex={currentLineIndex - 1} />
                  <span className="task-content">{children}</span>
                </li>
              );
            }
            return <li className={className} {...props}>{children}</li>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="task-list">
      {showNextPrompt && completedTask && (
        <div className="task-next-banner">
          <span>Task "{completedTask}" is complete. Should I start the next task?</span>
          <button onClick={handleStartNext}>Y</button>
          <button onClick={() => setShowNextPrompt(false)}>N</button>
        </div>
      )}
      <div className="editor-toolbar">
        {!isEditing ? (
          <button 
            className="edit-button"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        ) : (
          <div className="edit-controls">
            <button 
              className="save-button"
              onClick={handleSave}
            >
              Save
            </button>
            <button 
              className="cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="task-content">
        {isEditing ? (
          <textarea
            className="task-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter task list in markdown format..."
          />
        ) : (
          <div className="task-preview">
            {renderTaskContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
