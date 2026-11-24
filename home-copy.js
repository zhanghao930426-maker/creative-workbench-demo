const copy = [
  ['.welcome h1', '欢迎回来，造梦师'],
  ['.welcome p', '将心之所向的无边幻境，化作触手可及的眼前之物'],
  ['.start-copy h2', '执笔绘梦，光影成境。'],
  ['.start-copy p', '起笔是无声的故事，落笔是万千的奇观']
];

const app = document.getElementById('app');
function applyHomeCopy() {
  const home = app.querySelector('.page-home');
  if (!home) return;
  for (const [selector, text] of copy) {
    for (const element of home.querySelectorAll(selector)) {
      if (element.textContent !== text) element.textContent = text;
    }
  }
}

new MutationObserver(applyHomeCopy).observe(app, {childList: true, subtree: true});
applyHomeCopy();
