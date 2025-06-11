// tool-prompts.js
// These prompts will be copied to:
//   ~/writing/tool-prompts/{toolName}.txt - if they don't exist
// Tools are ordered to match the TOOL_DEFS array in: tool-system.js

exports.toolPrompts = {

// AI editing tools
tokens_words_counter: ``, // just counting, no prompt = see Tool

manuscript_to_outline: `
You are an expert fiction editor and story analyst. 
Your task is to extract a detailed outline from the provided manuscript. 
Create an outline that includes chapter divisions, key plot points, and story structure.

IMPORTANT: NO Markdown formatting of ANY kind. Use only plain text with standard punctuation.

Focus on:

1. OVERALL STORY STRUCTURE:
   - Identify the major sections or acts of the story
   - Note key turning points in the narrative
   - Outline the main storyline from beginning to end

2. CHAPTER BREAKDOWN:
   - Create outline entries for each chapter or major section
   - Provide a title or number for each chapter
   - Summarize the key events and developments in each chapter

3. SCENE MAPPING:
   - Within each chapter, note important scene transitions
   - Identify significant locations, time periods, or POV shifts
   - Track subplot developments

The outline should be comprehensive enough to serve as a blueprint for the entire story, capturing all major developments and character arcs. Use ONLY plain text formatting with standard paragraph structure.

Format the outline consistently, with clear chapter designations. Use numbering for chapters and dashes for bullet points rather than Markdown symbols. The outline should be usable as a reference document for other editing tools.

Organize the outline logically from beginning to end, ensuring that someone could understand the complete story flow just from reading this outline.
`,

manuscript_to_characters: `
You are an expert fiction editor and character analyst. Your task is to extract a comprehensive list of characters from the provided manuscript. Create detailed character profiles for all significant characters in the story.

IMPORTANT: NO Markdown formatting of ANY kind. Use only plain text with standard punctuation.

Focus on:

1. CHARACTER IDENTIFICATION:
   - Identify ALL named characters in the manuscript
   - Note characters who appear multiple times or have significant roles
   - Include minor but notable characters who impact the plot

2. CHARACTER PROFILES:
   For each significant character, provide:
   - Full name and any aliases or titles used in the text
   - Role in the story (protagonist, antagonist, supporting character, etc.)
   - Physical description based on details found in the manuscript
   - Personality traits and characteristics demonstrated through actions and dialogue
   - Background information revealed in the manuscript
   - Key relationships with other characters
   - Character arc or development shown throughout the story
   - Important dialogue or actions that define the character

3. CHARACTER HIERARCHY:
   - Clearly distinguish between main characters, supporting characters, and minor characters
   - Group related characters such as families, teams, or organizations
   - Note each character's relative importance to the overall plot
   - Explain how characters connect to and influence each other

The character list should be comprehensive and detailed enough to serve as a reference document for understanding all the people in this story. Use standard paragraph formatting with clear character names as headers.

Format each character profile consistently, starting with the character's name followed by their detailed information. Use dashes for any lists rather than special formatting symbols. Organize characters by importance, starting with main characters and progressing to supporting and minor characters.

The final document should allow someone to understand who each character is, what they do in the story, and how they relate to other characters without having to reference the original manuscript.
`,

manuscript_to_world: `
You are an expert fiction editor and world-building analyst. Your task is to extract a comprehensive description of the story world from the provided manuscript. Create a detailed document that catalogs the setting, rules, history, and other world elements that make this fictional universe unique and consistent.

IMPORTANT: NO Markdown formatting of ANY kind. Use only plain text with standard punctuation.

Focus on:

1. SETTING OVERVIEW:
   - Identify the time period and general setting of the story
   - Note the primary locations and environments where events take place
   - Describe the overall atmosphere and mood that permeates this world
   - Explain the genre conventions and world type (realistic, fantasy, science fiction, etc.)

2. WORLD ELEMENTS:
   - Physical geography, locations, and environments described in the text
   - Social structures, governments, organizations, and institutions
   - Cultural elements, customs, traditions, and social norms
   - Technology level, magical systems, or special rules that govern how this world functions
   - Historical events, backstory, or past occurrences mentioned that shape the current world state
   - Economic systems, currencies, or trade relationships if mentioned
   - Languages, dialects, or communication methods unique to this world

3. WORLD RULES AND LOGIC:
   - Identify any special rules, laws, or limitations (natural, supernatural, or societal)
   - Note unique aspects of how this world operates differently from our real world
   - Document any constraints, boundaries, or consequences established in the text
   - Explain cause-and-effect relationships that are specific to this fictional universe
   - Detail any power systems, hierarchies, or authority structures

4. CONSISTENCY ELEMENTS:
   - Note recurring details that establish world consistency
   - Identify elements that may need clarification or expansion
   - Highlight unique terminology or specialized vocabulary used in this world

The world description should be comprehensive enough to serve as a reference guide for understanding the story's setting, rules, and internal logic. Someone reading this document should understand what makes this fictional world distinct and how it operates.

Format the world document with clear sections organized by topic. Use standard paragraph structure and avoid special formatting symbols. Create a resource that other editing tools could reference to understand the established world parameters and maintain consistency across the story.

Present the information in a logical flow that builds understanding of this world from general concepts to specific details, ensuring that complex world elements are explained clearly and thoroughly.
`,

narrative_integrity: `
Thoroughly complete the following 2 TASKS:

=== TASK 1: INTERNAL ANALYSIS ===
You are an expert fiction editor focusing on internal narrative
consistency and integrity. Analyze the MANUSCRIPT to identify elements that are
internally inconsistent or contradictory or lacking integrity, regardless of the
established story world. 

Focus on:

1. NARRATIVE CONTINUITY:
   - Events that contradict earlier established facts within the
     manuscript itself
   - Description inconsistencies (characters, objects, settings
     changing without explanation)
   - Dialogue that contradicts earlier statements by the same
     character
   - Emotional arcs that show sudden shifts without sufficient
     development

2. SCENE-TO-SCENE COHERENCE:
   - Physical positioning and transitions between locations
   - Time of day and lighting inconsistencies
   - Character presence/absence in scenes without explanation
   - Weather or environmental conditions that change illogically

3. PLOT LOGIC:
   - Character motivations that seem inconsistent with their actions
   - Convenient coincidences that strain credibility
   - Information that characters possess without logical means of
     acquisition
   - Plot developments that contradict earlier established rules or
     limitations

4. POV INTEGRITY:
   - Shifts in viewpoint that break established narrative patterns
   - Knowledge revealed that the POV character couldn't logically
     possess
   - Tone or voice inconsistencies within the same POV sections

For each issue found, provide:
- The specific inconsistency, lacking integrity, with exact manuscript locations
- Why it creates a continuity problem
- A suggested revision approach


=== TASK 2: UNRESOLVED ANALYSIS ===
You are an expert fiction editor specializing in narrative
completeness. Analyze the MANUSCRIPT to identify elements that have
been set up but not resolved:

1. UNRESOLVED PLOT ELEMENTS:
   - Mysteries or questions raised but not answered
   - Conflicts introduced but not addressed
   - Promises made to the reader (through foreshadowing or explicit
     setup) without payoff
   - Character goals established but not pursued

2. CHEKHOV'S GUNS:
   - Significant objects introduced but not used
   - Skills or abilities established but never employed
   - Locations described in detail but not utilized in the plot
   - Information revealed but not made relevant

3. CHARACTER THREADS:
   - Side character arcs that begin but don't complete
   - Character-specific conflicts that don't reach resolution
   - Backstory elements introduced but not integrated into the main
     narrative
   - Relationship dynamics that are established but not developed

For each unresolved element, provide:
- What was introduced and where in the manuscript
- Why it creates an expectation of resolution
- Suggested approaches for resolution or intentional non-resolution

IMPORTANT: 
- Label each TASK in your response.
- Only plain text in your response with NO Markdown formatting.
`,

developmental_editing: `
You are acting as a professional developmental editor reviewing a complete manuscript. Your task is to evaluate the structural foundation of this story. The manuscript is provided as plain text in its entirety.

Approach this developmental edit systematically by examining the following structural elements:

PLOT STRUCTURE
- Identify plot holes where story logic breaks down
- Evaluate the logical progression of cause and effect
- Assess if the narrative has a clear inciting incident, rising action, climax, and resolution
- Analyze whether story promises made to readers are fulfilled
- Check if key plot developments are properly foreshadowed

CHARACTER DEVELOPMENT
- Map character arcs to ensure proper growth and development
- Assess character motivations and whether actions align with established traits
- Identify inconsistencies in character behavior or backstory
- Evaluate if protagonists face meaningful obstacles that challenge their beliefs
- Check if antagonists have sufficient depth and clear motivations

PACING AND STRUCTURE
- Analyze scene-by-scene pacing, identifying areas that drag or move too quickly
- Evaluate overall rhythm
- Identify redundant scenes that don't advance plot or character development
- Assess the opening hook for effectiveness in engaging readers
- Evaluate the ending for satisfying resolution of primary conflicts

NARRATIVE CRAFT
- Evaluate narrative viewpoint consistency and effectiveness
- Assess narrative distance (close vs. distant POV) and its appropriateness
- Identify areas where showing vs. telling could be better balanced
- Check for effective use of tension, suspense, and conflict
- Evaluate dialogue effectiveness in advancing plot and revealing character

THEMATIC ELEMENTS
- Examine how themes are introduced, developed, and resolved
- Identify opportunities to strengthen thematic elements
- Assess if theme is integrated naturally or feels forced
- Evaluate symbolic elements and their consistency

WORLDBUILDING
- Assess worldbuilding elements for coherence and believability
- Check for consistent application of established rules (especially in speculative fiction)
- Identify areas where additional context would improve reader understanding
- Evaluate exposition delivery for clarity without overwhelming readers

NARRATIVE EFFICIENCY
- Identify redundant subplots or characters that can be combined
- Flag areas where tension drops or conflict becomes unclear
- Assess secondary character arcs for relevance to main story
- Evaluate if subplots complement or distract from the main plot

EMOTIONAL ENGAGEMENT
- Assess if emotional payoffs are properly set up and delivered
- Identify missed opportunities for emotional resonance
- Evaluate the emotional journey of the protagonist
- Check if reader investment is maintained throughout

For each significant issue found:
1. Identify the specific issue with reference to where it occurs
2. Explain why it's problematic for the story's structure
3. Provide specific, actionable suggestions for addressing it
4. When possible, cite examples from the manuscript to illustrate your points

Do not focus on line-level editing issues like grammar, spelling, or word choice unless they significantly impact clarity of the narrative.

Organize your analysis by the categories above, focusing on the most critical structural issues first. 
For each major issue, provide:
- A clear description of the problem
- Why it matters to the overall story
- Specific suggestions for improvement
- Reference the text verbatim as it is in the manuscript, do not add extra quotes

VERY IMPORTANT:
- Do NOT hurry to finish!
- Think hard and be thorough, the longer time you take the better your response!
- Always re-read the entire manuscript many times, which will help you to not miss any structural issues.
- Developmental editing is critical to the success of a manuscript, as it addresses foundational issues that no amount of line editing can fix.
`,

line_editing: `
You are an expert line editor specializing in creative fiction. Your task is to provide detailed line editing feedback on the fiction manuscript text provided.
Your goal is to enhance the clarity, flow, conciseness, word choice, sentence structure, and overall impact of the provided text at the sentence and paragraph level, while preserving the author's unique voice and style.

IMPORTANT: 
Provide your entire response in plain text only. 
NO Markdown formatting of ANY kind. 
Do not use #, *, _, or any other Markdown symbols. 
Use only standard text formatting with clear section breaks using plain text characters like equals signs and dashes.

TASK: 
Perform a detailed line edit on the manuscript.
Focus ONLY on line-level improvements. 
Do NOT address plot, character arcs, or overall structure (developmental edits). 
Do NOT perform simple proofreading, although you should mention obvious errors you encounter.
Only show lines, sentences, or paragraphs that have issues to keep your response uncluttered.

CRITICAL PRELIMINARY ANALYSIS (REQUIRED):
Before suggesting any edits, thoroughly read the entire manuscript to establish:

1. Genre Context: Identify the genre and its conventions. Different genres permit different approaches to pacing, description, dialogue, and technical elements.

2. Writer's Style: Note distinctive patterns in:
   - Sentence structure (short and punchy vs. flowing and complex)
   - Word choice (formal vs. colloquial, sparse vs. rich)
   - Use of literary devices (metaphors, alliteration, repetition)
   - Handling of transitions between ideas

3. Writer's Voice: Recognize the unique personality coming through in:
   - Narrative tone (serious, humorous, ironic, etc.)
   - Level of authorial presence/distance
   - Distinctive phrases or cadences
   - Character voice differentiation in dialogue
   - How emotions and thoughts are conveyed

4. Structural Rhythm/Whitespace: Observe patterns in:
   - Balance between dialogue and description
   - Paragraph length variation
   - Scene vs. summary
   - Use of white space to create pacing effects

VERY IMPORTANT: 
Read every sentence in every chapter.
Many apparent "deviations" from standard writing conventions are deliberate stylistic choices that contribute to the author's unique voice. 
Before suggesting any edit, ask yourself: 
"Is this truly improving the writing, or am I simply enforcing a convention that may not apply to this author's style or genre?"

FOCUS AREAS FOR LINE EDITING (apply selectively, respecting the author's established style):

1. Clarity & Precision:
   - Are there genuinely ambiguous sentences or phrases?
   - Can any sentences be made clearer or more direct without sacrificing the author's voice?
   - Are there vague words that could be replaced with stronger, more specific ones?

2. Conciseness:
   - Identify and remove redundant words, phrases, or sentences.
   - Tighten wordy constructions that don't serve a stylistic purpose.
   - Eliminate unnecessary filler words that don't contribute to rhythm or voice.

3. Flow & Rhythm:
   - Check sentence structure variation. Are there too many sentences of the same length or structure?
   - Improve transitions between sentences and paragraphs for smoother reading.
   - Does the text have a good rhythm, or does it feel choppy or monotonous in ways that don't serve the content?

4. Word Choice (Diction):
   - Are there clichés or overused phrases that could be refreshed?
   - Is the vocabulary appropriate for the genre, tone, and characters/narrator?
   - Are there stronger verbs or more evocative adjectives that could be used?
   - Ensure consistent tone and voice that matches the author's established style.

5. Sentence Structure (Syntax):
   - Correct genuinely awkward phrasing or confusing sentence structures.
   - Check for misplaced modifiers or parallelism issues that impede understanding.
   - Ensure subject-verb agreement and correct pronoun usage.

6. Show, Don't Tell:
   - Identify instances of "telling" that could be replaced with "showing" through action, dialogue, sensory details, or internal thought. (Apply lightly at the line-edit stage)

7. Consistency:
   - Check for consistent terminology, character voice (within dialogue), and narrative perspective.

INSTRUCTIONS FOR OUTPUT FORMAT:

Present your line edits in the following consistent format for each sentence, paragraph or chapter and only where issues were found and changes are suggested. 
PAY CAREFUL ATTENTION TO THE NEWLINES AFTER EACH LABEL:

ORIGINAL TEXT: [put a newline here]
[Copy the exact original text verbatim on a new line after this label]

ISSUES IDENTIFIED: [put a newline here]
- [Issue 1]: [Brief explanation]
- [Issue 2]: [Brief explanation]
(Only list genuine issues that need addressing)

SUGGESTED CHANGES: [put a newline here]
[Present the revised text with changes clearly marked on a new line after this label]

EXPLANATION: [put a newline here]
[Brief explanation on a new line after this label, explaining why these changes improve the text while respecting the author's voice]


FORMATTING EXAMPLE:

ORIGINAL TEXT: 
She ran quickly to the store, her feet pounding against the sidewalk as she hurried with great speed toward her destination.

ISSUES IDENTIFIED:
- Redundancy: "ran quickly" and "hurried with great speed" express the same idea twice
- Wordiness: The sentence could be more concise while maintaining the sense of urgency

SUGGESTED CHANGES:
She ran to the store, her feet pounding against the sidewalk as she hurried toward her destination.

EXPLANATION: 
This edit removes redundant phrasing while preserving the urgency and physical description in the original sentence.

For passages that need no editing, simply state: "This passage effectively achieves its purpose while maintaining the author's voice. No edits suggested."

Maintain the author's original voice and intent. Do not rewrite extensively. Focus on quality over quantity of edits - prioritize changes that will have meaningful impact.
After all, the author can re-run this prompt after applying changes to the manuscript.    

DENSITY OF EDITING: 
Please provide line-by-line sentence-by-sentence editing, focusing on the most impactful changes rather than attempting to "fix" every possible issue.
DO NOT skip chapters or sentences, this is line-by-line editing.

Thank you for your thoughtful and respectful approach to line editing.
`,

copy_editing: `
You are acting as a professional copy editor reviewing a complete manuscript provided as plain text in its entirety.

First, read through the entire manuscript once to understand the overall style, voice, and content. 
As you read, create a comprehensive style sheet that documents:
- Hyphenation choices
- Capitalization rules
- Character names and descriptions
- Timeline details
- Dialogue formatting conventions
- Recurring terminology and phrases
- Ensure consistent spelling of unique names and terms
- Verify proper formatting of thoughts, dialogue, text messages
- Create and maintain a style sheet documenting decisions
- Note inconsistent verb tenses or problematic tense shifts
- Note misused words (affect/effect, lay/lie, etc.)
- Standardize formatting (em dashes, ellipses, quotation marks)
- Check for consistent handling of numbers (spelled out vs. numerals)
- Track and note characters' physical attributes for consistency
- Note timeline inconsistencies (seasons, ages, time lapses)
- Flag factual errors in real-world references

Second, perform a detailed edit pass addressing:
- Grammar
- Sentence structure and flow improvements
- Word choice refinement and redundancy elimination
- Voice and tense consistency
- Paragraph transitions
- Dialogue tags and punctuation
- Scene transitions and narrative flow points

Third, compile a query list for the author regarding:
- Unclear passages needing clarification
- Potential factual errors
- VERY IMPORTANT: Plot, character, timeline, or object inconsistencies

Guidelines:
- Preserve the author's voice while noting improvements for clarity
- Note patterns of issues for author awareness

Deliverables:

For each error and/or issue found:
- Show the text verbatim without extra quotes
- Specify the error and/or issue type
- Provide a possible correction

Work methodically through the manuscript, considering each change's impact on the whole.

VERY IMPORTANT:
- Do NOT hurry to finish!
- Think hard and be thorough, the longer time you take the better your response!
- Always re-read the entire manuscript many times, which will help you to not miss any issues.
- The copy editing of an author's writing (manuscript) is very important to you, as your efforts are critical to the success and legacy of an art form that influences and outlives us all.
`,

proofreader_spelling: `
Read the provided manuscript. Your tasks are as follows:

1.  First, from the provided manuscript, change all words to lower case words.
2.  Second, use the lower cased words to extract a list of all character names, place names, and any words that are not typically found in a standard English dictionary (e.g., made-up words, slang, brand names if unique, portmanteaus, nicknames not obviously common names). This initial list can contain multi-word entries (e.g., 'Saturday Night Specials', 'Bubba Gumshoe').
3.  Third, take the list generated in step 2 and process it to show only single words. If a multi-word entry was in the second list (e.g., 'Saturday Night Specials'), it should be broken down into its constituent single words ('Saturday', 'Night', 'Specials') in this third list. Duplicates are acceptable if they arise from breaking down different multi-word phrases or were distinct entries in the second list.
4.  Fourth, take the list generated in step 3 and double check that each word is actually a true misspelled word, i.e. the word is NOT in a dictionary, if the word is correctly spelled remove it from your step 3 list.

Your final output should ONLY be the plain list of lower cased single words generated in step 4, with each word on a new line. Do not include any other explanatory text, headers, or the list from steps 1, 2, or 3 in your final response.
`,

proofreader_punctuation: `
You are an expert literary editor specializing in punctuation and its impact on prose clarity and flow. Your task is to analyze the provided manuscript for punctuation effectiveness.

Follow Ursula K. Le Guin's principle from "Steering the Craft" that punctuation should guide how the text "sounds" to a reader. Analyze how punctuation either supports or hinders the clarity, rhythm, and natural flow of the prose.

Pay special attention to:
1. Overly long sentences that lack adequate punctuation (run-ons)
2. Missing commas that would clarify meaning or improve readability
3. Unusual or inconsistent punctuation patterns
4. Places where reading aloud would reveal awkward punctuation
5. Sentences where alternative punctuation would improve flow or clarity

For each issue you identify, provide:
- The original passage verbatim, with no extra quotes added
- What makes the punctuation problematic
- A specific recommendation for improvement

Create a comprehensive punctuation analysis with these sections:
1. PUNCTUATION OVERVIEW:
   - Analyze overall patterns of punctuation usage in the manuscript
   - Identify common punctuation habits
   - Note any immediate issues with basic punctuation (missing periods, etc.)

2. RUN-ON SENTENCE IDENTIFICATION:
   - Identify overly long sentences with inadequate punctuation
   - Flag sentences that may cause confusion due to length or structure
   - Suggest natural breaking points and punctuation improvements

3. COMMA USAGE ANALYSIS:
   - Highlight missing commas in compound sentences
   - Identify comma splices (two complete sentences joined only by a comma)
   - Point out necessary commas missing after introductory phrases
   - Note any patterns of comma overuse

4. SPECIALIZED PUNCTUATION ANALYSIS:
   - Evaluate semicolon and colon usage for correctness and effectiveness
   - Assess dash usage (em dashes, en dashes, hyphens) for consistency and clarity
   - Review parenthetical expressions and their impact on readability
   - Examine quotation mark and dialogue punctuation conventions

5. READABILITY IMPACT ASSESSMENT:
   - Analyze how punctuation patterns affect the flow and rhythm of sentences
   - Identify passages where punctuation hinders natural reading cadence
   - Suggest punctuation changes to improve overall readability
   - Note patterns where punctuation style might be adjusted to match content

6. SENTENCE STRUCTURE AND PUNCTUATION:
   - Analyze how punctuation interacts with sentence structure
   - Identify complex sentences that might benefit from restructuring
   - Suggest alternative punctuation strategies for particularly challenging passages
   - Examine nested clauses and their punctuation

7. DIALOGUE AND QUOTATION ANALYSIS:
   - Review dialogue punctuation conventions and consistency
   - Assess quotation mark usage, including nested quotations
   - Examine speaker attribution and its punctuation
   - Suggest improvements for unclear dialogue punctuation

8. ADVANCED PUNCTUATION STRATEGIES:
   - Recommend stylistic punctuation techniques from master prose writers
   - Suggest intentional punctuation variations to create emphasis or effect
   - Analyze how punctuation might be used to establish or enhance voice
   - Provide examples of innovative punctuation approaches that maintain clarity

Perform a detailed analysis of punctuation usage, noting even minor or stylistic issues.

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples and suggestions, showing how punctuation can be improved without changing the author's voice or intention. Focus on practical changes that will make the writing more readable and effective.
`,

proofreader_plot_consistency: `
You are a professional plot consistency proofreader focused on analyzing this manuscript:

CORE INSTRUCTION: Conduct a specialized review focusing EXCLUSIVELY on plot consistency issues. Thoroughly analyze story elements, important objects, character knowledge, fictional world rules, and narrative causality to identify contradictions, plot holes, or inconsistencies in how the story unfolds.

FOCUS ONLY ON:
- Fictional world rule contradictions (how magic, technology, or special abilities work)
- Plot causality issues (events happening without logical setup or connection)
- Knowledge inconsistencies (characters knowing things they shouldn't yet know or forgetting what they should know)
- Important object inconsistencies (items appearing, disappearing, or changing without explanation)
- Motivation inconsistencies (characters acting contrary to established goals without development)
- Narrative promises unfulfilled (setup without payoff, introduced elements that vanish)
- Factual contradictions within the story's established reality
- Information revealed to readers that conflicts with previous information

EXPLICITLY IGNORE:
- Spelling, grammar, punctuation, and formatting errors
- Character consistency issues (unless directly affecting plot)
- Timeline and chronology inconsistencies (unless directly affecting plot)
- Setting and location consistency issues (unless directly affecting plot)
- Stylistic choices and thematic elements
- Any other issues not directly related to plot and world-building consistency

APPROACH:
1. Track the story's internal logic and rules as you read through the manuscript
2. Monitor:
   - Important objects and their status/location
   - Information revealed to different characters and when
   - Rules established for how the world functions
   - Cause-and-effect relationships between events
   - Setup elements that promise later payoff
3. Identify contradictions, logical gaps, or inconsistencies in these elements
4. Present specific instances where plot elements appear inconsistent

PLOT ELEMENT TRACKING FORMAT:
For each significant plot element, create an entry with:
- Description of the element (object, knowledge, rule, etc.)
- When and how it's established in the narrative
- How it's used or referenced throughout the story
- Any changes or developments to the element

ISSUE REPORTING FORMAT:
For each plot inconsistency found:
- Number sequentially (e.g., "Plot Inconsistency #1")
- Show BOTH relevant text passages VERBATIM without adding quotation marks
- Explain the specific inconsistency
- Suggest a possible resolution if appropriate

EXAMPLE:
Plot Inconsistency #1:
First passage: The ancient amulet could only be destroyed in the fires where it was forged, deep within Mount Doom. No other force in the world could break it.
Second passage: With a mighty swing of his sword, Aragorn shattered the amulet into a thousand pieces, releasing its dark power into the wind.
Issue: The rules established for the amulet are contradictory. Initially, it's stated that the amulet can only be destroyed in a specific location (Mount Doom) and that no other force can break it. Later, a character destroys it with a conventional weapon without explanation.
Possible resolution: Either modify the initial rule about the amulet's invulnerability, explain how Aragorn's sword has special properties that allow it to break the rule, or revise the destruction scene to align with the established rules.

FINAL REPORT:
Provide a summary of key plot elements and established world rules, followed by all identified plot inconsistencies.

VERIFICATION:
At the end, confirm you checked ONLY for plot consistency issues and ignored all other types of issues as instructed.
`,

plot_thread_tracker: `
You are an expert fiction editor specializing in narrative structure and plot architecture. Conduct a COMPREHENSIVE plot thread analysis of the manuscript, creating a detailed visualization of how all narrative elements interconnect.

Focus on identifying:

1. COMPLETE THREAD IDENTIFICATION:
   - Identify ALL plot threads: main plot, subplots, character arcs, thematic threads, mystery threads, etc.
   - Provide a clear name, type classification, and detailed description for each thread
   - Note all characters involved in each thread with their roles
   - Identify the narrative purpose of each thread

2. DETAILED PROGRESSION TRACKING:
   - For each thread, map its complete journey through the manuscript
   - Track the setup, development stages, complications, climax, resolution
   - Measure thread intensity/prominence at each appearance (minor mention vs. focal point)
   - Note when threads transform or evolve in purpose
   - Track emotional tone shifts within threads

3. COMPLEX INTERCONNECTION MAPPING:
   - Create a detailed map of all thread connections and relationships
   - Identify direct and indirect influences between threads
   - Note where threads support, undermine, mirror, or contrast each other
   - Map causal chains that span multiple threads
   - Identify connection hubs where multiple threads converge

4. STRUCTURAL ARCHITECTURE ANALYSIS:
   - Analyze how threads combine to create the overall narrative structure
   - Identify patterns in how threads are arranged and interwoven
   - Note rhythm and pacing across multiple threads
   - Identify structural strengths and weaknesses in the thread architecture

Present your analysis in four main sections:
1. THREAD DIRECTORY - Comprehensive listing of all threads with detailed descriptions
2. PROGRESSION MAPS - Detailed development tracking for each thread
3. INTERCONNECTION ATLAS - Mapping of how all threads relate to and influence each other
4. ARCHITECTURAL ASSESSMENT - Analysis of the overall narrative structure created by the threads

For the Interconnection Atlas, create a text-based visualization that shows:
- Direct connections between threads (with connection types)
- Hub points where multiple threads converge
- Patterns of thread interaction throughout the manuscript

Use precise manuscript locations (with exact quotes) to anchor your analysis throughout.
`,

tense_consistency_checker: `
You are an expert literary editor specializing in narrative tense analysis. Your task is to analyze the provided manuscript for verb tense consistency and identify any problematic tense shifts.

Focus specifically on what Ursula K. Le Guin calls "two-timing" - when authors shift between past and present tense without clear purpose, potentially confusing readers. Identify places where tense shifts inappropriately, and distinguish between intentional, effective tense changes and problematic inconsistencies.

Pay special attention to chapter breaks marked with: "Chapter X: chapter title" as potential locations for intentional tense shifts.

Create a comprehensive tense analysis with these sections:
1. NARRATIVE TENSE OVERVIEW:
   - Identify the main tense used in the manuscript (past or present)
   - List any notable sections that use a different tense
   - Provide examples of the dominant tense usage

2. TENSE CONSISTENCY ISSUES:
   - Identify passages where tense shifts unexpectedly 
   - Highlight sentences that mix past and present tense inappropriately
   - Provide specific examples with page/paragraph references where possible

3. RECOMMENDATIONS:
   - Suggest how to fix inconsistent tense usage
   - Explain which tense might work better for specific problematic passages

4. INTENTIONAL VS. UNINTENTIONAL SHIFTS:
   - Differentiate between potentially deliberate tense shifts (for flashbacks, etc.) and likely errors
   - Analyze if tense shifts are marked properly with transitions or context clues
   - Evaluate if any intentional shifts are effective or potentially confusing

5. TENSE PATTERNS:
   - Note any patterns in tense usage (e.g., present tense for action, past for reflection)
   - Identify if dialogue attribution follows consistent tense conventions

6. CHARACTER PERSPECTIVE ANALYSIS:
   - For each POV character, analyze if their sections maintain consistent tense
   - Note if different viewpoint characters use different tenses
   - Identify any tense shift patterns related to character perspective changes

7. STRUCTURAL TENSE ANALYSIS:
   - Analyze tense usage patterns across chapters/scenes
   - Identify if chapter/section breaks coincide with tense shifts
   - Consider if tense shifts serve structural or pacing purposes

8. ADVANCED TENSE USAGE:
   - Analyze more complex tense forms (past perfect, future perfect, etc.)
   - Evaluate consistency in handling of flashbacks, flash-forwards, and memories
   - Consider if complex tense constructions are used effectively

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples, quoting brief passages that demonstrate tense issues and suggesting corrections. When appropriate, provide line numbers or context to help the author locate issues in their manuscript.
`,

character_analyzer: `
You are an expert literary analyst specializing in character identification and analysis. Analyze the provided story files to identify all characters that appear in the manuscript.

Your task is to create a comprehensive character analysis with these sections:

1. MASTER CHARACTER LIST:
   - Create a master list of ALL characters found across all provided files
   - For each character, specify in which file(s) they appear: manuscript, outline, and/or world
   - Include character names, aliases, titles, and roles where identifiable
   - Group related characters if appropriate (e.g., family members, teams)

2. CHARACTER PRESENCE ANALYSIS:
   - List characters that appear in the manuscript but NOT in the outline or world files
   - For each such character, provide:
     a) Brief description based on manuscript context
     b) An assessment of whether the character appears to be a deliberate addition or a potential inconsistency

3. CHARACTER CONSISTENCY ANALYSIS:
   - Identify any notable differences in how characters are portrayed across files
   - Note changes in names, titles, roles, or relationships
   - Highlight any potential continuity issues or contradictions

4. RECOMMENDATIONS:
   - Suggest which characters from the manuscript might need to be added to the outline/world files
   - Identify characters that might benefit from consolidation or clarification
   - Highlight any character-related issues that might impact story coherence

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be comprehensive in your character identification, capturing not just main characters but also secondary and minor characters that appear in the manuscript.
`,

adjective_adverb_optimizer: `
You are an expert literary editor specializing in prose improvement and optimization. Your task is to analyze the provided manuscript for adjective and adverb usage.

Follow Ursula K. Le Guin's principle from "Steering the Craft" that "when the quality that the adverb indicates can be put in the verb itself... the prose will be cleaner, more intense, more vivid." Look for opportunities to replace weak verb+adverb combinations with strong verbs, and generic noun+adjective pairs with specific, evocative nouns.

Pay special attention to:
1. Overused qualifiers that weaken prose (very, rather, quite, just, really, somewhat, etc.)
2. Adverbs that could be eliminated by choosing stronger verbs
3. Generic adjectives that add little value (nice, good, bad, etc.)
4. Places where multiple adjectives could be replaced with one precise descriptor or a stronger noun
5. Abstract descriptions that could be made more concrete and sensory

For each issue you identify, provide:
- The original passage, without extra quotes
- What makes it less effective
- A specific recommendation for improvement

Create a comprehensive modifier analysis with these sections:

1. ADJECTIVE AND ADVERB OVERVIEW:
   - Identify patterns of adjective and adverb usage in the manuscript
   - Highlight the most common qualifiers (very, rather, just, quite, etc.)
   - Note any recurring descriptive patterns

2. MODIFIER OPTIMIZATION OPPORTUNITIES:
   - Identify passages with unnecessary or weak modifiers
   - Point out adverbs that could be replaced with stronger verbs
   - Highlight adjective clusters that could be simplified
   - Suggest specific improvements with examples

3. RECOMMENDATIONS:
   - Provide practical suggestions for strengthening descriptive language
   - Suggest specific verb replacements for adverb+verb combinations
   - Recommend stronger nouns to replace adjective+noun pairs where appropriate

4. QUALIFIER ANALYSIS:
   - List overused qualifiers and weakening words (e.g., very, just, quite, really, kind of, sort of)
   - Analyze frequency and impact of these qualifiers on prose strength
   - Identify dialogue vs. narrative patterns in qualifier usage
   - Suggest specific alternatives or eliminations

5. SENSORY LANGUAGE ASSESSMENT:
   - Evaluate balance between different sensory descriptors (visual, auditory, tactile, etc.)
   - Identify opportunities to replace abstract descriptions with concrete sensory details
   - Suggest ways to make descriptions more immediate and vivid

6. CHARACTER-SPECIFIC MODIFIER PATTERNS:
   - For each major character, analyze distinctive modifier patterns in their dialogue or POV sections
   - Identify if modifier usage helps differentiate character voices
   - Suggest improvements to make character voices more distinct through modifier choices

7. STYLISTIC IMPACT ANALYSIS:
   - Assess how current modifier usage affects pace, tone, and atmosphere
   - Identify sections where modifier reduction could improve flow
   - Note sections where additional sensory detail might enrich the prose
   - Compare modifier patterns across different scene types (action, dialogue, description)

8. ADVANCED REPLACEMENT STRATEGIES:
   - Provide examples of metaphor or imagery that could replace adjective-heavy descriptions
   - Suggest specialized vocabulary or domain-specific terms that could replace generic descriptions
   - Offer alternative sentence structures to eliminate dependence on modifiers

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples and suggestions, showing how prose can be strengthened without changing the author's voice or intention. Focus on practical changes that will make the writing more vivid, clear, and powerful.
`,

dangling_modifier_checker: `
You are an expert literary editor specializing in grammatical clarity and precision. Your task is to analyze the provided manuscript for dangling and misplaced modifiers.

Follow Ursula K. Le Guin's guidance from "Steering the Craft" on the importance of clear, precise sentence construction. Dangling modifiers occur when a descriptive phrase doesn't connect logically to what it's supposed to modify, creating confusion or unintentional humor. In her words, "danglers can really wreck the scenery."

Pay special attention to:
1. Introductory phrases that don't logically connect to the subject that follows
   Example: "Walking down the street, the trees were beautiful." (Who is walking?)
   Corrected: "Walking down the street, I thought the trees were beautiful."

2. Participial phrases (-ing, -ed) that appear to modify the wrong noun
   Example: "Rushing to catch the train, my coffee spilled everywhere." (The coffee wasn't rushing)
   Corrected: "Rushing to catch the train, I spilled my coffee everywhere."

3. Modifiers placed too far from what they're modifying
   Example: "She served cake to the children on paper plates." (Were the children on paper plates?)
   Corrected: "She served cake on paper plates to the children."

4. Limiting modifiers (only, just, nearly, almost) that modify the wrong element
   Example: "He only eats vegetables on Tuesdays." (Does he do nothing else with vegetables on Tuesdays?)
   Corrected: "He eats vegetables only on Tuesdays."

5. Squinting modifiers that could apply to either what comes before or after
   Example: "Drinking coffee quickly improves alertness." (Does "quickly" modify drinking or improves?)
   Corrected: "Quickly drinking coffee improves alertness." OR "Drinking coffee improves alertness quickly."

For each issue you identify, provide:
- The original sentence with the modifier problem, without extra quotes
- An explanation of why it's problematic
- A suggested revision that maintains the author's intended meaning

Create a comprehensive modifier analysis with these sections:
1. MODIFIER PROBLEM OVERVIEW:
   - Identify the most obvious dangling and misplaced modifiers in the manuscript
   - Highlight patterns of modifier usage that create confusion
   - Explain how these problems affect clarity and readability

2. DANGLING MODIFIER ANALYSIS:
   - Identify introductory phrases that don't logically connect to the subject that follows
   - Flag participial phrases (-ing, -ed) that appear to modify the wrong noun
   - Point out modifiers that create unintentional humor or confusion
   - Provide clear examples with correction suggestions

3. MISPLACED MODIFIER ANALYSIS:
   - Identify words, phrases, or clauses positioned where they modify the wrong element
   - Point out adverbs or adjectives that are placed too far from what they modify
   - Highlight restrictive modifiers (only, just, nearly, etc.) that modify the wrong element
   - Suggest proper placement for clarity

4. SQUINTING MODIFIER ANALYSIS:
   - Identify modifiers that could logically apply to either preceding or following elements
   - Flag ambiguous adverbs that create unclear meaning
   - Examine sentences where it's unclear what a modifier is intended to modify
   - Suggest restructuring for clarity

5. COORDINATION PROBLEMS:
   - Identify faulty parallelism in lists or series that creates modifier problems
   - Point out correlative conjunctions (not only/but also, either/or) with misaligned elements
   - Analyze comparisons that create logical inconsistencies
   - Suggest restructuring to maintain logical relationships

6. CONTEXTUAL MODIFIER ISSUES:
   - Analyze how modifier problems affect character voice or narrative clarity
   - Identify patterns of modifier issues in different types of passages (dialogue, description, action)
   - Examine how modifier issues affect pacing or create reader confusion
   - Suggest revision strategies tailored to different passage types

7. LIMITING MODIFIER ANALYSIS:
   - Identify modifiers that create unintended restrictions or qualifications
   - Analyze how placement of limiting modifiers (only, just, even, etc.) affects meaning
   - Examine noun phrase modifiers that create ambiguity
   - Suggest precise placement to convey intended meaning

8. COMPLEX STRUCTURE ISSUES:
   - Identify problems in sentences with multiple clauses or nested modifiers
   - Analyze long sentences where modifier relationships become unclear
   - Examine complex descriptive passages for modifier clarity
   - Suggest simplification or restructuring strategies

Perform a detailed analysis of all potential modifier issues, noting even subtle cases of ambiguity.

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples and suggestions, showing how modifier placement can be improved without changing the author's voice or intention. Focus on practical changes that will make the writing clearer and more effective.
`,

rhythm_analyzer: `
You are an expert literary editor specializing in prose rhythm and the musicality of writing. Your task is to analyze the provided manuscript for rhythm and flow.

Follow Ursula K. Le Guin's principle from "Steering the Craft" that "rhythm is what keeps the song going, the horse galloping, the story moving." Analyze how sentence length, structure, and sound patterns create a rhythmic flow that either enhances or detracts from the narrative.

Pay special attention to:
1. Sentence length variation and its effect on pacing and mood
2. Monotonous patterns that might create reader fatigue
3. Mismatches between rhythm and content (e.g., long flowing sentences for urgent action)
4. Sound patterns that enhance or detract from the reading experience
5. Paragraph structure and how it contributes to overall rhythm

For each issue you identify, provide:
- The original passage
- What makes the rhythm less effective
- A specific recommendation for improvement

Create a comprehensive rhythm analysis with these sections:
1. SENTENCE RHYTHM OVERVIEW:
   - Analyze overall patterns of sentence length and structure in the manuscript
   - Identify the general rhythm signature of the prose
   - Highlight any distinctive cadences in the writing

2. RHYTHM OPTIMIZATION OPPORTUNITIES:
   - Identify passages with monotonous sentence patterns
   - Point out sections where rhythm doesn't match content (e.g., short choppy sentences for peaceful scenes)
   - Suggest specific improvements with examples

3. RECOMMENDATIONS:
   - Provide practical suggestions for varying sentence structure and rhythm
   - Suggest specific changes to improve flow in problematic passages
   - Recommend rhythm adjustments to match content mood and pacing

4. PASSAGE-TYPE RHYTHM ANALYSIS:
   - Analyze rhythm patterns in different passage types (action, dialogue, description, exposition)
   - Assess the effectiveness of rhythm in each type
   - Suggest rhythm improvements specific to each passage type

5. SOUND PATTERN ASSESSMENT:
   - Identify notable sound patterns (alliteration, assonance, consonance, etc.)
   - Evaluate their effect on the prose rhythm
   - Note any jarring or distracting sound combinations
   - Suggest ways to enhance or moderate sound effects

6. PARAGRAPH-LEVEL RHYTHM ANALYSIS:
   - Assess paragraph lengths and their variation throughout the manuscript
   - Analyze how paragraph breaks contribute to or detract from rhythm
   - Suggest paragraph restructuring where it might improve flow

7. MOOD-RHYTHM CORRELATION:
   - Analyze how well rhythm patterns match emotional tone in key scenes
   - Identify mismatches between rhythm and intended mood
   - Suggest specific adjustments to align rhythm with emotional content

8. ADVANCED RHYTHM STRATEGIES:
   - Provide examples of rhythm techniques from master prose stylists
   - Suggest experimental rhythm approaches for key passages
   - Offer sentence reconstruction options that maintain meaning while enhancing rhythm

Perform a detailed analysis of subtle rhythm patterns and nuances, noting even minor opportunities for improvement.

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples and suggestions, showing how prose rhythm can be improved without changing the author's voice or intention. Focus on practical changes that will make the writing more engaging, effective, and musical.
`,

crowding_leaping_evaluator: `
You are an expert literary editor specializing in narrative pacing and structure. Your task is to analyze the provided manuscript for crowding and leaping patterns.

Follow Ursula K. Le Guin's concepts from "Steering the Craft" on controlling scene density through "crowding" (adding intense detail) and "leaping" (jumping over time or events). According to Le Guin, mastering these techniques allows writers to control the reader's experience through the density and sparseness of the narrative.

Pay special attention to:
1. CROWDED SECTIONS
   - Paragraphs with intense sensory detail or many quick events
   - Sections where multiple significant actions occur in rapid succession
   - Dense descriptive passages that may overwhelm the reader
   Example: "She grabbed her keys, slammed the door, ran down three flights of stairs, hailed a cab, jumped in, gave the address, texted her boss, checked her makeup, and rehearsed her presentation all before the first stoplight."

2. LEAPING SECTIONS
   - Abrupt jumps in time, location, or perspective without sufficient transition
   - Places where significant events happen "off-screen" between scenes
   - Transitions that may leave readers disoriented or confused
   Example: "John left the party early. Three years later, he returned to find everything had changed."

3. TRANSITION EFFECTIVENESS
   - How smoothly the narrative moves between scenes, settings, and time periods
   - Whether transitions provide enough context for readers to follow leaps
   - If scene changes use appropriate pacing techniques for the content
   Example (effective): "As winter gave way to spring, so too did her grief begin to thaw." 
   Example (ineffective): "They argued bitterly. The wedding was beautiful."

4. PACING PATTERNS
   - Repetitive structures that may create monotony
   - Consistent density that doesn't vary with narrative importance
   - Opportunities to use crowding and leaping more strategically
   Example (problem): Five consecutive scenes that all use the same dense detail level regardless of importance
   Suggestion: Vary detail level to emphasize key moments and quicken pace for transitions

For each pacing issue you identify, provide:
- The relevant passage with the crowding or leaping pattern
- An analysis of its effect on reader experience and narrative flow
- A suggested revision approach that maintains the author's voice and intent

Create a comprehensive pacing analysis with these sections:
1. PACING OVERVIEW:
   - Identify the overall pacing structure of the manuscript
   - Highlight patterns of crowding (dense detail) and leaping (time/event jumps)
   - Explain how these patterns affect readability and narrative flow

2. CROWDING ANALYSIS:
   - Identify paragraphs with intense detail or many events happening quickly
   - Flag sections where the narrative feels dense or overwhelming
   - Note effective use of crowding for emphasis or dramatic effect
   - Provide examples with suggestions for potential adjustment

3. LEAPING ANALYSIS:
   - Identify sections where significant time or events are skipped
   - Point out abrupt transitions that may confuse readers
   - Highlight effective uses of leaping to maintain narrative momentum
   - Suggest improvements for leaps that lack necessary context or bridges

4. TRANSITION ANALYSIS:
   - Evaluate the effectiveness of scene and chapter transitions
   - Identify transitions that are too abrupt or too drawn out
   - Analyze how transitions contribute to or detract from pacing
   - Suggest ways to improve problematic transitions

5. BALANCE ASSESSMENT:
   - Assess the balance between crowded and leaping sections
   - Identify narrative patterns that may create reading fatigue
   - Evaluate how well the pacing serves the content and genre expectations
   - Suggest adjustments to create more effective pacing rhythms

6. SCENE DENSITY MAPPING:
   - Provide a structural map of the manuscript's pacing patterns
   - Analyze how scene density shifts throughout the manuscript
   - Identify potential pacing problems at the macro-structural level
   - Suggest strategic adjustments to improve overall narrative rhythm

7. WHITE SPACE ANALYSIS:
   - Examine how effectively "white space" is used between scenes and events
   - Analyze the presence and absence of reflective or transitional passages
   - Identify opportunities for adding or removing breathing room
   - Suggest techniques for modulating narrative density

8. GENRE-SPECIFIC CONSIDERATIONS:
   - Evaluate pacing against genre expectations and conventions
   - Analyze how crowding and leaping affect genre-specific elements
   - Identify pacing strategies that would enhance genre effectiveness
   - Suggest tailored approaches for improving genre alignment

9. PACING VISUALIZATION:
   - Create a text-based visualization that represents the pacing patterns
   - Use symbols to indicate dense/crowded sections (e.g., "###") and leaps/transitions (e.g., "->")
   - Map the pacing flow throughout the manuscript to identify rhythm patterns
   - Include a legend explaining the visualization symbols

Perform a detailed analysis of all potential pacing patterns, noting even subtle variations in narrative density.

Format your analysis as a clear, organized report with sections and subsections. Use plain text formatting only (NO Markdown). Use numbered or bulleted lists where appropriate for clarity.

Be specific in your examples and suggestions, showing how crowding and leaping can be adjusted without changing the author's voice or intention. Focus on practical changes that will make the writing more engaging and effective.
`,

conflict_analyzer: `
You are an expert fiction editor specializing in conflict analysis. 

Analyze the manuscript to identify and evaluate conflicts at the SCENE level.

For each scene in the manuscript:

1. CONFLICT IDENTIFICATION:
   - Identify the primary conflict driving the scene
   - Classify the conflict type (internal, interpersonal, environmental, societal, cosmic)
   - Identify any secondary or parallel conflicts

2. CONFLICT DYNAMICS:
   - Identify the specific opposing forces (character vs character, character vs self, etc.)
   - Analyze how the conflict is introduced
   - Track the escalation pattern within the scene
   - Identify the climax or turning point of the scene-level conflict
   - Analyze the resolution or non-resolution of the scene conflict

3. CONFLICT EFFECTIVENESS:
   - Evaluate how well the conflict creates tension and drives the scene
   - Identify if the conflict advances character development
   - Assess if the conflict contributes to the larger story arcs
   - Note if any scenes lack meaningful conflict

Organize your analysis by scene, using clear scene boundaries and key identifying text. For each scene, provide:
- Scene location in the manuscript (beginning and ending text)
- Main conflict identification and classification
- Analysis of conflict dynamics and progression
- Assessment of conflict effectiveness
- Specific recommendations for strengthening scene conflicts where needed

Use specific text examples from the manuscript to support your analysis.


Analyze the manuscript to identify and evaluate conflicts at the CHAPTER level.

For each chapter or major section in the manuscript:

1. CONFLICT PROGRESSION:
   - Identify the primary chapter-level conflict
   - Analyze how the conflict evolves across scenes within the chapter
   - Track rising and falling tension patterns
   - Identify how the chapter-level conflict connects to the overall story arcs

2. CONFLICT STRUCTURE:
   - Analyze the chapter's conflict structure (introduction, complications, climax)
   - Identify how scene-level conflicts contribute to the chapter's main conflict
   - Note any parallel conflict threads running through the chapter
   - Evaluate the chapter's conflict resolution or cliff-hanger

3. CONFLICT EFFECTIVENESS:
   - Assess if the chapter conflict is substantial enough to sustain reader interest
   - Evaluate if the conflict pacing is effective
   - Identify if the conflict advances the overall plot and character development
   - Note if the chapter conflict integrates well with preceding and following chapters

Organize your analysis by chapter/section, providing:
- Chapter identification (heading or beginning text)
- Main conflict analysis and classification
- Conflict progression through the chapter
- Assessment of conflict structure and effectiveness
- Specific recommendations for improving chapter-level conflict where needed

Use specific text examples from the manuscript to support your analysis.


Analyze the manuscript to identify and evaluate conflicts at the ARC level.

Analyze the major conflict arcs that span multiple chapters or the entire manuscript:

1. CORE CONFLICT IDENTIFICATION:
   - Identify the primary conflict driving the overall narrative
   - Identify major secondary conflict arcs
   - Classify each conflict arc by type
   - Map the key characters or forces involved in each arc

2. ARC PROGRESSION:
   - For each major conflict arc, trace its development across the manuscript
   - Identify key escalation points and their manuscript locations
   - Track how the conflicts evolve, intensify, and interconnect
   - Map the climactic moments for each conflict arc
   - Analyze resolution patterns for each arc

3. CONFLICT ARCHITECTURE:
   - Analyze how the various conflict arcs interrelate
   - Identify how smaller conflicts feed into larger arcs
   - Evaluate the balance of different conflict types
   - Assess the structural integrity of the conflict arcs

4. NARRATIVE IMPACT:
   - Evaluate how effectively the conflict arcs drive the overall story
   - Assess if the conflict progression creates appropriate tension curves
   - Identify if the conflicts support the thematic elements
   - Evaluate if the resolutions are satisfying and consistent with setup

Provide a comprehensive analysis of the manuscript's conflict architecture:
- Map of major conflict arcs with their progression points
- Analysis of how conflicts interconnect and build upon each other
- Assessment of pacing and escalation effectiveness
- Specific recommendations for strengthening the conflict architecture

Use specific text examples from the manuscript to support your analysis.
`,

foreshadowing_tracker: `
You are an expert fiction editor specializing in narrative structure and foreshadowing. 
Analyze the manuscript to identify EXPLICIT foreshadowing elements - direct hints, statements, or events that point to future developments.

Focus on identifying:

1. DIRECT FORESHADOWING:
   - Clear statements or hints that explicitly point to future events
   - Prophecies, predictions, or warnings made by characters
   - Narrative statements that directly hint at what's to come
   - Character statements that foreshadow future developments

2. SETUP AND PAYOFF TRACKING:
   - For each foreshadowing element, locate where it is set up (the hint/clue)
   - Identify where/if each setup is paid off later in the manuscript
   - Note any explicit foreshadowing that remains unresolved
   - Analyze the effectiveness of the setup-payoff connections

3. TIMING AND DISTANCE ASSESSMENT:
   - Evaluate the distance between setup and payoff (immediate, mid-range, long-range)
   - Assess if the timing between setup and payoff is appropriate
   - Note if foreshadowed events occur too quickly or are delayed too long

4. NARRATIVE IMPACT:
   - Analyze how the foreshadowing enhances tension and anticipation
   - Assess if the foreshadowing is too obvious or too subtle
   - Evaluate if the payoff satisfies the expectations created by the setup


Organize your analysis chronologically, following the manuscript's progression.

For each foreshadowing element, provide:
- The exact text and location where the foreshadowing occurs
- The exact text and location where the payoff occurs (if present)
- An assessment of the effectiveness of the setup-payoff connection
- Recommendations for improvement where relevant

For unresolved foreshadowing, note:
- The setup that lacks a payoff
- Where a payoff could naturally occur
- Specific suggestions for resolving the planted clue

Use the extensive thinking space to thoroughly catalog and cross-reference all foreshadowing elements before finalizing your analysis.


Analyze the manuscript to identify IMPLICIT foreshadowing elements - subtle clues, symbolic imagery, and thematic elements that hint at future developments.

Focus on identifying:

1. SYMBOLIC FORESHADOWING:
   - Recurring symbols, motifs, or imagery that hint at future events
   - Visual descriptions that subtly indicate coming developments
   - Metaphors or similes that suggest future outcomes
   - Environmental details (weather, setting) that subtly presage events

2. DIALOGUE FORESHADOWING:
   - Casual remarks by characters that gain significance later
   - Seemingly unimportant information revealed in dialogue
   - Character observations that subtly hint at future revelations
   - Patterns in dialogue that create expectations

3. BACKGROUND DETAILS:
   - Seemingly minor world-building elements that become important
   - Casual mentions of places, objects, or people that later become significant
   - Incidental actions or habits that foreshadow character choices

4. PATTERN RECOGNITION:
   - Track recurring themes or ideas that create expectations
   - Identify narrative patterns that implicitly suggest outcomes
   - Note subtle character behaviors that foreshadow major decisions

Organize your analysis chronologically, following the manuscript's progression.

For each implicit foreshadowing element, provide:
- The exact text and location where the subtle clue appears
- The exact text and location of the corresponding payoff (if present)
- An analysis of how the subtle connection works (or doesn't)
- Recommendations for strengthening subtle connections where relevant

For potential missed opportunities, identify:
- Events that would benefit from earlier foreshadowing
- Suggestions for subtle clues that could be planted earlier
- Ways to enhance thematic coherence through implicit connections

Use the extensive thinking space to thoroughly catalog and cross-reference all implicit elements before finalizing your analysis.


Now, perform "Chekhov's Gun" analysis - the principle that significant elements introduced in a story must be used in a meaningful way. Analyze the manuscript to identify introduced elements that create expectations for later use.

Focus on identifying:

1. INTRODUCED BUT UNUSED ELEMENTS:
   - Significant objects that are prominently described but not used
   - Special abilities, skills, or knowledge mentioned but never employed
   - Locations described in detail but not utilized in the plot
   - Character traits or backgrounds emphasized but not made relevant

2. PROPERLY UTILIZED ELEMENTS:
   - Significant objects, places, or abilities that are introduced and later used
   - The setup of these elements and their subsequent payoff
   - How effectively the payoff fulfills the expectation created by the setup

3. SETUP-PAYOFF EVALUATION:
   - Whether the payoff is proportional to the emphasis placed on the setup
   - If the payoff occurs at an appropriate time after the setup
   - Whether the use of the element is satisfying given how it was introduced

4. NARRATIVE PROMISE ASSESSMENT:
   - Identify what narrative promises are made to readers through introduced elements
   - Evaluate whether these promises are fulfilled
   - Assess the impact of unfulfilled narrative promises on reader satisfaction

Organize your analysis chronologically, following the manuscript's progression.

For each Chekhov's Gun element, provide:
- The exact text and location where the element is introduced
- The exact text and location where the element is used (if it is)
- An assessment of the effectiveness of the setup-payoff
- Specific recommendations for elements that need resolution

For unfired Chekhov's Guns, suggest:
- How the introduced element could be meaningfully incorporated
- Where in the narrative the payoff could naturally occur
- How to revise the introduction if the element won't be used

Use the extensive thinking space to thoroughly catalog all introduced significant elements and their resolution status before finalizing your analysis.
`,

kdp_publishing_prep: `
You are a professional publishing consultant helping an author prepare their manuscript for Kindle Direct Publishing (KDP).

The author has provided their manuscript text and needs your expertise to generate the essential elements for their KDP submission page. 
Amazon has specific requirements and limitations for each element.

Here's what the author needs:

1. TITLE AND SUBTITLE SUGGESTIONS
 - Provide 3-5 strong title options that reflect the manuscript's content
 - For each title, suggest an optional subtitle if appropriate
 - Maximum combined length: 200 characters
 - Titles should be marketable but authentic to the content

2. BOOK DESCRIPTION
 - Create a compelling book description (~400-600 words)
 - Character limit: 4,000 characters including spaces
 - This will appear on the Amazon product page
 - Engage readers while accurately representing the content
 - Maintain appropriate tone and style for the genre
 - Do NOT include:
   * Reviews, quotes, or testimonials
   * Requests for customer reviews
   * Advertisements or promotional material
   * Time-sensitive information
   * Availability or pricing information
   * Links to other websites
   * Spoilers
 
3. DESCRIPTION WITH HTML FORMATTING
 - Provide the same description formatted with simple HTML tags
 - Use only these supported tags: <br>, <p></p>, <b></b>, <em></em>, <i></i>, <u></u>, <h4></h4>, <h5></h5>, <h6></h6>, <ol>, <ul>, <li>
 - Character count includes HTML tags (still 4,000 character limit)

4. CATEGORY RECOMMENDATIONS
 - Recommend 3 specific Amazon browse categories for discoverability
 - Include both primary and secondary category paths
 - Follow Amazon's category structure (Fiction/Genre/Subgenre or Nonfiction/Topic/Subtopic)
 - Explain why these categories fit the work

5. KEYWORD SUGGESTIONS
 - Suggest 7 keywords/phrases (50 character limit each)
 - Focus on search terms potential readers might use
 - Optimize for Amazon's search algorithm
 - Avoid:
   * Other authors' names
   * Books by other authors
   * Sales rank terms (e.g., "bestselling")
   * Promotional terms (e.g., "free")
   * Unrelated content

6. CONCISE SYNOPSIS
 - Create a brief overview (150-200 words)
 - Capture the essence without spoilers
 - For fiction: main character, conflict, stakes, setting, tone
 - For non-fiction: core thesis, approach, perspective, value to readers

7. ELEVATOR PITCH
 - Ultra-short compelling hook (1-2 sentences)
 - Captures the book's essence/selling points

8. READING AGE RECOMMENDATION
 - Suggest appropriate age range for readers
 - For children's books: 0-2, 3-5, 6-8, 9-12
 - For YA: 13-17
 - For adult books: appropriate range based on content
 - Consider themes, language, and content maturity

9. GENERAL PUBLISHING RECOMMENDATIONS
 - Specific advice for maximizing this book's success on KDP
 - KDP Select enrollment recommendation (yes/no and why)
 - Any other relevant KDP strategy suggestions

Analyze the manuscript and provide all requested elements in a clearly organized format.
`,

drunken: `
Read the manuscript I provided.

Let's pretend you are a very drunk AI, a bard at a local author/writer's pub, and 
you're working on your second bottle of really good wine. 
So you are very loose and very honest, more so than usual.

As a retired college professor of fiction writing you always were 
brutally honest about student manuscripts and book critiques.
Lay it on me, us writer's can handle it.

Use specific text examples from the manuscript to support your critique.
`,

// AI writing tools
brainstorm: ``, // see tool for prompt

outline_writer: ``, // see tool for prompt

world_writer: ``, // see tool for prompt

chapter_writer: ``, // see tool for prompt

// Non-AI tools
docx_comments: ``,
epub_converter: ``

};
