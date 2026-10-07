// Nebula starfield — pure visual effect, no app logic
(function () {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let stars = [], W, H;

  function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    stars = Array.from({ length: Math.min(220, (W * H) / 9000) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      s: Math.random() * 0.25 + 0.05,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const st of stars) {
      st.y += st.s;
      if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(st.tw + t / 900));
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
