// renderer/app.js
import React, { useState, useEffect } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, Card, 
  CardContent, Select, MenuItem, TextField
} from '@material-ui/core';

function App() {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [projectInfo, setProjectInfo] = useState({});
  
  useEffect(() => {
    // Load tools and project info on component mount
    async function loadData() {
      const toolsList = await window.electronAPI.getTools();
      setTools(toolsList);
      
      const projectData = await window.electronAPI.getProjectInfo();
      setProjectInfo(projectData);
      
      if (toolsList.length > 0) {
        setSelectedTool(toolsList[0].name);
      }
    }
    
    loadData();
  }, []);
  
  const handleSelectProject = async () => {
    const projects = await window.electronAPI.selectProjectDialog();
    // Show modal dialog with projects list...
  };
  
  const handleRunTool = async () => {
    // Open tool setup dialog...
    // Then run the tool with selected options
  };
  
  return (
    <div className="app">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">storygrind</Typography>
          <div style={{ flexGrow: 1 }} />
          <Button color="inherit">Quit</Button>
        </Toolbar>
      </AppBar>
      
      <div className="content">
        <Card className="project-card">
          <CardContent>
            <div className="project-header">
              <div>
                <Typography variant="h6">Current Project</Typography>
                {projectInfo.current_project ? (
                  <>
                    <Typography>{projectInfo.current_project}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Project Path: {projectInfo.current_project_path}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    No project selected
                  </Typography>
                )}
              </div>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSelectProject}
              >
                Select Project
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="tools-card">
          <CardContent>
            <Typography variant="h6">Select a tool to run:</Typography>
            
            <Select
              fullWidth
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
            >
              {tools.map(tool => (
                <MenuItem key={tool.name} value={tool.name}>
                  {tool.title}
                </MenuItem>
              ))}
            </Select>
            
            {/* Tool description */}
            <Typography variant="caption" color="textSecondary" style={{ marginTop: 16 }}>
              {tools.find(t => t.name === selectedTool)?.description || ''}
            </Typography>
            
            <div className="action-buttons">
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleRunTool}
              >
                Setup & Run
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
