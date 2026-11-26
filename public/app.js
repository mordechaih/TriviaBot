// ── Host deck: a hand of cards. The current card is on top, the next two wait behind it. Moving on throws the
// top card off to the side and brings the one behind it forward; flipping turns the card over. ──

const host = document.querySelector(".host");
if (host) initDeck(host);

function initDeck(host) {
  const gameId = host.dataset.game;
  const deck = host.querySelector(".deck");
  const tabs = [...host.querySelectorAll(".tabs a")];
  const button = (go) => host.querySelector(`[data-go="${go}"]`);
  const cards = () => [...deck.querySelectorAll(":scope > .card")];
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let index = Math.max(0, cards().findIndex((c) => `#${c.id}` === location.hash));

  // Where a card rests in each place. The thrown card rises toward you (translateZ) and turns a little on
  // both axes as it goes, so it always passes in front of the card coming forward and never cuts through it.
  const PLACE = {
    current: "translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg)",
    b1: "translate3d(0.45rem, 0.6rem, -28px) rotateZ(1.3deg) rotateY(0deg)",
    b2: "translate3d(-0.35rem, 1rem, -56px) rotateZ(-1.7deg) rotateY(0deg)",
    b3: "translate3d(0, 1.4rem, -84px) rotateZ(0deg) rotateY(0deg)",
    thrown: "translate3d(-125%, -0.75rem, 90px) rotateZ(-11deg) rotateY(-14deg)",
  };
  const MOVE = { duration: 420, easing: "cubic-bezier(0.25, 0.75, 0.2, 1)" };
  const ROLES = ["is-current", "is-b1", "is-b2"];

  function placeOf(i, top) {
    if (i === top) return "current";
    if (i === top + 1) return "b1";
    if (i === top + 2) return "b2";
    return null;
  }

  function setRoles(top) {
    cards().forEach((c, i) => {
      c.classList.remove(...ROLES);
      const place = placeOf(i, top);
      if (place) c.classList.add(place === "current" ? "is-current" : `is-${place}`);
    });
  }

  // Clean-up owed by moves still in flight. A quick second tap runs them at once and drops the animations, so
  // every card snaps to where its class says it rests before the next move starts.
  const owed = new Set();
  function settle() {
    for (const done of [...owed]) done();
    for (const a of deck.getAnimations({ subtree: true })) a.cancel();
  }

  function animate(el, from, to, after) {
    if (still.matches) return after?.();
    const anim = el.animate({ transform: [from, to] }, MOVE);
    const done = () => {
      if (!owed.delete(done)) return;
      after?.();
    };
    owed.add(done);
    anim.onfinish = done;
  }

  function show(target, { from = null } = {}) {
    settle();
    const list = cards();
    target = Math.min(Math.max(target, 0), list.length - 1);
    const old = index;
    const top = list[old];
    if (from) top.style.transform = "";

    if (target !== old) {
      const forward = target > old;
      setRoles(target);
      if (forward) {
        // Throw the top card off to the left; it carries on from wherever a drag left it.
        top.classList.add("is-leaving");
        animate(top, from ?? PLACE.current, PLACE.thrown, () => top.classList.remove("is-leaving", "is-flipped"));
      } else {
        // Bring the earlier card back in over the top, from the side it was thrown to.
        const back = list[target];
        animate(back, PLACE.thrown, PLACE.current);
      }
      list.forEach((c, i) => {
        if (i === old && forward) return;
        if (i === target && !forward) return;
        const was = placeOf(i, old);
        const now = placeOf(i, target);
        if (now) {
          const start = was ? (i === old && from ? from : PLACE[was]) : PLACE.b3;
          animate(c, start, PLACE[now]);
          if (now !== "current") c.classList.remove("is-flipped");
        } else if (was) {
          c.classList.add("is-retiring");
          animate(c, PLACE[was], PLACE.b3, () => c.classList.remove("is-retiring", "is-flipped"));
        }
      });
      if (still.matches) list[target].animate({ opacity: [0, 1] }, { duration: 160, easing: "ease-out" });
    } else {
      setRoles(target);
      if (from) animate(top, from, PLACE.current);
    }

    index = target;
    const card = list[index];
    history.replaceState(null, "", `#${card.id}`);
    const round = card.id.split("-")[1];
    for (const t of tabs) t.setAttribute("aria-current", String(t.dataset.round === round));
    host.style.setProperty("--deck-ink", getComputedStyle(card).getPropertyValue("--ink"));
    button("flip").disabled = card.classList.contains("title-card");
    button("flip").setAttribute("aria-pressed", String(card.classList.contains("is-flipped")));
    button("prev").disabled = index === 0;
    button("next").disabled = index === list.length - 1;
    host.classList.toggle("at-end", index === list.length - 1);
    markScrolling(card);
    sendScreen({ item: card.dataset.item });
  }

  // Turn the card over. A tap or the Flip button turns it like a page (around its vertical axis); a vertical
  // swipe turns it end over end, in the direction of the swipe.
  function flip(axis = "Y", dir = 1) {
    const card = cards()[index];
    if (!card || card.classList.contains("title-card")) return;
    const flipped = card.classList.toggle("is-flipped");
    button("flip").setAttribute("aria-pressed", String(flipped));
    if (still.matches) return;
    const turn = (deg) => `rotate${axis}(${deg}deg)`;
    const [front, back] = card.querySelectorAll(":scope > .face");
    const timing = { duration: 460, easing: "cubic-bezier(0.3, 0.7, 0.2, 1)" };
    front.animate({ transform: flipped ? [turn(0), turn(180 * dir)] : [turn(-180 * dir), turn(0)] }, timing);
    back.animate({ transform: flipped ? [turn(-180 * dir), turn(0)] : [turn(0), turn(180 * dir)] }, timing);
    // Lift the card a touch while it turns, so its corners clear the cards behind it.
    card.animate({ transform: [PLACE.current, "translate3d(0, 0, 40px) rotateZ(0deg) rotateY(0deg)", PLACE.current] }, timing);
  }

  function markScrolling(card) {
    for (const face of card.querySelectorAll(":scope > .face")) {
      face.classList.toggle("scrolls", face.scrollHeight > face.clientHeight + 1);
    }
  }

  async function sendScreen(state) {
    try {
      const res = await fetch(`/games/${gameId}/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const { item, reveal } = await res.json();
      const btn = deck.querySelector(`[data-reveal="${item}"]`);
      if (btn) setRevealed(btn, reveal);
    } catch {
      // The screen is optional; the host view works without it.
    }
  }

  function setRevealed(btn, on) {
    btn.setAttribute("aria-pressed", String(on));
    btn.lastChild.textContent = on ? " Hide on screen" : " Reveal on screen";
  }

  button("prev").addEventListener("click", () => show(index - 1));
  button("next").addEventListener("click", () => show(index + 1));
  button("flip").addEventListener("click", () => flip());

  for (const t of tabs) {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      show(cards().findIndex((c) => c.id === `r-${t.dataset.round}`));
    });
  }

  deck.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reveal]");
    if (btn) sendScreen({ item: btn.dataset.reveal, reveal: btn.getAttribute("aria-pressed") !== "true" });
  });

  // Gestures on the top card: drag sideways and it follows your finger, let go past the threshold and it's thrown
  // (left for the next card, right to bring the last one back); swipe up or down to turn it over; tap to flip.
  let drag = null;
  let quietUntil = 0; // the click that ends a drag or swipe is not a tap
  deck.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".card.is-current");
    if (!card || e.button !== 0 || e.target.closest("a, button, input, select, textarea, label")) return;
    settle();
    drag = { card, x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, mode: null };
  });
  deck.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.mode && Math.hypot(dx, dy) > 8) {
      const face = e.target.closest(".face");
      drag.mode = Math.abs(dx) > Math.abs(dy) ? "throw" : face?.classList.contains("scrolls") ? "scroll" : "turn";
      if (drag.mode === "throw") {
        try {
          drag.card.setPointerCapture(e.pointerId);
        } catch {
          // A pointer the browser no longer tracks; the drag still works while it stays over the deck.
        }
      }
    }
    if (drag.mode === "throw" && !still.matches) {
      drag.card.style.transform = `translate3d(${dx}px, ${dy * 0.12}px, ${Math.min(Math.abs(dx) * 0.15, 40)}px) rotateZ(${dx * 0.035}deg) rotateY(${dx * 0.02}deg)`;
    }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, mode } = drag;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const fast = Math.abs(dx) / Math.max(e.timeStamp - drag.t, 1) > 0.5;
    drag = null;
    if (e.type === "pointercancel") {
      if (mode === "throw") show(index, { from: card.style.transform || null });
      return;
    }
    if (mode) quietUntil = e.timeStamp + 350;
    if (mode === "throw") {
      const from = card.style.transform || null;
      const last = cards().length - 1;
      if ((dx < -80 || (fast && dx < -30)) && index < last) show(index + 1, { from });
      else if ((dx > 80 || (fast && dx > 30)) && index > 0) show(index - 1, { from });
      else show(index, { from });
    } else if (mode === "turn" && Math.abs(dy) > 40) {
      flip("X", dy < 0 ? 1 : -1);
    }
  };
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);

  // A plain tap flips; the click that ends a drag or swipe doesn't.
  deck.addEventListener("click", (e) => {
    const card = e.target.closest(".card.is-current");
    if (!card || e.timeStamp < quietUntil) return;
    if (e.target.closest("a, button, form, input")) return;
    flip();
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      flip("X", e.key === "ArrowUp" ? 1 : -1);
    } else if ((e.key === " " || e.key.toLowerCase() === "f") && !e.target.closest("button, a")) {
      e.preventDefault();
      flip();
    }
  });

  // Swap or Ban in place: post the form, then replace just that card. Ban is permanent, so it asks first.
  deck.addEventListener("submit", async (e) => {
    const form = e.target;
    const id = form.dataset.inline;
    if (!id) return;
    e.preventDefault();
    if (e.submitter?.value === "1" && !confirm("Ban this question? It will never be used again.")) return;
    const card = document.getElementById(id);
    card.classList.add("busy");
    try {
      const res = await fetch(form.action, { method: "POST", body: new FormData(form, e.submitter) });
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      const error = doc.querySelector(".flash");
      if (error) toast(error.textContent);
      const fresh = doc.getElementById(id);
      if (fresh && !error) {
        fresh.classList.add("is-current");
        card.replaceWith(fresh);
        if (!still.matches) fresh.animate({ opacity: [0, 1], transform: ["translate3d(0, 0.5rem, 0)", PLACE.current] }, MOVE);
        markScrolling(fresh);
        sendScreen({ item: id });
      }
    } catch {
      toast("Couldn't reach the server. Check the connection and try again.");
    } finally {
      card.classList.remove("busy");
    }
  });

  setRoles(index);
  show(index);
  addEventListener("resize", () => markScrolling(cards()[index]));
}

function toast(message) {
  const el = Object.assign(document.createElement("p"), { className: "toast", role: "alert", textContent: message });
  document.body.append(el);
  setTimeout(() => el.remove(), 5000);
}

// ── Presenter: show whatever card the host is on. ──

const stage = document.querySelector(".stage");
if (stage) {
  let version = -1;
  const poll = async () => {
    try {
      const res = await fetch(`/games/${stage.dataset.game}/screen?v=${version}`, { cache: "no-store" });
      const next = res.headers.get("X-Screen-Version");
      if (res.status === 200 && next) {
        version = Number(next);
        stage.innerHTML = await res.text();
      }
    } catch {
      // Keep showing the last card through a network blip.
    }
    setTimeout(poll, 700);
  };
  poll();
  // Double-click or press F for full screen on the projector.
  const fullscreen = () => document.fullscreenElement || document.documentElement.requestFullscreen?.();
  stage.addEventListener("dblclick", fullscreen);
  document.addEventListener("keydown", (e) => e.key.toLowerCase() === "f" && fullscreen());
}

// ── Review shortcuts: A approve, R reject, S skip; Cmd/Ctrl+Enter approves from a field. ──

document.addEventListener("keydown", (e) => {
  const form = document.querySelector("form.review");
  if (!form) return;
  const inField = e.target.closest("input, textarea, select");
  let key = e.key.toLowerCase();
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) key = "a";
  else if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
  const btn = form.querySelector(`button[data-key="${key}"]`);
  if (!btn) return;
  e.preventDefault();
  form.requestSubmit(btn);
});
