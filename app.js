const buttons = [...document.querySelectorAll('button[data-panel]')];
for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const option of buttons) {
      const selected = option === button;
      option.setAttribute('aria-pressed', String(selected));
      document.getElementById(option.dataset.panel).hidden = !selected;
    }
  });
}
