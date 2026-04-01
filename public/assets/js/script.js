const body = document.body;
const menuToggle = document.querySelector("[data-menu-toggle]");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    body.classList.toggle("menu-open");
  });
}

const slider = document.querySelector("[data-slider]");

if (slider) {
  const track = slider.querySelector("[data-slider-track]");
  const slides = Array.from(track.children);
  const prev = slider.querySelector("[data-prev]");
  const next = slider.querySelector("[data-next]");
  let currentIndex = 1;
  let timerId;

  const render = () => {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  };

  const goTo = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    render();
  };

  const startAutoPlay = () => {
    timerId = window.setInterval(() => {
      goTo(currentIndex + 1);
    }, 4500);
  };

  const stopAutoPlay = () => {
    window.clearInterval(timerId);
  };

  prev?.addEventListener("click", () => {
    goTo(currentIndex - 1);
  });

  next?.addEventListener("click", () => {
    goTo(currentIndex + 1);
  });

  slider.addEventListener("mouseenter", stopAutoPlay);
  slider.addEventListener("mouseleave", startAutoPlay);

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      goTo(currentIndex - 1);
    }

    if (event.key === "ArrowRight") {
      goTo(currentIndex + 1);
    }
  });

  render();
  startAutoPlay();
}
