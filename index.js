import { EditorView } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter,
} from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { classHighlighter } from "@lezer/highlight"

const basicSetup = (() => [
  // lineNumbers(),
  // highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  // foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  // syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
  syntaxHighlighting(classHighlighter),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  // highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
])()

const setupThemes = () => {
  const themes = document.querySelectorAll(".theme")
  let themeIndex = 0

  const activateTheme = () => {
    themes.forEach((style, i) => {
      if (themeIndex === i) style.media = "all"
      else style.media = "not all"
    })
  }

  document.querySelector("#theme-button").addEventListener("click", () => {
    themeIndex = (themeIndex + 1) % themes.length
    activateTheme()
  })

  activateTheme()
}

const setupCopyHtml = () => {
  const inline = node => {
    [...document.styleSheets]
      .filter(sheet => sheet.media.mediaText !== "not all")
      .flatMap(sheet => [...sheet.cssRules])
      .filter(rule => {
        let isMatch = false
        try {
          isMatch = node.matches(rule.selectorText)
        } finally {
          return isMatch
        }
      })
      .flatMap(rule => [...rule.style].map(property => [property, rule.style[property]]))
      .forEach(([property, value]) => (node.style[property] = value))
  }

  const inlineRecursive = node => {
    // Touching gutters messes up the styles in the editor
    if (node.classList.contains("cm-gutters")) { return }
    if (node.children.length === 0) {
      inline(node)
      return
    }
    [...node.children].forEach(child => inlineRecursive(child))
    inline(node)
  }

  const invisibleEditorWrapper = document.getElementById("invisible-editor-wrapper")
  const copyButton = document.querySelector("#copy-button")
  copyButton.addEventListener("click", async event => {
    inlineRecursive(invisibleEditorWrapper)
    await window.navigator.clipboard.writeText(invisibleEditorWrapper.innerHTML)
    setupInvisibleEditor()
    const buttonLabel = copyButton.innerText
    copyButton.innerText = "Copied"
    setInterval(() => copyButton.innerText = buttonLabel, 3000)
  })
}

const setupVisibleEditor = () => {
  window.visibleEditor = new EditorView({
    doc: 'console.log("hello")',
    extensions: [
      basicSetup,
      javascript(),
      EditorView.updateListener.of(view => {
        if (!view.docChanged) { return }
        window.invisibleEditor.dispatch({
          changes: {
            from: 0,
            to: window.invisibleEditor.state.doc.length,
            insert: view.view.state.doc.toString(),
          },
        })
      }),
    ],
    parent: document.getElementById("visible-editor"),
  })
}

const setupInvisibleEditor = () => {
  const unstyleRecursive = node => {
    if (node.classList.contains("styled")) { return }
    if (node.children.length === 0) {
      node.style = ""
      return
    }
    [...node.children].forEach(child => unstyleRecursive(child))
    node.style = ""
  }

  unstyleRecursive(document.getElementById("invisible-editor-wrapper"))
  if (window.invisibleEditor) { window.invisibleEditor.destroy() }
  window.invisibleEditor = new EditorView({
    doc: window.visibleEditor.state.doc.toString(),
    extensions: [basicSetup, javascript()],
    parent: document.getElementById("invisible-editor"),
  })
}

document.addEventListener("DOMContentLoaded", () => {
  setupThemes()
  setupCopyHtml()
  setupVisibleEditor()
  setupInvisibleEditor()
})
