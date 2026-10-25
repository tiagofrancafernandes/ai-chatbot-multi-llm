import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdownParser = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
});

/**
 * Custom renderer rule for external links to open in a new tab safely.
 */
const defaultRender =
    markdownParser.renderer.rules.link_open ||
    function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
    };

markdownParser.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return defaultRender(tokens, idx, options, env, self);
};

/**
 * Parses markdown text to sanitized HTML.
 *
 * @param content - Raw markdown or plain text string
 * @returns Sanitized HTML string safe for v-html rendering
 */
export function renderMarkdown(content: string | undefined | null): string {
    if (!content) {
        return '';
    }

    const rawHtml = markdownParser.render(content);

    return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel'],
    });
}
