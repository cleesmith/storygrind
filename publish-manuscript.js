/**
 * PublishManuscript - Publish completed manuscripts to book collection
 * Creates SVG covers and updates book index for projects with existing manuscript files
 */

const ToolBase = require('./tool-base');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const appState = require('./state.js');

class PublishManuscript extends ToolBase {
  /**
   * Constructor
   * @param {string} name - Tool name
   * @param {Object} config - Tool configuration
   */
  constructor(name, config = {}) {
    super(name, config);
    this.authorName = config.authorName || 'Anonymous';
  }

  /**
   * Execute the tool
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Execution result
   */
  async execute(options) {
    const projectPath = appState.CURRENT_PROJECT_PATH;
    
    if (!projectPath) {
      const errorMsg = 'Error: No project selected. Please select a project first.';
      this.emitOutput(errorMsg);
      throw new Error('No project selected');
    }

    try {
      // Check if this is an unpublish operation
      if (options.unpublish === 'yes') {
        return await this.unpublishBook(projectPath, options);
      }

      // Check if manuscript files exist
      const manuscriptFiles = await this.findManuscriptFiles(projectPath);
      
      if (manuscriptFiles.length === 0) {
        let errorMsg = `\nError: can not find: manuscript_*.html and/or manuscript_*.epub files.\n`;
        errorMsg += `                          note: * refers to the file's timestamp\n`;
        errorMsg += '\nBefore publishing, you must run either or both:\n\n';
        errorMsg += 'Manuscript to HTML Converter\n\n';
        errorMsg += 'Manuscript to EPUB Converter\n\n';
        errorMsg += `... see both converters in: "Run a non-AI tool:" on the main screen.`;
        this.emitOutput(errorMsg);
        return {
          success: false,
          message: errorMsg,
          outputFiles: []
        };
      }

      this.emitOutput(`Project: ${appState.CURRENT_PROJECT}\n`);

      // Show only the selected file
      const selectedFile = options.manuscript_file;
      const selectedFileName = path.basename(selectedFile);
      
      this.emitOutput(`\nUsing manuscript file: ${selectedFileName}\n`);

      // Extract project name from path
      const projectName = path.basename(projectPath);
      
      // Use user-provided title or fall back to formatted project name
      const displayTitle = options.title || this.formatProjectName(projectName);
      
      // Get manuscript base name from options
      const manuscriptBaseName = selectedFile ? path.basename(selectedFile, path.extname(selectedFile)) : 'manuscript';
      
      this.emitOutput(`\nTitle: ${displayTitle}\n`);

      appState.setAuthorName(options.author);

      // Generate SVG cover with user-provided title and author
      const svgOutputPath = await this.generateSVGCover(projectName, displayTitle, appState.AUTHOR_NAME);
      
      // Update book index and get the HTML file used
      const htmlFile = await this.updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, options.purchase_url || '#');

      this.emitOutput(`\nPublication complete!\n`);
      
      // Only return HTML files for editing (no SVG files)
      const editableFiles = [];
      if (htmlFile) {
        const projectDir = path.join(appState.PROJECTS_DIR, projectName);
        const htmlPath = path.join(projectDir, htmlFile);
        if (fs.existsSync(htmlPath)) {
          editableFiles.push(htmlPath);
        }
      }

      return {
        success: true,
        message: `Published ${displayTitle} successfully`,
        outputFiles: editableFiles,
        stats: {
          manuscriptFiles: manuscriptFiles.length,
          projectName: projectName,
          displayTitle: displayTitle
        }
      };

    } catch (error) {
      console.error('Error in Publish Manuscript:', error);
      this.emitOutput(`\nError: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Find manuscript HTML or EPUB files in the project directory
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Array>} - Array of manuscript file paths
   */
  async findManuscriptFiles(projectPath) {
    const files = await fsPromises.readdir(projectPath);
    const manuscriptFiles = files.filter(file => {
      const fileName = file.toLowerCase();
      return (fileName.startsWith('manuscript_') && 
              (fileName.endsWith('.html') || fileName.endsWith('.epub')));
    });
    
    return manuscriptFiles.map(file => path.join(projectPath, file));
  }

  /**
   * Format project name for display
   * @param {string} projectName - Raw project name
   * @returns {string} - Formatted display title
   */
  formatProjectName(projectName) {
    let title = projectName;
    
    // Handle camelCase and underscores
    title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
    title = title.replace(/_/g, ' ');
    
    // Convert to Title Case
    title = title.replace(/\b\w+/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    return title.trim();
  }

  /**
   * Generate SVG cover from embedded template
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} authorName - Author name
   * @returns {Promise<string>} - Path to generated SVG file
   */
  // async generateSVGCover(projectName, displayTitle, authorName) {
  //   const imagesDir = path.join(appState.PROJECTS_DIR, 'images');
  //   const outputPath = path.join(imagesDir, `${projectName}.svg`);
  //   await fsPromises.mkdir(imagesDir, { recursive: true });

  //   // Gradient logic
  //   const getRandomGradient = () => {
  //     const gradientPresets = [
  //       { start: '#CC4444', end: '#3AA399' }, { start: '#C48829', end: '#4A5CC8' },
  //       { start: '#C94A64', end: '#5566C9' }, { start: '#C85A7A', end: '#CCB030' },
  //       { start: '#4455B8', end: '#5A3B7A' }, { start: '#1A77C1', end: '#C23629' },
  //       { start: '#3444A8', end: '#A040A0' }, { start: '#0077B7', end: '#66A8A5' },
  //       { start: '#0D7766', end: '#2BBD5D' }, { start: '#448925', end: '#88B851' },
  //       { start: '#CC7844', end: '#CC5566' }, { start: '#9B2951', end: '#1A1F59' },
  //       { start: '#6E25B2', end: '#3800B0' }, { start: '#CC0077', end: '#392A38' },
  //       { start: '#903772', end: '#C14B61' }, { start: '#2D2F36', end: '#3466C2' },
  //       { start: '#2A0029', end: '#096B71' }, { start: '#1A1724', end: '#746B83' },
  //       { start: '#4F356D', end: '#414F7D' }, { start: '#24313C', end: '#2A76A9' }
  //     ];
  //     const gradient = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];
  //     if (Math.random() < 0.2) return { start: gradient.end, end: gradient.start };
  //     return gradient;
  //   };

  //   // Enhanced Abstract Art Generator
  //   function getAbstractArt(innerX, innerY, innerWidth, innerHeight) {
  //     const shapes = [];
  //     const colors = [
  //       '#ffffff', '#ededed', '#c9f1fa', '#ffa5b0', '#ffd6a5', '#f3f0ff', '#b9fbc0', '#c0b6f7', '#fff5c8',
  //       '#a9def9', '#e4c1f9', '#f694c1', '#f6c6ea', '#b8bedd', '#d0f4de', '#fed6bc', '#c7ceea', '#e2f0cb'
  //     ];
  //     const numShapes = 20 + Math.floor(Math.random() * 7);
  //     for (let i = 0; i < numShapes; i++) {
  //       const shapeTypeRand = Math.random();
  //       const color = colors[Math.floor(Math.random() * colors.length)];
  //       const opacity = 0.09 + Math.random() * 0.18; // 0.09–0.27
  //       if (shapeTypeRand < 0.27) {
  //         // Circles
  //         const maxR = Math.min(innerWidth, innerHeight) / 4.5;
  //         const r = 38 + Math.random() * (maxR - 38);
  //         const cx = innerX + r + Math.random() * (innerWidth - 2*r);
  //         const cy = innerY + r + Math.random() * (innerHeight - 2*r);
  //         shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
  //       } else if (shapeTypeRand < 0.46) {
  //         // Triangles/Quads
  //         const px = [];
  //         const baseX = innerX + 20 + Math.random() * (innerWidth - 40);
  //         const baseY = innerY + 20 + Math.random() * (innerHeight - 40);
  //         const pts = (Math.random() < 0.7 ? 3 : 4);
  //         for (let p = 0; p < pts; p++) {
  //           const angle = (Math.PI * 2 / pts) * p + Math.random() * 0.65;
  //           const radius = 36 + Math.random() * 95;
  //           const x = baseX + Math.cos(angle) * radius;
  //           const y = baseY + Math.sin(angle) * radius;
  //           px.push(`${Math.max(innerX, Math.min(innerX+innerWidth, x)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, y)).toFixed(1)}`);
  //         }
  //         shapes.push(`<polygon points="${px.join(' ')}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
  //       } else if (shapeTypeRand < 0.63) {
  //         // Wavy Paths
  //         const startX = innerX + 14 + Math.random() * (innerWidth - 28);
  //         const startY = innerY + 14 + Math.random() * (innerHeight - 28);
  //         const curveX = innerX + 14 + Math.random() * (innerWidth - 28);
  //         const curveY = innerY + 14 + Math.random() * (innerHeight - 28);
  //         const endX = innerX + 14 + Math.random() * (innerWidth - 28);
  //         const endY = innerY + 14 + Math.random() * (innerHeight - 28);
  //         shapes.push(`<path d="M${startX},${startY} Q${curveX},${curveY} ${endX},${endY}" stroke="${color}" stroke-width="${16 + Math.random() * 24}" fill="none" opacity="${opacity.toFixed(2)}" />`);
  //       } else if (shapeTypeRand < 0.83) {
  //         // Ellipses
  //         const rx = 28 + Math.random() * 90;
  //         const ry = 20 + Math.random() * 90;
  //         const cx = innerX + rx + Math.random() * (innerWidth - 2*rx);
  //         const cy = innerY + ry + Math.random() * (innerHeight - 2*ry);
  //         shapes.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
  //       } else {
  //         // Abstract rectangles ("bars")
  //         const w = 40 + Math.random() * 120;
  //         const h = 10 + Math.random() * 90;
  //         const x = innerX + Math.random() * (innerWidth - w);
  //         const y = innerY + Math.random() * (innerHeight - h);
  //         const angle = Math.random() * 360;
  //         shapes.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${angle.toFixed(1)},${(x+w/2).toFixed(1)},${(y+h/2).toFixed(1)})" rx="${(h/3).toFixed(1)}" />`);
  //       }
  //     }
  //     return shapes.join('\n    ');
  //   }

  //   // Semicolon newlines (user control), up to 8 lines
  //   const splitTitle = (title) => {
  //     const maxLines = 20;
  //     let rawLines = title.toUpperCase().split(';').map(l => l.trim()).filter(l => l);
  //     if (rawLines.length > maxLines) {
  //       rawLines = rawLines.slice(0, maxLines - 1).concat([
  //         rawLines.slice(maxLines - 1).join(' ')
  //       ]);
  //     }
  //     return rawLines.map(line => {
  //       const maxWordLen = 20;
  //       const words = line.split(' ');
  //       let safeLine = '';
  //       for (let word of words) {
  //         if (word.length > maxWordLen) {
  //           let chunks = word.match(new RegExp(`.{1,${maxWordLen}}`, 'g'));
  //           safeLine += (safeLine ? ' ' : '') + chunks.join(' ');
  //         } else {
  //           safeLine += (safeLine ? ' ' : '') + word;
  //         }
  //       }
  //       return safeLine;
  //     });
  //   };

  //   const testSVGTextWidth = (text, size) => {
  //     return text.length * size * 0.56;
  //   };

  //   // Inner rectangle config
  //   const innerX = 120, innerY = 120, innerWidth = 1360, innerHeight = 2320;
  //   const topPadding = 90, bottomPadding = 180;
  //   const sidePadding = 48;
  //   const usableWidth = innerWidth - 2 * sidePadding;
  //   const usableHeight = innerHeight - topPadding - bottomPadding;

  //   // Gradient and abstract art
  //   const gradient = getRandomGradient();
  //   const artSVG = getAbstractArt(innerX, innerY, innerWidth, innerHeight);
  //   const titleLines = splitTitle(displayTitle);
  //   const numLines = titleLines.length;

  //   // Fit font size so all lines fit horizontally and vertically
  //   let fontSize = 180;
  //   let lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
  //   const minFontSize = 44;
  //   while (fontSize > minFontSize) {
  //     lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
  //     let fits = true;
  //     for (const line of titleLines) {
  //       if (testSVGTextWidth(line, fontSize) > usableWidth) {
  //         fits = false;
  //         break;
  //       }
  //     }
  //     const totalTitleHeight = fontSize * numLines + lineSpacing * (numLines - 1);
  //     if (totalTitleHeight > usableHeight) fits = false;
  //     if (fits) break;
  //     fontSize -= 2;
  //   }
  //   if (fontSize < minFontSize) fontSize = minFontSize;
  //   lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
  //   const firstLineY = innerY + topPadding + fontSize;

  //   const titleSVG = titleLines.map((line, index) => {
  //     const y = firstLineY + index * (fontSize + lineSpacing);
  //     return `<text x="${innerX + innerWidth/2}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line}</text>`;
  //   }).join('\n  ');

  //   // Author name near bottom
  //   const authorY = innerY + innerHeight - bottomPadding/2;
  //   const authorText = (authorName || this.authorName || '').toUpperCase();

  //   // SVG template
  //   const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2560" width="1600" height="2560">
  //     <defs>
  //       <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
  //         <stop offset="0%" stop-color="${gradient.start}" />
  //         <stop offset="100%" stop-color="${gradient.end}" />
  //       </linearGradient>
  //       <linearGradient id="spineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  //         <stop offset="0%" stop-color="#000000" stop-opacity="0.3" />
  //         <stop offset="30%" stop-color="#000000" stop-opacity="0.1" />
  //         <stop offset="100%" stop-color="#000000" stop-opacity="0" />
  //       </linearGradient>
  //       <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
  //         <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
  //         <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2" />
  //         <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
  //       </linearGradient>
  //       <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
  //         <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.5" />
  //       </filter>
  //       <filter id="bookShadow" x="-50%" y="-50%" width="200%" height="200%">
  //         <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
  //         <feOffset dx="10" dy="10" result="offsetblur"/>
  //         <feFlood flood-color="#000000" flood-opacity="0.3"/>
  //         <feComposite in2="offsetblur" operator="in"/>
  //         <feMerge>
  //           <feMergeNode/>
  //           <feMergeNode in="SourceGraphic"/>
  //         </feMerge>
  //       </filter>
  //     </defs>
  //     <rect x="50" y="50" width="1500" height="2460" fill="#000000" opacity="0.2" rx="15" ry="15" />
  //     <rect x="40" y="40" width="1520" height="2480" fill="url(#bgGradient)" rx="12" ry="12" filter="url(#bookShadow)" />
  //     <rect x="40" y="40" width="80" height="2480" fill="url(#spineGradient)" rx="12" ry="12" />
  //     <rect x="40" y="40" width="1520" height="3" fill="url(#edgeHighlight)" />
  //     <rect x="1540" y="40" width="20" height="2480" fill="#000000" opacity="0.1" rx="12" ry="12" />
  //     <rect x="40" y="2510" width="1520" height="10" fill="#000000" opacity="0.15" rx="12" ry="12" />
  //     <rect x="120" y="120" width="1360" height="2320" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.1" rx="8" ry="8" />
  //     <!-- Abstract Art Shapes -->
  //     <g>
  //       ${artSVG}
  //     </g>
  //     <!-- Title -->
  //     ${titleSVG}
  //     <!-- Author name -->
  //     <text x="${innerX + innerWidth/2}" y="${authorY}" font-family="Arial, sans-serif" font-size="90" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${authorText}</text>
  //   </svg>`;

  //   await fsPromises.writeFile(outputPath, svgTemplate, 'utf8');
  //   this.emitOutput(`\nGenerated SVG cover: ${outputPath}\n`);
  //   this.emitOutput(`Color gradient: ${gradient.start} to ${gradient.end}\n`);
  //   return outputPath;
  // }
  async generateSVGCover(projectName, displayTitle, authorName) {
    const imagesDir = path.join(appState.PROJECTS_DIR, 'images');
    const outputPath = path.join(imagesDir, `${projectName}.svg`);
    await fsPromises.mkdir(imagesDir, { recursive: true });

    // Gradient logic (same)
    const getRandomGradient = () => {
      const gradientPresets = [
        { start: '#CC4444', end: '#3AA399' }, { start: '#C48829', end: '#4A5CC8' },
        { start: '#C94A64', end: '#5566C9' }, { start: '#C85A7A', end: '#CCB030' },
        { start: '#4455B8', end: '#5A3B7A' }, { start: '#1A77C1', end: '#C23629' },
        { start: '#3444A8', end: '#A040A0' }, { start: '#0077B7', end: '#66A8A5' },
        { start: '#0D7766', end: '#2BBD5D' }, { start: '#448925', end: '#88B851' },
        { start: '#CC7844', end: '#CC5566' }, { start: '#9B2951', end: '#1A1F59' },
        { start: '#6E25B2', end: '#3800B0' }, { start: '#CC0077', end: '#392A38' },
        { start: '#903772', end: '#C14B61' }, { start: '#2D2F36', end: '#3466C2' },
        { start: '#2A0029', end: '#096B71' }, { start: '#1A1724', end: '#746B83' },
        { start: '#4F356D', end: '#414F7D' }, { start: '#24313C', end: '#2A76A9' }
      ];
      const gradient = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];
      if (Math.random() < 0.2) return { start: gradient.end, end: gradient.start };
      return gradient;
    };

    // Advanced Abstract Art Generator: adds stars, blobs, zigzags
    function getAbstractArt(innerX, innerY, innerWidth, innerHeight) {
      const shapes = [];
      const colors = [
        '#ffffff', '#ededed', '#c9f1fa', '#ffa5b0', '#ffd6a5', '#f3f0ff', '#b9fbc0', '#c0b6f7', '#fff5c8',
        '#a9def9', '#e4c1f9', '#f694c1', '#f6c6ea', '#b8bedd', '#d0f4de', '#fed6bc', '#c7ceea', '#e2f0cb'
      ];
      const numShapes = 28 + Math.floor(Math.random() * 9); // 28–36 shapes
      for (let i = 0; i < numShapes; i++) {
        const shapeTypeRand = Math.random();
        const color = colors[Math.floor(Math.random() * colors.length)];
        const opacity = 0.08 + Math.random() * 0.19; // 0.08–0.27
        if (shapeTypeRand < 0.15) {
          // Circles
          const maxR = Math.min(innerWidth, innerHeight) / 5.5;
          const r = 22 + Math.random() * (maxR - 22);
          const cx = innerX + r + Math.random() * (innerWidth - 2*r);
          const cy = innerY + r + Math.random() * (innerHeight - 2*r);
          shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.26) {
          // Stars (5 or 6 points)
          const cx = innerX + 40 + Math.random() * (innerWidth - 80);
          const cy = innerY + 40 + Math.random() * (innerHeight - 80);
          const points = Math.random() < 0.7 ? 5 : 6;
          const outer = 32 + Math.random() * 55;
          const innerR = outer * (0.38 + Math.random()*0.22);
          let starPts = [];
          for (let j = 0; j < points * 2; j++) {
            const ang = Math.PI * j / points;
            const r = (j % 2 === 0) ? outer : innerR;
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            starPts.push(`${Math.max(innerX, Math.min(innerX+innerWidth, x)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, y)).toFixed(1)}`);
          }
          shapes.push(`<polygon points="${starPts.join(' ')}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.38) {
          // Blobs: SVG path, 7–9 points, random radii
          const cx = innerX + 60 + Math.random() * (innerWidth - 120);
          const cy = innerY + 60 + Math.random() * (innerHeight - 120);
          const pts = 7 + Math.floor(Math.random()*3);
          const baseR = 38 + Math.random() * 36;
          let d = '';
          for (let k = 0; k < pts; k++) {
            const ang = Math.PI * 2 * k / pts;
            const r = baseR * (0.8 + Math.random()*0.5);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            d += (k === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
          }
          d += ` Z`;
          shapes.push(`<path d="${d}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.53) {
          // Zigzags (polyline)
          const zigX = innerX + 20 + Math.random() * (innerWidth - 40);
          const zigY = innerY + 20 + Math.random() * (innerHeight - 40);
          const zigLen = 6 + Math.floor(Math.random()*3);
          let pts = [];
          let lastX = zigX, lastY = zigY;
          const segment = 28 + Math.random() * 22;
          for (let z = 0; z < zigLen; z++) {
            lastX += segment * (z%2 === 0 ? 1 : -1);
            lastY += 22 + Math.random()*22;
            pts.push(`${Math.max(innerX, Math.min(innerX+innerWidth, lastX)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, lastY)).toFixed(1)}`);
          }
          shapes.push(`<polyline points="${zigX.toFixed(1)},${zigY.toFixed(1)} ${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${7 + Math.random()*6}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.65) {
          // Triangles/Quads
          const px = [];
          const baseX = innerX + 20 + Math.random() * (innerWidth - 40);
          const baseY = innerY + 20 + Math.random() * (innerHeight - 40);
          const pts = (Math.random() < 0.7 ? 3 : 4);
          for (let p = 0; p < pts; p++) {
            const angle = (Math.PI * 2 / pts) * p + Math.random() * 0.65;
            const radius = 36 + Math.random() * 95;
            const x = baseX + Math.cos(angle) * radius;
            const y = baseY + Math.sin(angle) * radius;
            px.push(`${Math.max(innerX, Math.min(innerX+innerWidth, x)).toFixed(1)},${Math.max(innerY, Math.min(innerY+innerHeight, y)).toFixed(1)}`);
          }
          shapes.push(`<polygon points="${px.join(' ')}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.80) {
          // Ellipses
          const rx = 18 + Math.random() * 80;
          const ry = 12 + Math.random() * 65;
          const cx = innerX + rx + Math.random() * (innerWidth - 2*rx);
          const cy = innerY + ry + Math.random() * (innerHeight - 2*ry);
          shapes.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
        } else if (shapeTypeRand < 0.95) {
          // Bars (rectangles)
          const w = 30 + Math.random() * 60;
          const h = 8 + Math.random() * 42;
          const x = innerX + Math.random() * (innerWidth - w);
          const y = innerY + Math.random() * (innerHeight - h);
          const angle = Math.random() * 360;
          shapes.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${angle.toFixed(1)},${(x+w/2).toFixed(1)},${(y+h/2).toFixed(1)})" rx="${(h/3).toFixed(1)}" />`);
        } else {
          // Wavy Paths
          const startX = innerX + 14 + Math.random() * (innerWidth - 28);
          const startY = innerY + 14 + Math.random() * (innerHeight - 28);
          const curveX = innerX + 14 + Math.random() * (innerWidth - 28);
          const curveY = innerY + 14 + Math.random() * (innerHeight - 28);
          const endX = innerX + 14 + Math.random() * (innerWidth - 28);
          const endY = innerY + 14 + Math.random() * (innerHeight - 28);
          shapes.push(`<path d="M${startX},${startY} Q${curveX},${curveY} ${endX},${endY}" stroke="${color}" stroke-width="${7 + Math.random()*12}" fill="none" opacity="${opacity.toFixed(2)}" />`);
        }
      }
      return shapes.join('\n    ');
    }

    // Semicolon newlines (user control), up to 20 lines
    const splitTitle = (title) => {
      const maxLines = 20;
      let rawLines = title.toUpperCase().split(';').map(l => l.trim()).filter(l => l);
      if (rawLines.length > maxLines) {
        rawLines = rawLines.slice(0, maxLines - 1).concat([
          rawLines.slice(maxLines - 1).join(' ')
        ]);
      }
      return rawLines.map(line => {
        const maxWordLen = 20;
        const words = line.split(' ');
        let safeLine = '';
        for (let word of words) {
          if (word.length > maxWordLen) {
            let chunks = word.match(new RegExp(`.{1,${maxWordLen}}`, 'g'));
            safeLine += (safeLine ? ' ' : '') + chunks.join(' ');
          } else {
            safeLine += (safeLine ? ' ' : '') + word;
          }
        }
        return safeLine;
      });
    };

    const testSVGTextWidth = (text, size) => {
      return text.length * size * 0.56;
    };

    // Inner rectangle config
    const innerX = 120, innerY = 120, innerWidth = 1360, innerHeight = 2320;
    const topPadding = 90, bottomPadding = 180;
    const sidePadding = 48;
    const usableWidth = innerWidth - 2 * sidePadding;
    const usableHeight = innerHeight - topPadding - bottomPadding;

    // Gradient and abstract art
    const gradient = getRandomGradient();
    const artSVG = getAbstractArt(innerX, innerY, innerWidth, innerHeight);
    const titleLines = splitTitle(displayTitle);
    const numLines = titleLines.length;

    // Fit font size so all lines fit horizontally and vertically
    let fontSize = 180;
    let lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
    const minFontSize = 44;
    while (fontSize > minFontSize) {
      lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
      let fits = true;
      for (const line of titleLines) {
        if (testSVGTextWidth(line, fontSize) > usableWidth) {
          fits = false;
          break;
        }
      }
      const totalTitleHeight = fontSize * numLines + lineSpacing * (numLines - 1);
      if (totalTitleHeight > usableHeight) fits = false;
      if (fits) break;
      fontSize -= 2;
    }
    if (fontSize < minFontSize) fontSize = minFontSize;
    lineSpacing = Math.max(Math.floor(fontSize * 0.13), 12);
    const firstLineY = innerY + topPadding + fontSize;

    const titleSVG = titleLines.map((line, index) => {
      const y = firstLineY + index * (fontSize + lineSpacing);
      return `<text x="${innerX + innerWidth/2}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${line}</text>`;
    }).join('\n  ');

    // Author name near bottom
    const authorY = innerY + innerHeight - bottomPadding/2;
    const authorText = (authorName || this.authorName || '').toUpperCase();

    // SVG template
    const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 2560" width="1600" height="2560">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${gradient.start}" />
          <stop offset="100%" stop-color="${gradient.end}" />
        </linearGradient>
        <linearGradient id="spineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.3" />
          <stop offset="30%" stop-color="#000000" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.5" />
        </filter>
        <filter id="bookShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
          <feOffset dx="10" dy="10" result="offsetblur"/>
          <feFlood flood-color="#000000" flood-opacity="0.3"/>
          <feComposite in2="offsetblur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="50" y="50" width="1500" height="2460" fill="#000000" opacity="0.2" rx="15" ry="15" />
      <rect x="40" y="40" width="1520" height="2480" fill="url(#bgGradient)" rx="12" ry="12" filter="url(#bookShadow)" />
      <rect x="40" y="40" width="80" height="2480" fill="url(#spineGradient)" rx="12" ry="12" />
      <rect x="40" y="40" width="1520" height="3" fill="url(#edgeHighlight)" />
      <rect x="1540" y="40" width="20" height="2480" fill="#000000" opacity="0.1" rx="12" ry="12" />
      <rect x="40" y="2510" width="1520" height="10" fill="#000000" opacity="0.15" rx="12" ry="12" />
      <rect x="120" y="120" width="1360" height="2320" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.1" rx="8" ry="8" />
      <!-- Abstract Art Shapes -->
      <g>
        ${artSVG}
      </g>
      <!-- Title -->
      ${titleSVG}
      <!-- Author name -->
      <text x="${innerX + innerWidth/2}" y="${authorY}" font-family="Arial, sans-serif" font-size="90" font-weight="bold" text-anchor="middle" fill="#ffffff" filter="url(#textShadow)">${authorText}</text>
    </svg>`;

    await fsPromises.writeFile(outputPath, svgTemplate, 'utf8');
    this.emitOutput(`\nGenerated SVG cover: ${outputPath}\n`);
    this.emitOutput(`Color gradient: ${gradient.start} to ${gradient.end}\n`);
    return outputPath;
  }

  /**
   * Update index.html with new project entry
   * @param {string} projectName - Project folder name
   * @param {string} displayTitle - Formatted title for display
   * @param {string} manuscriptBaseName - Base name of manuscript file
   * @param {string} selectedFile - Selected manuscript file
   * @param {string} purchaseUrl - Purchase URL for the BUY button
   * @returns {Promise<void>}
   */
  async updateBookIndex(projectName, displayTitle, manuscriptBaseName, selectedFile, purchaseUrl) {
    const bookIndexPath = path.join(appState.PROJECTS_DIR, 'index.html');
    const projectDir = path.join(appState.PROJECTS_DIR, projectName);

    this.emitOutput(`Updating book index: ${bookIndexPath}\n`);

    // If index.html doesn't exist in projects dir, create from embedded template
    if (!fs.existsSync(bookIndexPath)) {
      this.emitOutput(`Creating index.html from embedded template\n`);
      
      // Embedded HTML template - exact verbatim copy from book_index.html
      const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Books</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="shortcut icon" href="images/icon.png" type="image/x-icon">
  <meta name="description" content="books and writing projects">

  <style>
    :root {
      --button-bg-color: #4CAF50;
      --button-text-color: #ffffff;
      --border-color: #444;
      --background-light: #f5f5f5;
      --text-light: #333333;
      --title-light: #2c3035;
      --project-title-light: #3a5875;
      --background-dark: #2c3035;
      --text-dark: #ffffff;
      --title-dark: #444;
      --project-title-dark: #607d8b;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body, h1, h2, h3, h4, h5, h6  {
      font-family: Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--background-dark);
      color: var(--text-dark);
      transition: background-color 0.3s, color 0.3s;
      padding: 20px;
      min-height: 100vh;
    }
    
    body.light-mode {
      background-color: var(--background-light);
      color: var(--text-light);
    }

    .title-box {
      background-color: var(--title-dark);
      padding: 5px;
      font-size: 24px;
      margin-bottom: 20px;
      transition: background-color 0.3s;
    }
    
    body.light-mode .title-box {
      background-color: var(--title-light);
    }

    .title-box img {
      width: 90px;
      height: auto;
      object-fit: cover;
    }
    
    /* Responsive book grid */
    .book-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin: 0 auto;
      max-width: 1200px;
      padding-bottom: 80px; /* Space for footer */
    }

    .project {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .project img {
      width: 100%;
      max-width: 170px;
      height: auto;
      object-fit: cover;
      transition: all 0.3s ease;
      border-radius: 4px;
      aspect-ratio: 2/3; /* Maintain book cover aspect ratio */
    }

    .project img:hover {
      filter: sepia(90%);
      transform: translateY(-2px);
    }

    .project-title {
      margin: 10px 0 5px 0;
      color: var(--project-title-dark);
      font-size: 14px;
      line-height: 1.4;
      transition: color 0.3s;
      cursor: pointer;
      word-wrap: break-word;
      hyphens: auto;
    }
    
    body.light-mode .project-title {
      color: var(--project-title-light);
    }

    /* Button container styling */
    .button-container {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Small button styling */
    .book-button {
      border: none;
      padding: 4px 8px;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      font-size: 9px;
      letter-spacing: 1px;
      border-radius: 12px;
      color: white;
      opacity: 0.7;
      transition: all 0.3s ease;
      min-width: 35px;
      white-space: nowrap;
    }

    .book-button:hover {
      opacity: 1;
      transform: translateY(-1px);
    }

    .html-button {
      background-color: #2196F3;
    }

    .ebook-button {
      background-color: #FF9800;
    }

    .buy-button {
      background-color: #4CAF50;
    }

    .no-buy-button {
      background-color: red;
    }

    /* Footer styling */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: #000;
      color: #9e9e9e;
      padding: 10px 20px;
      text-align: center;
      font-size: 15px;
      transition: background-color 0.3s;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    body.light-mode .footer {
      background-color: #333;
    }
    
    /* Dark mode toggle */
    #darkModeToggle {
      font-size: 16px;
      background-color: transparent;
      color: inherit;
      border: none;
      cursor: pointer;
      text-align: center;
      transition: all 0.3s ease;
      margin-left: 10px;
      padding: 0;
    }

    #darkModeToggle:hover {
      transform: scale(1.1);
    }

    /* Mobile-specific adjustments */
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      
      .book-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .project img {
        max-width: 200px;
      }
      
      .project-title {
        font-size: 13px;
      }
      
      .book-button {
        font-size: 9px;
        padding: 4px 8px;
      }
    }
    
    /* Tablet screens */
    @media (min-width: 601px) and (max-width: 768px) {
      .book-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    /* Larger tablets */
    @media (min-width: 769px) and (max-width: 900px) {
      .book-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    /* Desktop screens */
    @media (min-width: 901px) and (max-width: 1200px) {
      .book-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    /* Large desktop screens */
    @media (min-width: 1201px) and (max-width: 1600px) {
      .book-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    
    /* Extra large screens */
    @media (min-width: 1601px) {
      .book-grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }

    /* Spacing for footer */
    .footer-spacer {
      height: 60px;
    }
  </style>
</head>

<body>
<div class="book-grid">
<!-- BOOKS_START -->



<!-- BOOKS_END -->
</div>

<div class="footer-spacer"></div>
<div class="footer">
  <div>© &nbsp;2025 &nbsp;&nbsp;Books &nbsp;&nbsp;<button id="darkModeToggle" title="Switch dark and light mode">☀️</button></div>
</div>

<script>
  // toggle dark/light mode
  document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('light-mode');
    // Change the icon based on the current mode
    this.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
    
    // optionally save the user's preference in localStorage
    localStorage.setItem('lightMode', document.body.classList.contains('light-mode'));
  });
  
  // check for saved preference on page load
  window.addEventListener('DOMContentLoaded', function() {
    // default is dark mode (no class needed)
    const lightMode = localStorage.getItem('lightMode') === 'true';
    if (lightMode) {
      document.body.classList.add('light-mode');
      document.getElementById('darkModeToggle').textContent = '🌙';
    }
  });
</script>
</body>
</html>`;
      
      await fsPromises.writeFile(bookIndexPath, htmlTemplate, 'utf8');
    }

    // Read current book index
    let indexContent = await fsPromises.readFile(bookIndexPath, 'utf8');

    // Check if this project already exists and remove it for replacement
    const projectStartPattern = new RegExp(`<!-- BOOK_START:${projectName} -->`, 'i');
    const projectEndPattern = new RegExp(`<!-- BOOK_END:${projectName} -->`, 'i');
    
    if (projectStartPattern.test(indexContent) && projectEndPattern.test(indexContent)) {
      this.emitOutput(`Project ${projectName} already exists - replacing entry\n`);
      
      // Remove existing entry
      const startMatch = indexContent.match(projectStartPattern);
      const endMatch = indexContent.match(projectEndPattern);
      
      if (startMatch && endMatch) {
        const startIndex = indexContent.indexOf(startMatch[0]);
        const endIndex = indexContent.indexOf(endMatch[0]) + endMatch[0].length;
        
        // Remove the existing entry including the newline after it
        indexContent = indexContent.slice(0, startIndex) + indexContent.slice(endIndex + 1);
      }
    }

    // Find HTML and EPUB files for the buttons
    const projectFiles = await fsPromises.readdir(projectDir);
    
    // Find HTML file
    let htmlFile = null;
    if (selectedFile && selectedFile.endsWith('.html')) {
      htmlFile = path.basename(selectedFile);
    } else {
      const htmlFiles = projectFiles.filter(file => file.endsWith('.html'));
      if (htmlFiles.length > 0) {
        const manuscriptHtml = htmlFiles.find(file => file.startsWith(manuscriptBaseName + '_') || file === manuscriptBaseName + '.html');
        if (manuscriptHtml) {
          htmlFile = manuscriptHtml;
        }
      }
    }
    
    // Find EPUB file
    let epubFile = null;
    if (selectedFile && selectedFile.endsWith('.epub')) {
      epubFile = path.basename(selectedFile);
    } else {
      const epubFiles = projectFiles.filter(file => file.endsWith('.epub'));
      if (epubFiles.length > 0) {
        const manuscriptEpub = epubFiles.find(file => file.startsWith(manuscriptBaseName + '_') || file === manuscriptBaseName + '.epub');
        if (manuscriptEpub) {
          epubFile = manuscriptEpub;
        }
      }
    }

    // Create new project entry with 3-button layout
    let newProjectEntry = `
<!-- BOOK_START:${projectName} -->
  <div class="project">
    <img src="images/${projectName}.svg" alt="${displayTitle} Book Cover" style="border-radius: 4px;">
    <div class="button-container">
`;
    
    // Only add HTML button if HTML file exists
    if (htmlFile) {
      newProjectEntry += `      <a href="${projectName}/${htmlFile}" class="book-button html-button" title="Read '${displayTitle}' online">HTML</a>
`;
    }
    
    // Only add EPUB button if EPUB file exists
    if (epubFile) {
      newProjectEntry += `      <a href="${projectName}/${epubFile}" class="book-button ebook-button" title="Download '${displayTitle}' EPUB" download>EBOOK</a>
`;
    }

    // Only add BUY button if there's a valid purchase URL
    if (purchaseUrl && purchaseUrl !== '#') {
      newProjectEntry += `      <a href="${purchaseUrl}" target="_blank" class="book-button buy-button" title="Purchase '${displayTitle}'">BUY</a>
`;
    }

    newProjectEntry += `
    </div>
  </div>
<!-- BOOK_END:${projectName} -->
`;

    // Find insertion point (after <!-- BOOKS_START --> comment)
    const booksStartTag = '<!-- BOOKS_START -->';
    const insertionIndex = indexContent.indexOf(booksStartTag);
    
    if (insertionIndex === -1) {
      throw new Error('Could not find BOOKS_START comment marker in index.html');
    }

    // Insert after the BOOKS_START comment
    const insertAfter = insertionIndex + booksStartTag.length;
    indexContent = indexContent.slice(0, insertAfter) + newProjectEntry + indexContent.slice(insertAfter);

    // Write updated index
    await fsPromises.writeFile(bookIndexPath, indexContent, 'utf8');
    
    this.emitOutput(`Added ${displayTitle} to book index\n`);
    
    // Return the HTML file for editing
    return htmlFile;
  }

