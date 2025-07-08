// Foliate EPUB Reader
// Note: This is a basic structure - you'll need to implement the actual foliate-js integration

console.log('🚀 Starting Foliate EPUB Reader...');

// DOM elements
const dropTarget = document.getElementById('drop-target');
const fileInput = document.getElementById('file-input');
const fileButton = document.getElementById('file-button');
const sideBar = document.getElementById('side-bar');
const sideBarButton = document.getElementById('side-bar-button');
const dimmingOverlay = document.getElementById('dimming-overlay');
const sideBarTitle = document.getElementById('side-bar-title');
const sideBarAuthor = document.getElementById('side-bar-author');
const sideBarCover = document.getElementById('side-bar-cover');
const tocView = document.getElementById('toc-view');
const headerBar = document.getElementById('header-bar');
const navBar = document.getElementById('nav-bar');
// Navigation elements removed
// const progressSlider = document.getElementById('progress-slider');
// const leftButton = document.getElementById('left-button');
// const rightButton = document.getElementById('right-button');
const menuButton = document.querySelector('#menu-button button');

// State
let currentBook = null;
let currentView = null;
let sideBarOpen = false;
let currentChapterIndex = 0;

// Initialize
function init() {
    console.log('📚 Initializing Foliate reader...');
    
    // Hide the drop target and load Liz.epub directly
    dropTarget.style.visibility = 'hidden';
    
    // File input handlers
    fileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    dropTarget.addEventListener('dragover', handleDragOver);
    dropTarget.addEventListener('drop', handleDrop);
    
    // Sidebar handlers
    sideBarButton.addEventListener('click', toggleSideBar);
    dimmingOverlay.addEventListener('click', closeSideBar);
    
    // Navigation handlers removed
    // leftButton.addEventListener('click', goLeft);
    // rightButton.addEventListener('click', goRight);
    // progressSlider.addEventListener('input', handleProgressChange);
    
    // Settings menu handler
    if (menuButton) {
        menuButton.addEventListener('click', toggleSettingsMenu);
    }
    
    // Load Liz.epub automatically
    loadEpub('Liz.epub');
    
    console.log('✅ Foliate reader initialized');
}

// File handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('📖 File selected:', file.name);
        loadBook(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        console.log('📖 File dropped:', files[0].name);
        loadBook(files[0]);
    }
}

// Generic EPUB loading function
async function loadEpub(epubPath) {
    try {
        console.log('📚 Loading EPUB:', epubPath);
        
        // Show the interface first
        showBookInterface();
        
        // Load and parse the actual EPUB file
        const response = await fetch(epubPath);
        const epubData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(epubData);
        
        // Extract metadata and chapters
        const { metadata, chapters } = await parseEpubContent(zip);
        
        // Update UI with real metadata
        sideBarTitle.textContent = metadata.title || epubPath.replace('.epub', '').toUpperCase();
        sideBarAuthor.textContent = metadata.author || 'STORYGRIND AUTHOR';
        
        // Show real TOC
        displayRealTOC(chapters);
        
        // Show first chapter content
        currentChapterIndex = 0;
        displayChapter(chapters[0] || { title: 'Chapter 1', content: 'No content found' });
        // updateProgressSlider(); // removed
        
        // Store chapters globally for navigation
        currentBook = { metadata, chapters };
        
        console.log('✅ EPUB loaded successfully:', epubPath);
        
    } catch (error) {
        console.error('❌ Error loading EPUB:', error);
        alert('Error loading EPUB: ' + error.message);
    }
}

// Book loading from file input (for future use)
async function loadBook(file) {
    try {
        console.log('📚 Loading book:', file.name);
        
        // TODO: Implement actual foliate-js book loading from File object
        // This is where you'd integrate with foliate-js library
        
        // For now, just show a placeholder
        showBookInterface();
        
        // Set metadata
        sideBarTitle.textContent = file.name.replace('.epub', '');
        sideBarAuthor.textContent = 'Unknown Author';
        
        // Parse chapters from content
        parseEpubChapters(file.name);
        
        console.log('✅ Book loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading book:', error);
        alert('Error loading book: ' + error.message);
    }
}

function showBookInterface() {
    // Hide drop target completely
    dropTarget.style.display = 'none';
    
    // Show header toolbar only
    headerBar.style.visibility = 'visible';
    // navBar.style.visibility = 'visible'; // removed
    // progressSlider.style.visibility = 'visible'; // removed
    
    // Show sidebar
    sideBar.style.visibility = 'visible';
    
    console.log('📱 Book interface shown');
}

