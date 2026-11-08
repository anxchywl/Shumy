window.Sketch = (() => {
  const colors = ['#191f22', '#d84045', '#eaa829', '#30935d', '#3973be', '#8a55a2', '#fffdf4'];

  function board(canvas, events) {
    const context = canvas.getContext('2d');
    let id = null;

    function segment([color, width, x1, y1, x2, y2]) {
      context.strokeStyle = context.fillStyle = colors[color];
      context.lineWidth = width;
      context.lineCap = 'round';
      context.beginPath();
      if (x1 === x2 && y1 === y2) {
        context.arc(x1, y1, width / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      }
    }

    const clear = () => context.clearRect(0, 0, canvas.width, canvas.height);
    events.addEventListener('ink', event => {
      const ink = JSON.parse(event.data);
      if (id !== ink.id) return;
      if (ink.reset) clear();
      ink.segments.forEach(segment);
    });

    return {
      select(turnId) {
        if (turnId === id) return;
        id = turnId;
        clear();
      },
      segment,
    };
  }

  function clock(element) {
    let end = 0;
    function tick() {
      const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
      const time = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (element.textContent !== time) element.textContent = time;
      element.classList.toggle('urgent', left > 0 && left <= 10);
    }
    setInterval(tick, 200);
    return remaining => {
      end = performance.now() + remaining;
      tick();
    };
  }

  return { colors, board, clock };
})();
