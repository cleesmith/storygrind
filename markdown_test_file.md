# Heading Level 1
## Heading Level 2
### Heading Level 3
#### Heading Level 4
##### Heading Level 5
###### Heading Level 6

This is a regular paragraph with a simple sentence.

This paragraph contains **bold text**, *italic text*, and ***bold italic text***. It also has ~~strikethrough text~~ and `inline code` elements. Let's also include a [link to Google](https://www.google.com) and an ![image description](https://example.com/image.jpg).

Here's a longer paragraph that spans multiple lines and contains various formatting elements. The purpose of this paragraph is to provide your JavaScript code with a more substantial block of text to process. It includes elements like **bold phrases** scattered throughout, along with *italicized sections* that might span across different parts of the text. Additionally, there are `inline code segments` and [links to various websites](https://example.com) that your code will need to handle properly when removing the Markdown formatting.

A very short line.

> This is a blockquote
> 
> It spans multiple lines
> 
> > And can be nested like this

Let's try some lists:

* Unordered list item 1
* Unordered list item 2
  * Nested unordered item 2.1
  * Nested unordered item 2.2
* Unordered list item 3

1. Ordered list item 1
2. Ordered list item 2
   1. Nested ordered item 2.1
   2. Nested ordered item 2.2
3. Ordered list item 3

- [ ] Unchecked task item
- [x] Checked task item

This paragraph has a footnote[^1].

[^1]: This is the footnote content.


Here is a code block:

```javascript
function removeMarkdown(markdownText) {
  // Remove all markdown formatting
  const plainText = markdownText.replace(/[*_~`#>]/g, '');
  console.log('Markdown removed!');
  return plainText;
}
```

---

## Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |


This sentence is extremely long and contains multiple clauses, which could potentially challenge your JavaScript code's ability to handle lengthy text structures, especially if there are any specific conditions or edge cases related to sentence length or the presence of multiple punctuation marks, like commas, semicolons; or even more complex structures—like em dashes—that might appear in natural writing but could interfere with regular expressions or other parsing mechanisms that your code might be using to identify and remove Markdown formatting elements.


Here's another paragraph.

And another one after an empty line.

* List item with **bold** and *italic* text
* Another item with a [link](https://example.com)
* Item with `inline code`

> A blockquote containing **bold text** and a [link](https://example.com)


<div class="custom-class">
  This is HTML content that might be present in some Markdown files.
</div>

\\( \mathbf{x} = \mathbf{A}^{-1} \mathbf{b} \\) 

This is another paragraph with a \*literal asterisk\* and a \_literal underscore\_ that should not be treated as Markdown formatting.

End of test file.

