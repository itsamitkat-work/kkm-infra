Extract a structured TREE JSON from the provided PDF.

OBJECTIVE:
Convert the document into a strictly faithful hierarchical structure based ONLY on explicit visual and textual cues.

STRICT RULES:

1. DO NOT infer hierarchy from numbering, bullet styles, or formatting patterns alone.
2. CREATE sections/groups ONLY if they are explicitly defined (e.g., headings, boxes, labeled groups).
3. PRESERVE all text EXACTLY as written (no paraphrasing, no normalization).
4. ATTACH notes, annotations, or descriptions to the nearest explicitly visible parent section/group.
5. DO NOT summarize, interpret, merge, or enhance content.
6. IF hierarchy is unclear or ambiguous, KEEP items under the current parent node (do not guess structure).
7. MAINTAIN original ordering of content exactly as it appears in the document.
8. DO NOT drop any content — every visible element must be captured.
9. YOU MUST extract EVERY row/item sequentially — NO skipping allowed.
10. DO NOT summarize or sample repetitive rows — ALL rows must be included.
11. Tables spanning multiple pages MUST be treated as continuous.
12. If a sequence of codes is visible (e.g., 1.1.1 → 1.1.2 → 1.1.3), missing any code is an ERROR.
13. Ensure continuity validation — no gaps in visible item codes.
14. If extraction is incomplete, LOWER confidence and mark node_type as "unknown" instead of skipping.
15. Treat this as pure table parsing, NOT hierarchical reasoning,verify sequential integrity
16. EXTRACTION MUST BE PERFORMED IN A STRICT LEFT-TO-RIGHT, TOP-TO-BOTTOM SCAN ORDER — simulate reading the table visually row-by-row.
17. EVERY visible row in a table MUST result in exactly one node — no row merging, no row splitting unless explicitly broken in source.
18. DO NOT jump between similar patterns — extraction must not skip ahead based on pattern recognition.
19. MULTI-PAGE TABLE CONTINUITY MUST BE PRESERVED BY IGNORING PAGE BREAKS — continue row sequence seamlessly across pages.
20. REPEATED TABLE HEADERS across pages MUST BE IGNORED and MUST NOT create nodes.

OUTPUT FORMAT:

- Return ONLY valid JSON
- Root must be a single object with `"children"` array containing top-level sections
- Use the schema below consistently across all nodes

FAIL-SAFE:
If unsure about classification or hierarchy:

- Use `"node_type": "unknown"`
- Lower the confidence score
- Do NOT restructure content

---

## CONTINUITY VALIDATION (MANDATORY)

After extraction, perform a validation pass:

1. Verify that all visible codes form a continuous sequence.
2. If any expected code in sequence is missing:
   - DO NOT return partial JSON.
   - Mark the extraction as incomplete by lowering confidence globally.
3. Ensure no gaps such as:
   - 1.2.1 → 1.2.2 → 1.2.5 (INVALID)
4. Validate that all subgroup sequences are complete:
   - Example: 1.2.16.1 → 1.2.16.2 → ... → 1.2.16.11
5. If continuity cannot be guaranteed:
   - Set affected nodes to `"node_type": "unknown"`
   - Reduce confidence significantly (≤ 0.5)

---

## EXECUTION STRATEGY (ENFORCED)

1. First pass: Extract ALL rows as flat sequential items (no hierarchy).
2. Second pass: Assign hierarchy ONLY based on explicitly visible group/section labels.
3. Third pass: Validate sequence continuity before returning output.

DO NOT skip the first pass. DO NOT directly build hierarchy during initial extraction.
