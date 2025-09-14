// utils/contentFilter.js
class ContentFilter {
  constructor() {
    this.profanityList = [
      "fuck", "shit", "bitch", "asshole", "damn", "hell", 
      "crap", "piss", "bastard", "slut", "whore", "idiot",
      "stupid", "dumb", "moron", "retard", "gay", "faggot"
    ];
  }

  // Levenshtein distance function
  levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  // Similarity percentage (0-100)
  similarity(a, b) {
    const dist = this.levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return ((maxLen - dist) / maxLen) * 100;
  }

  // Check if text contains trigger words with fuzzy matching
  containsTriggerWords(text, triggerWords, threshold = 80) {
    if (!triggerWords || triggerWords.length === 0) return { hasMatch: false, matches: [] };
    
    const words = text.toLowerCase().split(/\s+/);
    const matches = [];

    for (const word of words) {
      // Remove punctuation from word
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length < 2) continue;

      for (const trigger of triggerWords) {
        const sim = this.similarity(cleanWord, trigger.toLowerCase());
        if (sim >= threshold) {
          matches.push({
            original: word,
            trigger: trigger,
            similarity: sim
          });
        }
      }
    }

    return {
      hasMatch: matches.length > 0,
      matches: matches
    };
  }

  // Censor profanity with fuzzy matching
  censorProfanity(text, threshold = 80) {
    const words = text.split(/\s+/);
    return words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      for (let bad of this.profanityList) {
        if (this.similarity(cleanWord, bad) > threshold) {
          return "*".repeat(word.length);
        }
      }
      return word;
    }).join(" ");
  }

  // Main filtering function
  filterContent(content, userPreferences) {
    const { trigger_words = [], profanity_filter = true } = userPreferences;
    
    let filteredContent = content;
    const filterReasons = [];

    // Apply profanity filter
    if (profanity_filter) {
      const originalContent = filteredContent;
      filteredContent = this.censorProfanity(filteredContent);
      if (originalContent !== filteredContent) {
        filterReasons.push("Profanity filtered");
      }
    }

    // Check trigger words
    const triggerCheck = this.containsTriggerWords(content, trigger_words);
    
    return {
      shouldBlock: triggerCheck.hasMatch,
      filteredContent: filteredContent,
      reasons: filterReasons,
      triggerMatches: triggerCheck.matches,
      confidence: triggerCheck.matches.length > 0 ? 
        Math.max(...triggerCheck.matches.map(m => m.similarity)) : 0
    };
  }
}

export default ContentFilter;
