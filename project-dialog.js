// Get references to DOM elements
const projectSelect = document.getElementById('project-select');
const newProjectNameInput = document.getElementById('new-project-name');
const openProjectBtn = document.getElementById('open-project-btn');
const createProjectBtn = document.getElementById('create-project-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Disable the open button initially (until a project is selected)
openProjectBtn.disabled = true;
openProjectBtn.style.opacity = '0.6';
openProjectBtn.style.cursor = 'not-allowed';

// When the page loads, fetch the list of existing projects
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get the list of projects from the main process
    const projects = await window.electronAPI.getProjects();
    
    // Clear any existing options (except the placeholder)
    while (projectSelect.options.length > 1) {
      projectSelect.remove(1);
    }
    
    // Add projects to the select dropdown
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project;
      option.textContent = project;
      projectSelect.appendChild(option);
    });
    
    // If there are no projects, show a message
    if (projects.length === 0) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No existing projects found";
      option.disabled = true;
      projectSelect.appendChild(option);
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    showError('Failed to load projects. Please try again.');
  }
});

// Enable/disable the open button based on selection
projectSelect.addEventListener('change', () => {
  if (projectSelect.value) {
    openProjectBtn.disabled = false;
    openProjectBtn.style.opacity = '1';
    openProjectBtn.style.cursor = 'pointer';
  } else {
    openProjectBtn.disabled = true;
    openProjectBtn.style.opacity = '0.6';
    openProjectBtn.style.cursor = 'not-allowed';
  }
});

// Handle opening an existing project
openProjectBtn.addEventListener('click', async () => {
  const selectedProject = projectSelect.value;
  
  if (!selectedProject) {
    showError('Please select a project first');
    return;
  }
  
  try {
    const result = await window.electronAPI.openProject(selectedProject);
    
    if (result.success) {
      // Close the dialog and notify the parent window
      window.electronAPI.closeDialog('project-selected', { 
        projectName: selectedProject,
        projectPath: result.projectPath
      });
    } else {
      showError(result.message || 'Failed to open project');
    }
  } catch (error) {
    console.error('Error opening project:', error);
    showError('An error occurred while opening the project');
  }
});

// Handle creating a new project
createProjectBtn.addEventListener('click', async () => {
  const projectName = newProjectNameInput.value.trim();
  
  if (!projectName) {
    showError('Please enter a project name');
    return;
  }
  
  // Validate project name (no special characters)
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(projectName)) {
    showError('Project name contains invalid characters');
    return;
  }
  
  try {
    const result = await window.electronAPI.createProject(projectName);
    
    if (result.success) {
      // Close the dialog and notify the parent window
      window.electronAPI.closeDialog('project-created', {
        projectName: projectName,
        projectPath: result.projectPath
      });
    } else {
      showError(result.message || 'Failed to create project');
    }
  } catch (error) {
    console.error('Error creating project:', error);
    showError('An error occurred while creating the project');
  }
});

// Handle cancel button
cancelBtn.addEventListener('click', () => {
  window.electronAPI.closeDialog('cancelled');
});

// Helper function to show errors
function showError(message) {
  // Create a simple error notification
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #f44336;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Listen for theme messages from the main process
window.electronAPI.onSetTheme((theme) => {
  if (theme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }
});
