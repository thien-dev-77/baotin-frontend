"use client";

import { useEffect, useRef, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Bold,
  Essentials,
  Italic,
  Paragraph,
  Undo,
  Heading,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  Indent,
  IndentBlock,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Nhập nội dung...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const [isReady, setIsReady] = useState(false);
  const editorRef = useRef<ClassicEditor | null>(null);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div
        className="bt-input !h-auto py-3"
        style={{ minHeight }}
      >
        <p className="text-sm text-text-secondary">Đang tải trình soạn thảo...</p>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: "GPL",
          toolbar: {
            items: [
              "undo",
              "redo",
              "|",
              "heading",
              "|",
              "bold",
              "italic",
              "link",
              "|",
              "bulletedList",
              "numberedList",
              "|",
              "outdent",
              "indent",
              "|",
              "blockQuote",
              "insertTable",
            ],
          },
          plugins: [
            Bold,
            Essentials,
            Italic,
            Paragraph,
            Undo,
            Heading,
            Link,
            List,
            BlockQuote,
            Table,
            TableToolbar,
            Indent,
            IndentBlock,
          ],
          heading: {
            options: [
              { model: "paragraph", title: "Đoạn văn", class: "ck-heading_paragraph" },
              { model: "heading2", view: "h2", title: "Tiêu đề 2", class: "ck-heading_heading2" },
              { model: "heading3", view: "h3", title: "Tiêu đề 3", class: "ck-heading_heading3" },
            ],
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          placeholder,
          link: {
            addTargetToExternalLinks: true,
            defaultProtocol: "https://",
          },
        }}
        data={value}
        disabled={disabled}
        onReady={(editor) => {
          editorRef.current = editor;
          // Set minimum height for editor content
          const editableElement = editor.ui.view.editable.element;
          if (editableElement) {
            editableElement.style.minHeight = minHeight;
          }
        }}
        onChange={(_, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
      <style jsx global>{`
        .rich-text-editor .ck-editor__editable {
          min-height: ${minHeight};
        }
        .rich-text-editor .ck-content {
          font-family: inherit;
        }
        .rich-text-editor .ck-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .rich-text-editor .ck-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .rich-text-editor .ck-content p {
          margin-bottom: 0.75em;
        }
        .rich-text-editor .ck-content ul,
        .rich-text-editor .ck-content ol {
          margin-left: 1.5em;
          margin-bottom: 0.75em;
        }
        .rich-text-editor .ck-content blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
        }
        .rich-text-editor .ck-content table {
          border-collapse: collapse;
          margin: 1em 0;
        }
        .rich-text-editor .ck-content table td,
        .rich-text-editor .ck-content table th {
          border: 1px solid #ddd;
          padding: 0.5em;
        }
      `}</style>
    </div>
  );
}
