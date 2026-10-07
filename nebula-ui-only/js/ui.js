// Minimal UI interactivity only (visual state, no data/logic)
document.querySelector(".hamburger")?.addEventListener("click", () => {
  document.querySelector(".navbar").classList.toggle("open");
});

// Flip swap direction visually
document.querySelector(".swap-arrow")?.addEventListener("click", () => {
  const chips = document.querySelectorAll(".token-chip");
  if (chips.length === 2) {
    const parentA = chips[0].closest(".token-box");
    const parentB = chips[1].closest(".token-box");
    const holder = document.createElement("div");
    parentA.after(holder); parentB.before(holder);
    holder.append(parentA); parentB.after(holder); holder.replaceWith(parentA);
  }
});

// Active nav link highlight
document.querySelectorAll(".nav-links a").forEach((a) =>
  a.addEventListener("click", () => {
    document.querySelectorAll(".nav-links a").forEach((x) => x.classList.remove("active"));
    a.classList.add("active");
  })
);
