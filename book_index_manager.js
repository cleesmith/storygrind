const fs = require('fs');
const path = require('path');

class BookIndexManager {
  constructor(indexPath) {
    this.indexPath = indexPath;
  }

  // Read the current index.html file
  readIndexFile() {
    try {
      return fs.readFileSync(this.indexPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read index file: ${error.message}`);
    }
  }

  // Write the updated index.html file
  writeIndexFile(content) {
    try {
      fs.writeFileSync(this.indexPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write index file: ${error.message}`);
    }
  }

  // Generate HTML for a single book entry
  generateBookHTML(bookData) {
    const {
      bookName,        // folder name (e.g., "MobyDick")
      displayTitle,    // display title (e.g., "Moby Dick")
      svgFile,        // SVG filename (e.g., "moby-dick.svg")
      hasHtml = true, // whether HTML version exists
      hasEpub = true, // whether EPUB version exists
      buyLink = "#"   // purchase link
    } = bookData;

    const safeBookName = bookName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    return `<!-- BOOK_START:${safeBookName} -->
  <div class="project">
    <img src="${svgFile}" alt="${displayTitle} Cover" style="border-radius: 4px;">
    <div class="button-container">
      <a href="${bookName}/index.html" class="book-button html-button" title="Read '${displayTitle}' online">HTML</a>
      <a href="${bookName}/${bookName}.epub" class="book-button ebook-button" title="Download '${displayTitle}' EPUB" download>EBOOK</a>
      <a href="${buyLink}" class="book-button buy-button" title="Purchase '${displayTitle}'">BUY</a>
    </div>
  </div>
<!-- BOOK_END:${safeBookName} -->`;
  }

  // Add a new book to the index
  addBook(bookData) {
    let content = this.readIndexFile();
    const newBookHTML = this.generateBookHTML(bookData);
    
    // Find the BOOKS_END marker and insert before it
    const booksEndMarker = '<!-- BOOKS_END -->';
    const booksEndIndex = content.indexOf(booksEndMarker);
    
    if (booksEndIndex === -1) {
      throw new Error('Could not find BOOKS_END marker in index file');
    }

    // Insert the new book before the BOOKS_END marker
    content = content.slice(0, booksEndIndex) + 
              newBookHTML + '\n\n' +
              content.slice(booksEndIndex);
    
    this.writeIndexFile(content);
    console.log(`Added book: ${bookData.displayTitle}`);
  }

  // Update an existing book
  updateBook(bookName, bookData) {
    let content = this.readIndexFile();
    const safeBookName = bookName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    const startMarker = `<!-- BOOK_START:${safeBookName} -->`;
    const endMarker = `<!-- BOOK_END:${safeBookName} -->`;
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`Could not find book markers for: ${bookName}`);
    }

    // Replace the entire book section
    const newBookHTML = this.generateBookHTML(bookData);
    content = content.slice(0, startIndex) + 
              newBookHTML +
              content.slice(endIndex + endMarker.length);
    
    this.writeIndexFile(content);
    console.log(`Updated book: ${bookData.displayTitle}`);
  }

  // Delete a book from the index
  deleteBook(bookName) {
    let content = this.readIndexFile();
    const safeBookName = bookName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    const startMarker = `<!-- BOOK_START:${safeBookName} -->`;
    const endMarker = `<!-- BOOK_END:${safeBookName} -->`;
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      console.log(`Book not found in index: ${bookName}`);
      return;
    }

    // Remove the entire book section including any surrounding whitespace
    let beforeSection = content.slice(0, startIndex);
    let afterSection = content.slice(endIndex + endMarker.length);
    
    // Clean up extra newlines
    beforeSection = beforeSection.replace(/\n\s*$/, '\n');
    afterSection = afterSection.replace(/^\s*\n/, '\n');
    
    content = beforeSection + afterSection;
    
    this.writeIndexFile(content);
    console.log(`Deleted book: ${bookName}`);
  }

  // Rebuild the entire book list from scratch
  rebuildBookList(booksArray) {
    let content = this.readIndexFile();
    
    const booksStartMarker = '<!-- BOOKS_START -->';
    const booksEndMarker = '<!-- BOOKS_END -->';
    
    const startIndex = content.indexOf(booksStartMarker);
    const endIndex = content.indexOf(booksEndMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find BOOKS_START or BOOKS_END markers');
    }

    // Generate HTML for all books
    const allBooksHTML = booksArray.map(book => this.generateBookHTML(book)).join('\n\n');
    
    // Replace everything between the markers
    content = content.slice(0, startIndex + booksStartMarker.length) + 
              '\n\n' + allBooksHTML + '\n\n' +
              content.slice(endIndex);
    
    this.writeIndexFile(content);
    console.log(`Rebuilt book list with ${booksArray.length} books`);
  }

  // Get list of all books currently in the index
  getBookList() {
    const content = this.readIndexFile();
    const books = [];
    
    // Find all BOOK_START markers
    const bookStartRegex = /<!-- BOOK_START:([^>]+) -->/g;
    let match;
    
    while ((match = bookStartRegex.exec(content)) !== null) {
      books.push(match[1]); // The book name from the marker
    }
    
    return books;
  }

  // Check if a book exists in the index
  hasBook(bookName) {
    const safeBookName = bookName.replace(/[^a-zA-Z0-9_]/g, '_');
    const content = this.readIndexFile();
    return content.includes(`<!-- BOOK_START:${safeBookName} -->`);
  }

  // Sync index with actual folder structure
  syncWithFileSystem(writingDir) {
    const actualBooks = [];
    
    // Scan for book folders
    const items = fs.readdirSync(writingDir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const bookPath = path.join(writingDir, item.name);
        const manuscriptPath = path.join(bookPath, 'manuscript.txt');
        
        // Only include folders that have a manuscript.txt
        if (fs.existsSync(manuscriptPath)) {
          const bookData = {
            bookName: item.name,
            displayTitle: item.name.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capitals
            svgFile: `${item.name.toLowerCase()}.svg`,
            hasHtml: fs.existsSync(path.join(bookPath, 'index.html')),
            hasEpub: fs.existsSync(path.join(bookPath, `${item.name}.epub`)),
            buyLink: "#" // Default, could be read from a config file
          };
          actualBooks.push(bookData);
        }
      }
    }
    
    this.rebuildBookList(actualBooks);
    console.log(`Synced index with ${actualBooks.length} books from filesystem`);
  }
}

// Example usage:
// const manager = new BookIndexManager('./writing_with_storygrind/index.html');

// Add a new book
// manager.addBook({
//   bookName: 'MyNewNovel',
//   displayTitle: 'My New Novel',
//   svgFile: 'my-new-novel.svg',
//   hasHtml: true,
//   hasEpub: true,
//   buyLink: 'https://amazon.com/my-book'
// });

// Update existing book
// manager.updateBook('MyNewNovel', {
//   bookName: 'MyNewNovel',
//   displayTitle: 'My Updated Novel Title',
//   svgFile: 'my-new-novel.svg',
//   hasHtml: true,
//   hasEpub: true,
//   buyLink: 'https://bookstore.com/my-book'
// });

// Delete a book
// manager.deleteBook('MyNewNovel');

// Sync with filesystem (recommended for major updates)
// manager.syncWithFileSystem('./writing_with_storygrind');

module.exports = BookIndexManager;