  /**
   * Unpublish a book from the index.html file
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Tool options
   * @returns {Promise<Object>} - Unpublish result
   */
  async unpublishBook(projectPath, options) {
    const projectName = path.basename(projectPath);
    const indexPath = path.join(appState.PROJECTS_DIR, 'index.html');
    
    this.emitOutput(`Unpublishing project: ${projectName}\n`);
    
    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      const errorMsg = 'No published books found (index.html does not exist)';
      this.emitOutput(errorMsg);
      return {
        success: false,
        message: errorMsg,
        outputFiles: []
      };
    }
    
    // Read current index content
    let indexContent = await fsPromises.readFile(indexPath, 'utf8');
    
    // Reuse the existing removal logic from updateBookIndex
    const projectStartPattern = new RegExp(`<!-- BOOK_START:${projectName} -->`, 'i');
    const projectEndPattern = new RegExp(`<!-- BOOK_END:${projectName} -->`, 'i');
    
    if (!projectStartPattern.test(indexContent) || !projectEndPattern.test(indexContent)) {
      const errorMsg = `Book "${projectName}" not found in published index`;
      this.emitOutput(errorMsg);
      return {
        success: false,
        message: errorMsg,
        outputFiles: []
      };
    }
    
    // Remove existing entry (same logic as updateBookIndex)
    const startMatch = indexContent.match(projectStartPattern);
    const endMatch = indexContent.match(projectEndPattern);
    
    if (startMatch && endMatch) {
      const startIndex = indexContent.indexOf(startMatch[0]);
      const endIndex = indexContent.indexOf(endMatch[0]) + endMatch[0].length;
      
      // Remove the existing entry including the newline after it
      indexContent = indexContent.slice(0, startIndex) + indexContent.slice(endIndex + 1);
      
      // Write updated index (but don't add anything new)
      await fsPromises.writeFile(indexPath, indexContent, 'utf8');
      this.emitOutput(`Removed book entry from index.html\n`);
    }
    
    // Remove SVG file if it exists
    const svgPath = path.join(appState.PROJECTS_DIR, 'images', `${projectName}.svg`);
    if (fs.existsSync(svgPath)) {
      await fsPromises.unlink(svgPath);
      this.emitOutput(`Removed SVG cover: ${svgPath}\n`);
    }
    
    this.emitOutput(`\nBook "${projectName}" unpublished successfully!\n`);
    
    return {
      success: true,
      message: `Book "${projectName}" unpublished successfully`,
      outputFiles: []
    };
  }
}

module.exports = PublishManuscript;
