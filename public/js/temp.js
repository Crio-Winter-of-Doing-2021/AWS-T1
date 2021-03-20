
function copy_to_clipboard(text_spn) {
    var copyText = document.getElementById(text_spn);
    var textArea = document.createElement("textarea");
    textArea.value = copyText.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
}