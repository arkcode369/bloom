import { Extension, InputRule } from "@tiptap/core";

interface Replacement {
  find: RegExp;
  replace: string;
}

const replacements: Replacement[] = [
  // Arrows
  { find: /->$/, replace: "→" },
  { find: /<-$/, replace: "←" },
  { find: /=>$/, replace: "⇒" },
  { find: /<==$/, replace: "⇐" },
  { find: /<>$/, replace: "↔" },
  { find: /<=>$/, replace: "⇔" },

  // Math
  { find: /!=$/, replace: "≠" },
  { find: />=$/, replace: "≥" },
  { find: /<=$/, replace: "≤" },
  { find: /\+-$/, replace: "±" },
  { find: /~=$/, replace: "≈" },
  { find: /~\/$/, replace: "√" },
  { find: /\binfinity\b$/, replace: "∞" },

  // Fractions
  { find: /1\/2$/, replace: "½" },
  { find: /1\/4$/, replace: "¼" },
  { find: /3\/4$/, replace: "¾" },
  { find: /1\/3$/, replace: "⅓" },
  { find: /2\/3$/, replace: "⅔" },

  // Typography
  { find: /\.\.\.$/, replace: "…" },
  { find: /---$/, replace: "—" },
  { find: /\(c\)$/, replace: "©" },
  { find: /\(r\)$/, replace: "®" },
  { find: /\(tm\)$/, replace: "™" },
  { find: /\(p\)$/, replace: "§" },
];

export const TextReplacementExtension = Extension.create({
  name: "textReplacement",

  addInputRules() {
    return replacements.map(
      ({ find, replace }) =>
        new InputRule({
          find,
          handler: ({ state, range }) => {
            state.tr.replaceWith(range.from, range.to, state.schema.text(replace));
          },
        })
    );
  },
});
