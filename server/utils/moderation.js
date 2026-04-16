// Moderation Utilities

const BLACKLIST_CATEGORIES = {
    explicit: ['nsfw', 'porn', 'adult', 'eroti', 'xxx', 'sexual', 'sex', 'fetish', 'dating', 'hookup', 'escort', 'nude', 'naked', 'brothel', 'prostitut', 'onlyfans'],
    violence: ['gore', 'blood', 'kill', 'suicid', 'self-harm', 'weapon', 'explosiv', 'gun', 'murder', 'terror', 'bomb', 'shoot', 'assassin', 'massacre', 'tortur', 'mutilat', 'behead', 'snuff', 'knife', 'blade', 'rifle', 'sniper'],
    hate: ['racist', 'nazi', 'slur', 'hate', 'supremacy', 'extremist', 'discriminat', 'bigot', 'homophob', 'transphob', 'xenophob', 'antisemit', 'kkk', 'jihad'],
    substances: ['drug', 'cocaine', 'meth', 'ecstasy', 'dealer', 'heroin', 'fentanyl', 'opioid', 'crack', 'narcotic', 'acid', 'lsd', 'shroom'],
    gambling: ['casino', 'betting', 'lottery', 'ponzi', 'crypto-scam', 'gamble', 'blackjack', 'roulette', 'poker'],
    scam: ['scam', 'fraud', 'phishing', 'malware', 'hack', 'steal', 'botnet', 'ddos', 'dox', 'swatting', 'pyramid scheme']
};

/**
 * Checks if a text string contains any blacklisted terms.
 * @param {string} text
 * @returns {boolean} True if safe, False if flagged.
 */
const isSafe = (text) => {
    if (!text) return true;
    const lowerText = text.toLowerCase();

    // Check against all categories
    for (const category in BLACKLIST_CATEGORIES) {
        const keywords = BLACKLIST_CATEGORIES[category];
        for (const keyword of keywords) {
            // Simple inclusion check.
            // Better: Regex for word boundaries, but simple includes covers 'crypto-scam' etc.
            if (lowerText.includes(keyword)) {
                return false;
            }
        }
    }

    // Specific check for 'weed' context could go here, but prompt says "Illegal Substances: drugs, weed..."
    if (lowerText.includes('weed') && !lowerText.includes('medical')) {
        return false;
    }

    return true;
};

/**
 * Validates an array of interests.
 * @param {string[]} interests
 * @returns { object } { valid: boolean, flagged: string[] }
 */
const validateInterests = (interests) => {
    if (!Array.isArray(interests)) return { valid: true, flagged: [] };

    const flagged = [];
    for (const interest of interests) {
        if (!isSafe(interest)) {
            flagged.push(interest);
        }
    }

    return {
        valid: flagged.length === 0,
        flagged
    };
};

module.exports = {
    validateInterests,
    isSafe
};
