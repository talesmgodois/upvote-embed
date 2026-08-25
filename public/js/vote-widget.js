(function () {
  const upIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  const downIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';

  /**
   * Builds a vote widget element bound to live upvote/downvote counts.
   * @param {{id:string, upvotes:number, downvotes:number, userVote:1|-1|null}} item
   * @param {(next:{upvotes:number, downvotes:number, userVote:1|-1|null}) => void} [onChange]
   */
  function createVoteWidget(item, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "vote-widget";
    wrap.innerHTML = `
      <button class="vote-btn up" data-dir="up" type="button" aria-label="Upvote">
        ${upIcon}
        <span class="count" data-role="up-count"></span>
      </button>
      <button class="vote-btn down" data-dir="down" type="button" aria-label="Downvote">
        ${downIcon}
        <span class="count" data-role="down-count"></span>
      </button>
    `;

    let state = { ...item };
    let busy = false;

    function render() {
      const upBtn = wrap.querySelector('[data-dir="up"]');
      const downBtn = wrap.querySelector('[data-dir="down"]');
      wrap.querySelector('[data-role="up-count"]').textContent = state.upvotes;
      wrap.querySelector('[data-role="down-count"]').textContent = state.downvotes;
      upBtn.classList.toggle("active", state.userVote === 1);
      downBtn.classList.toggle("active", state.userVote === -1);
    }

    wrap.addEventListener("click", async (e) => {
      const btn = e.target.closest(".vote-btn");
      if (!btn || busy) return;
      busy = true;
      wrap.style.opacity = "0.7";
      try {
        const result = await window.UpvoteAPI.vote(state.id, btn.dataset.dir);
        state = { ...state, ...result };
        render();
        onChange?.(state);
      } catch (err) {
        window.UpvoteToast?.(err.message || "Could not register vote");
      } finally {
        busy = false;
        wrap.style.opacity = "1";
      }
    });

    render();
    return wrap;
  }

  window.UpvoteVoteWidget = { create: createVoteWidget };
})();
