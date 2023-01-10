import 'github-markdown-css'
import { render } from 'preact'
import { onChanged, getUserConfig } from '../config'
import { NewMessageObserver } from './new_message_observer'
import ChatGPTCard from './ChatGPTCard'
import './styles.scss'

import { BUTTON, SUGGESTIONS_BOX, REWRITE_DIALOG,
  NEW_MESSAGE_INPUT, ERROR_CLASS_NAME,
  URL_PATTERN, REPLAY_MESSAGE_INPUT } from './consts'

enable = true;
observer_on_new_messages = []; // list of NewMessageObserver

function createBaseElement(elementType = "div", className) {
  const container = document.createElement(elementType);
  if (className !== "no") {
    container.className = className;
  }
  return container;
}

function getLastTextPosition(textElement) {
  if (textElement.childElementCount === 0) {
    textElement.innerHTML = `<div>${textElement.innerHTML}</div>`;
  }
  return textElement.lastChild.getBoundingClientRect();
}

function getChatGPTSvgLogo() {
    return '<?xml version="1.0" standalone="no"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd"> <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="24.000000pt" height="24.000000pt" viewBox="0 0 24.000000 24.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,24.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M63 220 c-34 -21 -63 -66 -63 -100 0 -54 65 -120 118 -120 57 0 122 64 122 120 0 56 -65 120 -122 120 -13 0 -37 -9 -55 -20z m96 -39 c0 -11 -4 -9 -11 7 -6 12 -15 22 -20 22 -4 0 -8 5 -8 12 0 6 9 3 20 -7 11 -10 20 -25 19 -34z m-49 -1 c11 -7 6 -8 -17 -4 -20 4 -39 2 -48 -6 -14 -12 -22 0 -8 13 10 10 56 8 73 -3z m79 -64 l-22 -21 17 25 c9 13 17 34 17 45 1 16 3 16 6 -4 3 -16 -3 -31 -18 -45z m-122 16 c-9 -9 -20 -29 -26 -42 -8 -21 -10 -22 -10 -6 -1 11 9 30 21 43 25 27 39 32 15 5z m69 -3 c10 -17 -13 -36 -27 -22 -12 12 -4 33 11 33 5 0 12 -5 16 -11z m-46 -64 c0 -8 10 -21 23 -30 19 -15 20 -16 3 -13 -11 2 -26 18 -33 36 -8 19 -9 31 -3 27 5 -3 10 -12 10 -20z m120 6 c0 -15 -30 -22 -58 -14 -25 7 -25 8 13 14 22 3 41 7 43 8 1 0 2 -3 2 -8z"/> </g> </svg>';
}

function setChatGPTButton(container, textDialog) {
  const { left, bottom } = textDialog.getBoundingClientRect();
  container.style.left = `${left + 20}px`;
  container.style.bottom = `${window.innerHeight - bottom + 5}px`;
}


function setContainerPosUnderText(container, textDialog) {
  const pos = getLastTextPosition(textDialog);
  container.style.top = `${Math.ceil(pos.top + pos.height)}px`;
  container.style.left = `${pos.left}px`;
  container.style.width = "330px";
  container.style.position = "absolute";
}


function highlightText(textElement) {
  textElement.focus();
  const selection = window.getSelection();
  selection.selectAllChildren(textElement);
}

function isWithinBounds(XMouse, YMouse, bounds) {
  const { x: xMin, y: yMin, right: XMax, bottom: YMax } = bounds;
  return XMouse >= xMin && XMouse <= XMax && YMouse >= yMin && YMouse <= YMax;
}

function listenToMouseEvent(event) {
  const suggestionsBox = document.getElementsByClassName(SUGGESTIONS_BOX);
  if (suggestionsBox.length==0) return;

  const { clientX: XMouse, clientY: YMouse } = event;
  if (isWithinBounds(XMouse, YMouse, suggestionsBox[0].getBoundingClientRect())) return;

  const chatButton = document.getElementsByClassName(BUTTON);
  if (chatButton.length==0) return;
  if (isWithinBounds(XMouse, YMouse, chatButton[0].getBoundingClientRect())) return;

  suggestionsBox[0].remove();
}

function changed(changes, area) {
  enable = changes.on.newValue === 1;
}


function removeChatGPTButton() {
  const chatGPTButtonElements = document.getElementsByClassName(BUTTON);
  if (chatGPTButtonElements.length === 0 || document.activeElement === chatGPTButtonElements[0]) return;
  chatGPTButtonElements[0].remove();
}

