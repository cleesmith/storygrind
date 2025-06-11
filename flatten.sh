# Find all JS files in src subdirectories and move them to root with original filenames
find ./src -name "*.js" -type f | while read file; do
  # Get just the filename without path
  filename=$(basename "$file")
  
  # Check if a file with this name already exists in the root
  if [ -f "./$filename" ]; then
    echo "Warning: $filename already exists in root directory, skipping"
  else
    # Copy the file to root
    cp "$file" "./$filename"
    echo "Moved $file to ./$filename"
  fi
done

echo "Files from src directory flattened to root with original filenames. Original src directory preserved for reference."
