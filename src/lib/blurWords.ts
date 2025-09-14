import offensiveWords from '$lib/data/charts/bad_words.json';
const sfwRegex = new RegExp(`\\b(${offensiveWords.join('|')})\\b`, 'gi');

interface BlurWordsOptions {
  ignoreClasses?: string[];
}

/**
 * A Svelte action that traverses an element's text nodes and wraps
 * specific words in a span with a blurring class.
 * It uses a MutationObserver to re-apply the blur on dynamic content changes.
 */
export function blurWords(node: HTMLElement, options: BlurWordsOptions = {}) {
  let observer: MutationObserver;

  const applyBlur = () => {
    // Only run if a cookie indicates SFW mode is on
    if (!document.cookie.includes('sfw_mode=true')) {
      // Optional: Could add logic here to un-blur if the cookie is removed.
      return;
    }

    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      // Filter out nodes that are already blurred or inside scripts/styles/SVGs/ignored classes
      (n) => {
        const ignoreSelectors = ['script', 'style', 'svg', '.sfw-blur'];
        
        // Add custom ignore classes if provided
        if (options.ignoreClasses) {
          ignoreSelectors.push(...options.ignoreClasses.map(cls => `.${cls}`));
        }
        
        if (n.parentElement?.closest(ignoreSelectors.join(', '))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent || '';
      if (sfwRegex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(sfwRegex, (match) => `<span class="sfw-blur">${match}</span>`);
        textNode.parentNode?.replaceChild(span, textNode);
      }
    }
  };

  // Initial application
  applyBlur();

  // Set up an observer to handle dynamic content changes within the element
  observer = new MutationObserver(applyBlur);
  observer.observe(node, {
    childList: true,
    subtree: true,
    characterData: true
  });

  return {
    // This destroy function is called when the element is removed from the DOM
    destroy() {
      observer.disconnect();
    }
  };
}