function showPlaceholderContent() {
    const bookContent = document.getElementById('book-content');
    if (bookContent) {
        bookContent.innerHTML = `
            <h1 style="text-align: center; margin-bottom: 2rem;">LIZ</h1>
            <p style="text-align: center; margin-bottom: 3rem; font-style: italic;">by StoryGrind Author</p>
            
            <h2>Chapter 1: The Hum of Routine</h2>
            <p>Loading EPUB content...</p>
            <p>TODO: Integrate foliate-js to display actual EPUB content here.</p>
            <p>This is where the rendered EPUB pages will appear once foliate-js is properly integrated.</p>
            
            <div style="margin: 2rem 0; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
                <h3>Next Steps:</h3>
                <ul>
                    <li>Download foliate-js library</li>
                    <li>Integrate EPUB parsing</li>
                    <li>Display real chapter content</li>
                    <li>Add navigation between chapters</li>
                </ul>
            </div>
        `;
        console.log('📄 Placeholder content displayed');
    }
}

// Parse EPUB content using JSZip
async function parseEpubContent(zip) {
    const metadata = { title: 'Unknown Title', author: 'Unknown Author' };
    const chapters = [];
    
    try {
        // Get content.opf to find spine order
        const contentOpf = await zip.file('OEBPS/content.opf').async('text');
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(contentOpf, 'text/xml');
        
        // Extract metadata
        const titleElement = opfDoc.querySelector('title');
        const creatorElement = opfDoc.querySelector('creator');
        if (titleElement) metadata.title = titleElement.textContent;
        if (creatorElement) metadata.author = creatorElement.textContent;
        
        // Get spine order
        const itemrefs = opfDoc.querySelectorAll('spine itemref');
        
        // Process each chapter file in spine order
        for (let i = 0; i < itemrefs.length; i++) {
            const idref = itemrefs[i].getAttribute('idref');
            
            // Skip title page and contents
            if (idref.includes('title') || idref.includes('contents')) continue;
            
            // Find the href for this id
            const manifestItem = opfDoc.querySelector(`manifest item[id="${idref}"]`);
            if (!manifestItem) continue;
            
            const href = manifestItem.getAttribute('href');
            const chapterFile = zip.file(`OEBPS/${href}`);
            
            if (chapterFile) {
                const chapterHtml = await chapterFile.async('text');
                const chapterDoc = parser.parseFromString(chapterHtml, 'text/html');
                
                // Extract chapter title and content
                const titleElement = chapterDoc.querySelector('h1, .chapter-title');
                const title = titleElement ? titleElement.textContent.trim() : `Chapter ${chapters.length + 1}`;
                
                // Extract paragraphs
                const paragraphs = Array.from(chapterDoc.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(text => text.length > 0);
                
                if (paragraphs.length > 0) {
                    chapters.push({
                        id: idref,
                        title: title,
                        content: paragraphs.join('\n\n')
                    });
                }
            }
        }
        
        console.log(`📖 Parsed ${chapters.length} chapters from EPUB`);
        return { metadata, chapters };
        
    } catch (error) {
        console.error('❌ Error parsing EPUB content:', error);
        return { metadata, chapters: [{ title: 'Error', content: 'Failed to parse EPUB content' }] };
    }
}

// Display real TOC from parsed chapters
function displayRealTOC(chapters) {
    const tocHTML = chapters.map((chapter, index) => 
        `<li><a href="#" data-chapter="${index}">${index + 1}. ${chapter.title}</a></li>`
    ).join('');
    
    tocView.innerHTML = `<ol>${tocHTML}</ol>`;
    
    // Add event listeners to chapter links
    const chapterLinks = tocView.querySelectorAll('a[data-chapter]');
    chapterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const chapterIndex = parseInt(e.target.getAttribute('data-chapter'));
            displayChapter(chapters[chapterIndex]);
        });
    });
}

// Display chapter content
function displayChapter(chapter) {
    const bookContent = document.getElementById('book-content');
    if (bookContent && chapter) {
        const formattedContent = chapter.content
            .split('\n\n')
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
            
        bookContent.innerHTML = `
            <h1>${chapter.title}</h1>
            ${formattedContent}
        `;
        
        // Scroll to top
        bookContent.scrollTop = 0;
        
        console.log('📄 Displayed chapter:', chapter.title);
    }
}

// Navigation
function navigateToChapter(chapterIndex) {
    if (currentBook && currentBook.chapters && currentBook.chapters[chapterIndex]) {
        currentChapterIndex = chapterIndex;
        displayChapter(currentBook.chapters[chapterIndex]);
        // updateProgressSlider(); // removed
        console.log('📍 Navigated to chapter:', chapterIndex + 1);
    }
    closeSideBar();
}

function goLeft() {
    if (currentChapterIndex > 0) {
        navigateToChapter(currentChapterIndex - 1);
        console.log('⬅️ Going to previous chapter');
    }
}

function goRight() {
    if (currentBook && currentChapterIndex < currentBook.chapters.length - 1) {
        navigateToChapter(currentChapterIndex + 1);
        console.log('➡️ Going to next chapter');
    }
}

function handleProgressChange(event) {
    const progress = parseFloat(event.target.value);
    if (currentBook && currentBook.chapters) {
        const chapterIndex = Math.floor(progress * currentBook.chapters.length);
        const clampedIndex = Math.max(0, Math.min(chapterIndex, currentBook.chapters.length - 1));
        navigateToChapter(clampedIndex);
        console.log('📊 Progress navigation to chapter:', clampedIndex + 1);
    }
}

