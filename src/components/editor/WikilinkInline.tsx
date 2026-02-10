import { createReactInlineContentSpec } from "@blocknote/react";
import { FileText, FilePlus } from "lucide-react";

// Custom wikilink inline content component
export const Wikilink = createReactInlineContentSpec(
  {
    type: "wikilink",
    propSchema: {
      title: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { title } = props.inlineContent.props;
      
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors font-medium text-sm"
          data-wikilink={title}
          contentEditable={false}
        >
          <FileText className="h-3 w-3" />
          <span>{title}</span>
        </span>
      );
    },
  }
);

// Wikilink schema for BlockNote
export const wikilinkInlineContentSpec = {
  wikilink: Wikilink,
};