function removeChatGPTSuggestionBox() {
  const chatGPTSuggestionBoxElements = document.getElementsByClassName(SUGGESTIONS_BOX);
  if (chatGPTSuggestionBoxElements.length === 0) return;
  chatGPTSuggestionBoxElements[0].remove();
}

function createButtonElement() {
  const container = createBaseElement('button', BUTTON);
  container.innerHTML = getChatGPTSvgLogo();
  return container;
}

function setRewriteDialogOnClick(container, bodyInput) {
  container.onclick = () => {
    const rewriteDialogElements = document.getElementsByClassName(REWRITE_DIALOG);
    if (rewriteDialogElements.length > 0) {
      if (rewriteDialogElements[0].childNodes[0].id != ERROR_CLASS_NAME) {
        bodyInput.innerHTML = rewriteDialogElements[0].innerHTML;
      }
      removeChatGPTSuggestionBox();
    }
  }
}

function renderChatCard(suggestionsBox, bodyInput) {
  const rewriteDialog = createBaseElement('div', REWRITE_DIALOG);
  suggestionsBox.appendChild(rewriteDialog);
  render(
    <ChatGPTCard question={"complete my email. write only the email: \n" + bodyInput.innerHTML}/>,
    rewriteDialog,
  );
}

function createSuggestionBoxElement(bodyInput) {
  const suggestionsBox = document.createElement('div');
  suggestionsBox.className = SUGGESTIONS_BOX;
  setContainerPosUnderText(suggestionsBox, bodyInput);
  highlightText(bodyInput);
  return suggestionsBox;
}


function setChatGPTButtonOnClick(container, bodyInput) {
  container.onclick = async () => {
    removeChatGPTSuggestionBox();
    const suggestionsBox = createSuggestionBoxElement(bodyInput);
    setRewriteDialogOnClick(suggestionsBox, bodyInput);
    renderChatCard(suggestionsBox, bodyInput);
    document.body.appendChild(suggestionsBox);
  };
}

function createChatGPTButton(bodyInput) {
  const container = createButtonElement();
  setChatGPTButtonOnClick(container, bodyInput);


  const father = createBaseElement('div', "no");
  father.setAttribute("style", "position: absolute; z-index: 20000000000;");
  const child = createBaseElement('div', "no");
  child.setAttribute("style", "display: flex; column-gap: 4px;");
  father.appendChild(child);
  child.appendChild(container);
  setChatGPTButton(father, bodyInput);
  document.body.appendChild(father);
}

function handleChatGPTButton(bodyInput) {
  const elementExists = document.getElementsByClassName(BUTTON);
  if (elementExists.length === 0 && document.activeElement === bodyInput) {
    createChatGPTButton(bodyInput);
  } else if (elementExists.length > 0 && document.activeElement !== bodyInput) {
    removeChatGPTButton();
  }
}

function isInNodeList(node, nodeList) {
  for (let i = 0; i < nodeList.length; i++) {
    if (nodeList[i] === node) return true;
  }
  return false;
}

function handleMutations(mutations) {
  mutations.forEach(async function(mutation) {
    const bodyInput = document.querySelectorAll(NEW_MESSAGE_INPUT, REPLAY_MESSAGE_INPUT); //:Node[]

    if (!enable) {
      removeChatGPTButton();
    } else {
      if (URL_PATTERN.test(window.location.href)) {
        if (observer_on_new_messages.length < bodyInput.length) {
          observer_on_new_messages.push(new NewMessageObserver(handleChatGPTButton, bodyInput[bodyInput.length-1]));
        }
      }
    }

    if (bodyInput.length < observer_on_new_messages.length) {
      for (let i=0; i<observer_on_new_messages.length; i++) {
        if (!isInNodeList(observer_on_new_messages[i].getTarget(), bodyInput)) {
          observer_on_new_messages[i].disconnect();
          observer_on_new_messages.splice(i, 1);
          removeChatGPTButton();
          removeChatGPTSuggestionBox();
          break;
        }
      }
    }
  });
}

async function run() {
  const div = document.body;
  const observer = new MutationObserver(handleMutations);
  observer.observe(div, {
    attributes: true,
    childList: true,
    characterData: true
  });
  document.addEventListener("click", listenToMouseEvent);
  onChanged(changed);
}

async function getConfigFirst() {
  enable = (await getUserConfig()).on==1;
  run();
}

getConfigFirst();