// Progress slider function removed
// function updateProgressSlider() {
//     if (currentBook && currentBook.chapters && progressSlider) {
//         const progress = currentChapterIndex / (currentBook.chapters.length - 1);
//         progressSlider.value = progress;
//         
//         // Update button states
//         leftButton.disabled = currentChapterIndex === 0;
//         rightButton.disabled = currentChapterIndex === currentBook.chapters.length - 1;
//     }
// }

// Sidebar
function toggleSideBar() {
    if (sideBarOpen) {
        closeSideBar();
    } else {
        openSideBar();
    }
}

function openSideBar() {
    sideBar.classList.add('show');
    dimmingOverlay.classList.add('show');
    sideBarOpen = true;
    console.log('📖 Sidebar opened');
}

function closeSideBar() {
    sideBar.classList.remove('show');
    dimmingOverlay.classList.remove('show');
    sideBarOpen = false;
    console.log('📖 Sidebar closed');
}

// Settings Menu
function toggleSettingsMenu() {
    let menu = document.querySelector('.menu');
    
    if (!menu) {
        // Create menu if it doesn't exist
        menu = createSettingsMenu();
        document.getElementById('menu-button').appendChild(menu);
    }
    
    menu.classList.toggle('show');
    console.log('⚙️ Settings menu toggled');
}

function createSettingsMenu() {
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.innerHTML = `
        <ul>
            <li onclick="changeFontSize('smaller')">Font Size -</li>
            <li onclick="changeFontSize('larger')">Font Size +</li>
            <li onclick="changeTheme('light')">Light Theme</li>
            <li onclick="changeTheme('dark')">Dark Theme</li>
            <li onclick="changeTheme('sepia')">Sepia Theme</li>
        </ul>
    `;
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#menu-button')) {
            menu.classList.remove('show');
        }
    });
    
    return menu;
}

function changeFontSize(direction) {
    const bookContent = document.getElementById('book-content');
    if (bookContent) {
        const currentSize = parseFloat(getComputedStyle(bookContent).fontSize);
        const newSize = direction === 'larger' ? currentSize + 2 : currentSize - 2;
        bookContent.style.fontSize = Math.max(12, Math.min(24, newSize)) + 'px';
        console.log('📏 Font size changed:', newSize + 'px');
    }
}

function changeTheme(theme) {
    const viewer = document.getElementById('viewer');
    const bookContent = document.getElementById('book-content');
    
    if (theme === 'dark') {
        viewer.style.background = '#1a1a1a';
        viewer.style.color = '#e0e0e0';
        bookContent.style.background = '#1a1a1a';
        bookContent.style.color = '#e0e0e0';
    } else if (theme === 'sepia') {
        viewer.style.background = '#f4f1ea';
        viewer.style.color = '#5c4a37';
        bookContent.style.background = '#f4f1ea';
        bookContent.style.color = '#5c4a37';
    } else {
        viewer.style.background = 'white';
        viewer.style.color = 'black';
        bookContent.style.background = 'white';
        bookContent.style.color = 'black';
    }
    
    console.log('🎨 Theme changed to:', theme);
}

function changeReadingMode(mode) {
    const viewer = document.getElementById('viewer');
    const bookContent = document.getElementById('book-content');
    
    if (mode === 'paginated') {
        // TODO: Implement actual foliate.js paginated mode
        viewer.style.overflow = 'hidden';
        bookContent.style.columnWidth = '600px';
        bookContent.style.columnGap = '3rem';
        bookContent.style.height = 'calc(100vh - 96px)';
        console.log('📄 Switched to paginated mode (mock)');
    } else {
        // Scrolled mode (default)
        viewer.style.overflowY = 'auto';
        viewer.style.overflowX = 'hidden';
        bookContent.style.columnWidth = 'auto';
        bookContent.style.columnGap = 'normal';
        bookContent.style.height = 'auto';
        console.log('📜 Switched to scrolled mode');
    }
    
    // Update menu checkmarks
    const menuItems = document.querySelectorAll('.menu li');
    menuItems.forEach(item => {
        if (item.textContent.toLowerCase().includes(mode)) {
            item.setAttribute('aria-checked', 'true');
        } else if (item.textContent.toLowerCase().includes('scrolled') || item.textContent.toLowerCase().includes('paginated')) {
            item.removeAttribute('aria-checked');
        }
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowLeft':
            goLeft();
            break;
        case 'ArrowRight':
            goRight();
            break;
        case 'Escape':
            if (sideBarOpen) closeSideBar();
            break;
        case 's':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                toggleSideBar();
            }
            break;
    }
});

// Start the app
init();

// Global functions for HTML onclick handlers
window.navigateToChapter = navigateToChapter;
window.changeFontSize = changeFontSize;
window.changeTheme = changeTheme;
window.changeReadingMode = changeReadingMode;