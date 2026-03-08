/**
 * AI Studio Chat Extractor
 *
 * Usage: Open an AI Studio chat session in Chrome, open DevTools (F12),
 * paste this entire script into the Console tab, and press Enter.
 *
 * It will:
 *   1. Click through each turn to force virtual scroll rendering
 *   2. Extract all user/model messages
 *   3. Copy the markdown to clipboard
 *   4. Download as a .md file
 */
(async () => {
  const SCROLL_WAIT = 800;
  const title = document.querySelector('h1')?.textContent?.trim() || 'AI Studio Chat';
  const slug = title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/-+$/, '');

  console.log(`%c[Extractor] Starting: "${title}"`, 'color: cyan; font-weight: bold');

  const toolbar = document.querySelector('[role="toolbar"]');
  const navButtons = toolbar ? [...toolbar.querySelectorAll('button')] : [];
  console.log(`[Extractor] Found ${navButtons.length} user turns in navigation`);

  const collected = new Map();
  let order = 0;

  function extractVisibleTurns() {
    const turns = document.querySelectorAll('.chat-turn-container');
    for (const turn of turns) {
      const isUser = turn.classList.contains('user');
      const isModel = turn.classList.contains('model');
      if (!isUser && !isModel) continue;

      const role = isUser ? 'User' : 'Model';
      const label = turn.querySelector('.author-label');
      const labelText = label?.textContent?.trim() || '';
      const timeMatch = labelText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : '';

      const textChunk = turn.querySelector('.text-chunk');
      if (!textChunk) continue;

      let content = textChunk.innerText?.trim() || '';
      if (!content || content.length < 5) continue;

      // Skip model "Thoughts" / thinking sections
      if (isModel && content.length < 200 &&
          (content.startsWith('Thoughts') ||
           content.includes('Expand to view model thoughts'))) {
        continue;
      }

      // Clean UI artifacts
      content = content
        .replace(/^(edit|Rerun this turn|Open options|more_vert)\s*/gm, '')
        .replace(/(thumb_up|thumb_down|edit|more_vert)\s*$/gm, '')
        .replace(/\n(Good response|Bad response)\s*$/gm, '')
        .trim();

      if (!content || content.length < 5) continue;

      const key = `${role}-${content.substring(0, 80)}`;
      if (!collected.has(key)) {
        collected.set(key, { role, time, content, order: order++ });
      }
    }
  }

  // --- Scroll & click through turns to render all virtual-scrolled content ---
  const sc = document.querySelector('ms-autoscroll-container') ||
             document.querySelector('.hide-scrollbar');

  // Reset to top first (critical for virtual scroll)
  if (sc) {
    sc.scrollTop = 0;
    await new Promise(r => setTimeout(r, SCROLL_WAIT));
  }

  if (navButtons.length > 0) {
    for (let i = 0; i < navButtons.length; i++) {
      navButtons[i].click();
      await new Promise(r => setTimeout(r, SCROLL_WAIT));
      extractVisibleTurns();

      // Scroll down to catch the model response below the user turn
      if (sc) {
        const start = sc.scrollTop;
        for (let s = 1; s <= 5; s++) {
          sc.scrollTop = start + (sc.clientHeight * s);
          await new Promise(r => setTimeout(r, 350));
          extractVisibleTurns();
        }
      }
      console.log(`[Extractor] Turn ${i + 1}/${navButtons.length} — ${collected.size} entries`);
    }
  } else {
    // Fallback: no toolbar, scroll the whole chat
    if (sc) {
      sc.scrollTop = 0;
      await new Promise(r => setTimeout(r, SCROLL_WAIT));
      const total = sc.scrollHeight;
      const step = sc.clientHeight * 0.7;
      for (let pos = 0; pos <= total; pos += step) {
        sc.scrollTop = pos;
        await new Promise(r => setTimeout(r, 400));
        extractVisibleTurns();
      }
    }
  }

  // --- Build markdown ---
  const turns = [...collected.values()].sort((a, b) => a.order - b.order);

  let md = `# ${title}\n\n`;
  md += `> Extracted from Google AI Studio\n`;
  md += `> Date: ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  for (const turn of turns) {
    const timeStr = turn.time ? ` (${turn.time})` : '';
    md += `## ${turn.role}${timeStr}\n\n`;
    md += `${turn.content}\n\n`;
    md += `---\n\n`;
  }

  // --- Copy to clipboard ---
  try {
    await navigator.clipboard.writeText(md);
    console.log('%c[Extractor] Copied to clipboard!', 'color: lime; font-weight: bold');
  } catch (e) {
    console.warn('[Extractor] Clipboard failed (click the page first, then retry):', e.message);
  }

  // --- Download as .md file ---
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`%c[Extractor] Done! ${turns.length} turns → ${slug}.md`, 'color: lime; font-weight: bold');
  console.log('[Extractor] Also copied to clipboard.');
})();
